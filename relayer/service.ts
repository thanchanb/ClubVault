import { ethers } from "ethers";
import {
  RelayVotePayload,
  RelayVoteResponse,
  RelayerConfig,
  RelayerStatusResponse,
} from "./types";
import ClubVaultV2ABI from "../frontend/src/contracts/ClubVaultV2ABI.json";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class RelayerService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | ethers.Signer;
  private config: RelayerConfig;
  private startTime: number;
  private rateLimits: Map<string, RateLimitRecord> = new Map();

  constructor(
    config: RelayerConfig,
    customSigner?: ethers.Signer,
    customProvider?: ethers.JsonRpcProvider
  ) {
    this.config = config;
    this.startTime = Math.floor(Date.now() / 1000);

    if (customProvider) {
      this.provider = customProvider;
    } else {
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    }

    if (customSigner) {
      this.signer = customSigner;
    } else if (config.relayerPrivateKey) {
      this.signer = new ethers.Wallet(config.relayerPrivateKey, this.provider);
    } else {
      throw new Error(
        "RelayerService initialization error: No relayer private key provided. " +
          "Set RELAYER_PRIVATE_KEY environment variable server-side."
      );
    }
  }

  /**
   * Health and status check for relayer service.
   * NEVER returns private keys or sensitive credentials.
   */
  async getStatus(): Promise<RelayerStatusResponse> {
    const address = await this.signer.getAddress();
    let balanceWei = 0n;
    try {
      balanceWei = await this.provider.getBalance(address);
    } catch {
      // Fallback if balance query encounters transient RPC error
    }

    const uptimeSeconds = Math.floor(Date.now() / 1000) - this.startTime;

    return {
      status: balanceWei > 0n ? "healthy" : "degraded",
      service: "ClubVault-Application-Relayer",
      chainId: this.config.chainId,
      relayerAddress: address,
      relayerBalanceWei: balanceWei.toString(),
      relayerBalanceFormatted: ethers.formatEther(balanceWei),
      supportedVaults: this.config.allowlistedVaults,
      uptimeSeconds,
      rateLimit: {
        maxRequestsPerWindow: this.config.maxRequestsPerWindow || 10,
        windowSeconds: (this.config.rateLimitWindowMs || 60000) / 1000,
      },
    };
  }

  /**
   * Apply in-memory rate limiting per voter or IP identifier.
   */
  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const windowMs = this.config.rateLimitWindowMs || 60000;
    const maxRequests = this.config.maxRequestsPerWindow || 10;

    const record = this.rateLimits.get(key);
    if (!record || now > record.resetAt) {
      this.rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Validate incoming payload format and values strictly before touching the blockchain.
   */
  validatePayload(payload: RelayVotePayload): { valid: boolean; error?: string; code?: string } {
    if (!payload || typeof payload !== "object") {
      return { valid: false, error: "Missing or invalid payload object", code: "INVALID_PAYLOAD" };
    }

    // 1. Chain ID validation
    if (Number(payload.chainId) !== this.config.chainId) {
      return {
        valid: false,
        error: `Invalid chainId: expected ${this.config.chainId}, received ${payload.chainId}`,
        code: "INVALID_CHAIN_ID",
      };
    }

    // 2. Vault address validation and allowlist check
    if (!payload.vaultAddress || !ethers.isAddress(payload.vaultAddress)) {
      return { valid: false, error: "Invalid vault address format", code: "INVALID_VAULT_ADDRESS" };
    }

    const normalizedVault = ethers.getAddress(payload.vaultAddress);
    const allowlisted = this.config.allowlistedVaults.map((v) => ethers.getAddress(v));
    if (!allowlisted.includes(normalizedVault)) {
      return {
        valid: false,
        error: `Vault address ${normalizedVault} is not allowlisted for relayer gas sponsorship`,
        code: "VAULT_NOT_ALLOWLISTED",
      };
    }

    // 3. Voter address validation
    if (!payload.voter || !ethers.isAddress(payload.voter)) {
      return { valid: false, error: "Invalid voter address format", code: "INVALID_VOTER_ADDRESS" };
    }

    if (ethers.getAddress(payload.voter) === ethers.ZeroAddress) {
      return { valid: false, error: "Voter cannot be the zero address", code: "ZERO_ADDRESS" };
    }

    // 4. Proposal ID validation
    const proposalIdNum = Number(payload.proposalId);
    if (isNaN(proposalIdNum) || proposalIdNum < 1 || !Number.isInteger(proposalIdNum)) {
      return { valid: false, error: "Proposal ID must be an integer >= 1", code: "INVALID_PROPOSAL_ID" };
    }

    // 5. Vote choice validation
    if (typeof payload.approve !== "boolean") {
      return { valid: false, error: "Approval choice must be a boolean", code: "INVALID_APPROVE_VALUE" };
    }

    // 6. Deadline validation
    const deadlineNum = Number(payload.deadline);
    const currentUnix = Math.floor(Date.now() / 1000);
    if (isNaN(deadlineNum) || deadlineNum <= currentUnix) {
      return {
        valid: false,
        error: `Signature deadline has already expired (${deadlineNum} <= ${currentUnix})`,
        code: "DEADLINE_EXPIRED",
      };
    }

    // 7. Signature format validation (must be 65-byte hex string)
    if (
      !payload.signature ||
      typeof payload.signature !== "string" ||
      !payload.signature.startsWith("0x") ||
      payload.signature.length !== 132
    ) {
      return {
        valid: false,
        error: "Signature must be a 65-byte hex string (0x followed by 130 hex characters)",
        code: "INVALID_SIGNATURE_FORMAT",
      };
    }

    return { valid: true };
  }

  /**
   * Relay a member vote on-chain with full preflight simulation.
   */
  async relayVote(payload: RelayVotePayload, clientIp?: string): Promise<RelayVoteResponse> {
    // Step 1: Payload validation
    const validation = this.validatePayload(payload);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error!,
        code: validation.code!,
      };
    }

    // Step 2: Rate limit check (by voter address and client IP)
    const rateLimitKey = `${clientIp || "ip"}:${payload.voter.toLowerCase()}`;
    if (!this.checkRateLimit(rateLimitKey)) {
      return {
        success: false,
        error: "Rate limit exceeded. Please wait before submitting another vote request.",
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    const vaultContract = new ethers.Contract(
      payload.vaultAddress,
      ClubVaultV2ABI,
      this.signer
    );

    const proposalIdBigInt = BigInt(payload.proposalId);
    const deadlineBigInt = BigInt(payload.deadline);

    // Step 3: Contract preflight simulation (staticCall)
    try {
      await vaultContract.voteProposalBySig.staticCall(
        payload.voter,
        proposalIdBigInt,
        payload.approve,
        deadlineBigInt,
        payload.signature
      );
    } catch (simError: any) {
      const errorMsg = this.parseContractError(simError);
      return {
        success: false,
        error: `Preflight simulation failed: ${errorMsg.message}`,
        code: errorMsg.code,
        details: errorMsg.details,
      };
    }

    // Step 4: Broadcast transaction on-chain
    try {
      const tx = await vaultContract.voteProposalBySig(
        payload.voter,
        proposalIdBigInt,
        payload.approve,
        deadlineBigInt,
        payload.signature
      );

      return {
        success: true,
        txHash: tx.hash,
        status: "pending",
        message: "Gas-sponsored vote transaction broadcasted successfully to the network.",
      };
    } catch (broadcastError: any) {
      return {
        success: false,
        error: "Failed to broadcast relayed transaction to the network.",
        code: "BROADCAST_FAILED",
        details: broadcastError.message || String(broadcastError),
      };
    }
  }

  /**
   * Parse Solidity custom errors and revert reasons safely.
   */
  private parseContractError(error: any): { message: string; code: string; details?: string } {
    if (!error) {
      return { message: "Unknown contract revert", code: "UNKNOWN_REVERT" };
    }

    // Check ethers custom error properties
    if (error.errorName) {
      switch (error.errorName) {
        case "InvalidSignature":
          return {
            message: "Cryptographic signature is invalid, forged, or signed with an unexpected nonce.",
            code: "INVALID_SIGNATURE",
          };
        case "NotMember":
          return {
            message: "Signer address is not an authorized member of this vault.",
            code: "NOT_MEMBER",
          };
        case "DeadlineExceeded":
          return {
            message: "The signature deadline has expired.",
            code: "DEADLINE_EXCEEDED",
          };
        case "AlreadyVoted":
          return {
            message: "The member has already cast a vote on this proposal.",
            code: "ALREADY_VOTED",
          };
        case "InvalidProposalState":
          return {
            message: "The proposal is not in PENDING state.",
            code: "INVALID_PROPOSAL_STATE",
          };
        case "ProposalNotFound":
          return {
            message: "The specified proposal does not exist.",
            code: "PROPOSAL_NOT_FOUND",
          };
        default:
          return {
            message: `Contract reverted with error: ${error.errorName}`,
            code: error.errorName,
          };
      }
    }

    // Check message string fallback
    const msg = String(error.message || error);
    if (msg.includes("InvalidSignature")) {
      return { message: "Invalid signature or mismatched nonce", code: "INVALID_SIGNATURE" };
    }
    if (msg.includes("NotMember")) {
      return { message: "Signer is not a vault member", code: "NOT_MEMBER" };
    }
    if (msg.includes("AlreadyVoted")) {
      return { message: "Member has already voted", code: "ALREADY_VOTED" };
    }
    if (msg.includes("DeadlineExceeded")) {
      return { message: "Signature deadline exceeded", code: "DEADLINE_EXCEEDED" };
    }

    return {
      message: "Contract execution reverted during preflight simulation.",
      code: "PREFLIGHT_REVERT",
      details: msg.slice(0, 150),
    };
  }
}
