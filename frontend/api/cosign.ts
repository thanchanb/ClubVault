import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ethers } from "ethers";

const RPC_URL = process.env.MST_TESTNET_RPC_URL || "https://testnetrpc.mstblockchain.com";
const PRIVATE_KEY =
  process.env.PRIVATE_KEY || "0xfcbe55265833744a17fd5bdc3c7da81a74dc12a3c846f99a2031f5e291e5c5c3";

const VAULT_ABI = [
  "function voteProposal(uint256 proposalId, bool approve) external",
  "function getProposal(uint256 proposalId) view returns (tuple(uint256 id, uint8 proposalType, uint8 status, address proposer, address recipient, uint256 amount, string description, uint256 approvalsCount, uint256 rejectionsCount, uint256 createdAt, uint256 executionDeadline, uint256 receiptGracePeriod, uint256 receiptDeadline, bytes32 receiptHash, string receiptDescription, uint256 receiptApprovals, uint256 receiptRejections))",
  "function hasVotedOnProposal(uint256 proposalId, address member) view returns (bool)",
  "function requiredApprovals() view returns (uint256)",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { proposalId, vaultAddress, approve = true } = req.body || {};
    if (!proposalId || !vaultAddress) {
      return res.status(400).json({ error: "Missing proposalId or vaultAddress" });
    }

    const net = ethers.Network.from({ name: "mst-testnet", chainId: 91562037 });
    const provider = new ethers.JsonRpcProvider(RPC_URL, net, { staticNetwork: net });
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const vault = new ethers.Contract(vaultAddress, VAULT_ABI, wallet);

    // Check if already voted
    const alreadyVoted = await vault.hasVotedOnProposal(Number(proposalId), wallet.address);
    if (alreadyVoted) {
      const prop = await vault.getProposal(Number(proposalId));
      return res.status(200).json({
        success: true,
        alreadyVoted: true,
        message: "Member 2 has already voted on this proposal.",
        status: Number(prop.status),
        approvalsCount: Number(prop.approvalsCount),
      });
    }

    // Submit on-chain vote
    const tx = await vault.voteProposal(Number(proposalId), Boolean(approve));
    const receipt = await tx.wait(1);

    const propAfter = await vault.getProposal(Number(proposalId));

    return res.status(200).json({
      success: true,
      txHash: tx.hash,
      status: Number(propAfter.status),
      approvalsCount: Number(propAfter.approvalsCount),
      message: `Vote successfully cast on-chain by Member 2 (${wallet.address})!`,
    });
  } catch (err: any) {
    console.error("Cosign error:", err);
    return res.status(500).json({
      error: err.message || "Failed to execute co-sign vote",
    });
  }
}
