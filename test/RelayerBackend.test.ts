import { expect } from "chai";
import { ethers } from "hardhat";
import http from "http";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ClubVaultV2 } from "../typechain-types";
import { RelayerService } from "../relayer/service";
import { createRelayerServer } from "../relayer/server";
import { RelayVotePayload } from "../relayer/types";

describe("ClubVault Relayer Backend & Security Test Suite", function () {
  let deployer: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let nonMember: SignerWithAddress;
  let relayerSigner: SignerWithAddress;
  let recipient: SignerWithAddress;

  let vaultV2: ClubVaultV2;
  let vaultV2Address: string;
  let chainId: bigint;
  let relayerService: RelayerService;
  let server: http.Server;
  let serverUrl: string;

  const types = {
    VoteProposal: [
      { name: "voter", type: "address" },
      { name: "proposalId", type: "uint256" },
      { name: "approve", type: "bool" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  async function getDomain(contractAddress: string, cid: bigint) {
    return {
      name: "ClubVault",
      version: "2",
      chainId: cid,
      verifyingContract: contractAddress,
    };
  }

  beforeEach(async function () {
    [deployer, member1, member2, nonMember, relayerSigner, recipient] =
      await ethers.getSigners();

    const network = await ethers.provider.getNetwork();
    chainId = network.chainId;

    const VaultFactory = await ethers.getContractFactory("ClubVaultV2");
    vaultV2 = await VaultFactory.deploy(
      "Test Relayer Club",
      "Testing relayer service integration",
      [deployer.address, member1.address, member2.address],
      2n
    );
    await vaultV2.waitForDeployment();
    vaultV2Address = await vaultV2.getAddress();

    // Fund vault
    await deployer.sendTransaction({
      to: vaultV2Address,
      value: ethers.parseEther("5"),
    });

    // Initialize RelayerService with allowlisted vault
    relayerService = new RelayerService(
      {
        rpcUrl: "http://127.0.0.1:8545",
        chainId: Number(chainId),
        allowlistedVaults: [vaultV2Address],
        rateLimitWindowMs: 60000,
        maxRequestsPerWindow: 5,
      },
      relayerSigner,
      ethers.provider as any
    );

    // Create and start server on an ephemeral port
    server = createRelayerServer(relayerService);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        serverUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterEach(async function () {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe("1. Health & Status Security", function () {
    it("should return public status without exposing any private keys", async function () {
      const status = await relayerService.getStatus();

      expect(status.status).to.equal("healthy");
      expect(status.service).to.equal("ClubVault-Application-Relayer");
      expect(status.chainId).to.equal(Number(chainId));
      expect(status.relayerAddress).to.equal(relayerSigner.address);
      expect(status.supportedVaults).to.include(vaultV2Address);
      expect(status).to.not.have.property("privateKey");
      expect(status).to.not.have.property("relayerPrivateKey");
    });

    it("should serve health check over HTTP GET /health", async function () {
      const res = await fetch(`${serverUrl}/health`);
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data.status).to.equal("healthy");
      expect(data.relayerAddress).to.equal(relayerSigner.address);
    });
  });

  describe("2. Payload Format & Allowlist Validation", function () {
    let validPayload: RelayVotePayload;

    beforeEach(function () {
      validPayload = {
        chainId: Number(chainId),
        vaultAddress: vaultV2Address,
        voter: member1.address,
        proposalId: 1,
        approve: true,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        signature: "0x" + "a".repeat(130),
      };
    });

    it("should reject payload with wrong chainId", function () {
      const invalid = { ...validPayload, chainId: 999999 };
      const res = relayerService.validatePayload(invalid);
      expect(res.valid).to.be.false;
      expect(res.code).to.equal("INVALID_CHAIN_ID");
    });

    it("should reject vault not in allowlist", function () {
      const unallowlisted = { ...validPayload, vaultAddress: recipient.address };
      const res = relayerService.validatePayload(unallowlisted);
      expect(res.valid).to.be.false;
      expect(res.code).to.equal("VAULT_NOT_ALLOWLISTED");
    });

    it("should reject invalid voter address format or zero address", function () {
      const invalidAddr = { ...validPayload, voter: "0xinvalid" };
      expect(relayerService.validatePayload(invalidAddr).code).to.equal("INVALID_VOTER_ADDRESS");

      const zeroAddr = { ...validPayload, voter: ethers.ZeroAddress };
      expect(relayerService.validatePayload(zeroAddr).code).to.equal("ZERO_ADDRESS");
    });

    it("should reject invalid proposal IDs", function () {
      expect(relayerService.validatePayload({ ...validPayload, proposalId: 0 }).code).to.equal(
        "INVALID_PROPOSAL_ID"
      );
      expect(relayerService.validatePayload({ ...validPayload, proposalId: -5 }).code).to.equal(
        "INVALID_PROPOSAL_ID"
      );
      expect(relayerService.validatePayload({ ...validPayload, proposalId: 1.5 }).code).to.equal(
        "INVALID_PROPOSAL_ID"
      );
    });

    it("should reject expired deadlines", function () {
      const pastDeadline = Math.floor(Date.now() / 1000) - 100;
      expect(
        relayerService.validatePayload({ ...validPayload, deadline: pastDeadline }).code
      ).to.equal("DEADLINE_EXPIRED");
    });

    it("should reject invalid signature formats", function () {
      expect(
        relayerService.validatePayload({ ...validPayload, signature: "not-hex" }).code
      ).to.equal("INVALID_SIGNATURE_FORMAT");
      expect(
        relayerService.validatePayload({ ...validPayload, signature: "0x1234" }).code
      ).to.equal("INVALID_SIGNATURE_FORMAT");
    });
  });

  describe("3. Rate Limiting Defence", function () {
    it("should enforce maximum requests per window", async function () {
      const payload: RelayVotePayload = {
        chainId: Number(chainId),
        vaultAddress: vaultV2Address,
        voter: member1.address,
        proposalId: 1,
        approve: true,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        signature: "0x" + "b".repeat(130),
      };

      // Configuration allows 5 requests per window
      for (let i = 0; i < 5; i++) {
        const res = await relayerService.relayVote(payload, "192.168.1.1");
        // Preflight will fail with INVALID_SIGNATURE, but rate limiter will count it
        expect((res as any).code).to.not.equal("RATE_LIMIT_EXCEEDED");
      }

      // 6th request must trigger rate limit
      const sixth = await relayerService.relayVote(payload, "192.168.1.1");
      expect(sixth.success).to.be.false;
      expect((sixth as any).code).to.equal("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("4. Preflight Simulation & Broadcast Execution", function () {
    let proposalId: bigint;
    let deadline: bigint;

    beforeEach(async function () {
      // Proposer (deployer) creates proposal 1
      await vaultV2.connect(deployer).createProposal(
        0,
        recipient.address,
        ethers.parseEther("1"),
        "Relayer test item",
        7 * 86400,
        0
      );
      proposalId = 1n;
      const latestBlock = await ethers.provider.getBlock("latest");
      deadline = BigInt(latestBlock!.timestamp + 3600);
    });

    it("should successfully simulate, broadcast, and return real transaction hash for valid vote", async function () {
      const domain = await getDomain(vaultV2Address, chainId);
      const value = {
        voter: member1.address,
        proposalId: proposalId,
        approve: true,
        nonce: 0n,
        deadline: deadline,
      };

      const signature = await member1.signTypedData(domain, types, value);

      const payload: RelayVotePayload = {
        chainId: Number(chainId),
        vaultAddress: vaultV2Address,
        voter: member1.address,
        proposalId: Number(proposalId),
        approve: true,
        deadline: Number(deadline),
        signature: signature,
      };

      const res = await relayerService.relayVote(payload);

      expect(res.success).to.be.true;
      if (res.success) {
        expect(res.txHash).to.match(/^0x[0-9a-fA-F]{64}$/);
        expect(res.status).to.equal("pending");

        // Verify transaction mined on-chain
        const receipt = await ethers.provider.getTransactionReceipt(res.txHash);
        expect(receipt).to.not.be.null;
        expect(await vaultV2.hasVotedOnProposal(proposalId, member1.address)).to.be.true;
      }
    });

    it("should reject non-member vote during preflight simulation", async function () {
      const domain = await getDomain(vaultV2Address, chainId);
      const value = {
        voter: nonMember.address,
        proposalId: proposalId,
        approve: true,
        nonce: 0n,
        deadline: deadline,
      };

      const signature = await nonMember.signTypedData(domain, types, value);

      const payload: RelayVotePayload = {
        chainId: Number(chainId),
        vaultAddress: vaultV2Address,
        voter: nonMember.address,
        proposalId: Number(proposalId),
        approve: true,
        deadline: Number(deadline),
        signature: signature,
      };

      const res = await relayerService.relayVote(payload);
      expect(res.success).to.be.false;
      expect((res as any).code).to.equal("NOT_MEMBER");
    });

    it("should reject forged or mismatched signature during preflight simulation", async function () {
      const domain = await getDomain(vaultV2Address, chainId);
      const value = {
        voter: member1.address,
        proposalId: proposalId,
        approve: true,
        nonce: 0n,
        deadline: deadline,
      };

      // Member 1 signs approval
      const signature = await member1.signTypedData(domain, types, value);

      // Relayer payload falsely claims approve: false
      const tamperedPayload: RelayVotePayload = {
        chainId: Number(chainId),
        vaultAddress: vaultV2Address,
        voter: member1.address,
        proposalId: Number(proposalId),
        approve: false, // Tampered!
        deadline: Number(deadline),
        signature: signature,
      };

      const res = await relayerService.relayVote(tamperedPayload);
      expect(res.success).to.be.false;
      expect((res as any).code).to.equal("INVALID_SIGNATURE");
    });
  });

  describe("5. HTTP Server Request Handling & Protection", function () {
    it("should reject oversized payloads with 413 Payload Too Large", async function () {
      const largeData = "x".repeat(15 * 1024); // 15 KB
      const res = await fetch(`${serverUrl}/api/relay-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: largeData }),
      });

      expect(res.status).to.equal(413);
      const data = await res.json();
      expect(data.code).to.equal("PAYLOAD_TOO_LARGE");
    });

    it("should reject invalid JSON with 400 Bad Request", async function () {
      const res = await fetch(`${serverUrl}/api/relay-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ bad json ...",
      });

      expect(res.status).to.equal(400);
      const data = await res.json();
      expect(data.code).to.equal("INVALID_JSON");
    });
  });
});
