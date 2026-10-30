import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const vaultAddress = "0x90e309A5246B37bBC79224A1449D25CC29ef88bE";
  const member2 = "0xF09192ed618C49e9f9A439D97d798F8c600A38a8";
  const deployer = "0x06e08cf0aed1663834E267E90333164a0276bbbD";
  const provider = ethers.provider;

  const vault = await ethers.getContractAt("ClubVaultV2", vaultAddress);

  console.log("==================================================");
  console.log("MST Testnet 2-of-2 Vault State Verification");
  console.log("==================================================");
  console.log("Vault Address        :", vaultAddress);
  console.log("Voter (Member 2)     :", member2);

  const nonce = await vault.nonces(member2);
  const proposal = await vault.getProposal(1);
  const member2Bal = await provider.getBalance(member2);
  const relayerBal = await provider.getBalance(deployer);
  const statusLabels = ["PENDING", "APPROVED", "REJECTED", "EXECUTED"];

  console.log(`\nProposal #1:`);
  console.log(` - ID               : ${proposal.id}`);
  console.log(` - Status           : ${statusLabels[Number(proposal.status)]} (Code: ${proposal.status})`);
  console.log(` - Approvals Count  : ${proposal.approvalsCount} / 2`);
  console.log(` - Rejections Count : ${proposal.rejectionsCount}`);
  console.log(`\nMember 2 Nonce      : ${nonce.toString()}`);
  console.log(`Member 2 Balance    : ${ethers.formatEther(member2Bal)} tMSTC`);
  console.log(`Relayer Balance     : ${ethers.formatEther(relayerBal)} tMSTC`);

  // Check VoteRelayed events on vault
  const filter = vault.filters.VoteRelayed();
  const events = await vault.queryFilter(filter, 6683321);
  console.log(`\nVoteRelayed Events Count: ${events.length}`);
  for (const ev of events) {
    console.log(` - Tx Hash: ${ev.transactionHash}`);
    console.log(` - Block  : ${ev.blockNumber}`);
    const parsed = vault.interface.parseLog(ev);
    if (parsed) {
      console.log(` - Args   : Proposal ${parsed.args[0]}, Voter ${parsed.args[1]}, Relayer ${parsed.args[2]}, Approved: ${parsed.args[3]}, Nonce: ${parsed.args[4]}`);
    }
  }
}

main().catch(console.error);
