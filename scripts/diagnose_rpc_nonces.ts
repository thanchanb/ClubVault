import { ethers } from "ethers";
import * as dotenv from "dotenv";
import ClubVaultV2ABI from "../frontend/src/contracts/ClubVaultV2ABI.json";

dotenv.config();

async function main() {
  const rpcUrl = "https://testnetrpc.mstblockchain.com";
  const chainId = 91562037;
  const vaultAddress = "0x90e309A5246B37bBC79224A1449D25CC29ef88bE";
  const member2 = "0xF09192ed618C49e9f9A439D97d798F8c600A38a8";

  console.log("=========================================");
  console.log("MST Testnet RPC Nonce Diagnostic");
  console.log("=========================================");
  console.log("RPC URL        :", rpcUrl);
  console.log("Vault Address  :", vaultAddress);
  console.log("Member 2       :", member2);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const net = await provider.getNetwork();
  console.log("Network ChainId:", Number(net.chainId), `(Expected: ${chainId})`);

  // Check contract code
  const code = await provider.getCode(vaultAddress);
  console.log("Code length    :", code.length, "bytes (Hex length)");
  if (code === "0x" || code.length <= 2) {
    console.error("FATAL: No bytecode found at vaultAddress on MST Testnet!");
    process.exit(1);
  }

  // Check ABI contains nonces
  const noncesEntry = ClubVaultV2ABI.find((item: any) => item.name === "nonces");
  console.log("ABI nonces entry:", JSON.stringify(noncesEntry));

  const voteSigEntry = ClubVaultV2ABI.find((item: any) => item.name === "voteProposalBySig");
  console.log("ABI voteProposalBySig:", JSON.stringify(voteSigEntry));

  // Instantiate contract with frontend ABI
  const contract = new ethers.Contract(vaultAddress, ClubVaultV2ABI, provider);

  // Query nonces
  try {
    const nonce = await contract.nonces(member2);
    console.log("✔ contract.nonces(member2) result:", nonce.toString());
  } catch (err: any) {
    console.error("❌ contract.nonces(member2) threw error:", err.message);
  }

  // Query DOMAIN_SEPARATOR
  try {
    const ds = await contract.DOMAIN_SEPARATOR();
    console.log("✔ contract.DOMAIN_SEPARATOR()   :", ds);
  } catch (err: any) {
    console.error("❌ contract.DOMAIN_SEPARATOR() error:", err.message);
  }

  // Query VOTE_TYPEHASH
  try {
    const vth = await contract.VOTE_TYPEHASH();
    console.log("✔ contract.VOTE_TYPEHASH()      :", vth);
  } catch (err: any) {
    console.error("❌ contract.VOTE_TYPEHASH() error:", err.message);
  }
}

main().catch(console.error);
