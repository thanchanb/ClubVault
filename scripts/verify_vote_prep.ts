import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const vaultAddress = "0x90e309A5246B37bBC79224A1449D25CC29ef88bE";
  const member2 = "0xF09192ed618C49e9f9A439D97d798F8c600A38a8";
  const provider = ethers.provider;
  const network = await provider.getNetwork();

  const vault = await ethers.getContractAt("ClubVaultV2", vaultAddress);

  const isMember = await vault.isMember(member2);
  const nonce = await vault.nonces(member2);
  const hasVoted = await vault.hasVotedOnProposal(1, member2);
  const domainSeparator = await vault.DOMAIN_SEPARATOR();
  const typeHash = await vault.VOTE_TYPEHASH();
  const proposal = await vault.getProposal(1);
  const member2Balance = await provider.getBalance(member2);
  const relayerBalance = await provider.getBalance(await (await ethers.getSigners())[0].getAddress());

  console.log("=========================================");
  console.log("EIP-712 Gasless Vote Preparation (Test Vault)");
  console.log("=========================================");
  console.log(`Chain ID            : ${network.chainId.toString()}`);
  console.log(`Test Vault Address  : ${vaultAddress}`);
  console.log(`Voter Address       : ${member2}`);
  console.log(`Is Member?          : ${isMember}`);
  console.log(`Voter Nonce         : ${nonce.toString()}`);
  console.log(`Already Voted?      : ${hasVoted}`);
  console.log(`Proposal #1 Status  : ${proposal.status.toString()} (Approvals: ${proposal.approvalsCount.toString()}/2)`);
  console.log(`Member 2 Balance    : ${ethers.formatEther(member2Balance)} tMSTC`);
  console.log(`Relayer Sponsoring  : ${ethers.formatEther(relayerBalance)} tMSTC`);
  console.log(`DOMAIN_SEPARATOR    : ${domainSeparator}`);
  console.log(`VOTE_TYPEHASH       : ${typeHash}`);
}

main().catch(console.error);
