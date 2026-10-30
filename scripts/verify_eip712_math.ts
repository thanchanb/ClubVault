import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const vaultAddress = "0x90e309A5246B37bBC79224A1449D25CC29ef88bE";
  const member2 = "0xF09192ed618C49e9f9A439D97d798F8c600A38a8";
  const chainId = 91562037;
  const proposalId = 1n;
  const approve = true;
  const nonce = 0n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  const vault = await ethers.getContractAt("ClubVaultV2", vaultAddress);

  const domain = {
    name: "ClubVault",
    version: "2",
    chainId: chainId,
    verifyingContract: vaultAddress,
  };

  const types = {
    VoteProposal: [
      { name: "voter", type: "address" },
      { name: "proposalId", type: "uint256" },
      { name: "approve", type: "bool" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const message = {
    voter: member2,
    proposalId: proposalId,
    approve: approve,
    nonce: nonce,
    deadline: deadline,
  };

  const localDigest = ethers.TypedDataEncoder.hash(domain, types, message);
  const contractDigest = await vault.hashVote(
    member2,
    proposalId,
    approve,
    nonce,
    deadline
  );

  console.log("Local EIP-712 Digest   :", localDigest);
  console.log("Contract Computed Hash :", contractDigest);

  if (localDigest === contractDigest) {
    console.log("✔ PERFECT MATCH: Contract hashing and EIP-712 TypedDataEncoder are 100% identical!");
  } else {
    console.error("❌ MISMATCH between local digest and contract digest!");
    process.exit(1);
  }
}

main().catch(console.error);
