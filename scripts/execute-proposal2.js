require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.MST_TESTNET_RPC_URL || 'https://testnetrpc.mstblockchain.com');
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const vaultAddress = '0x90e309A5246B37bBC79224A1449D25CC29ef88bE';
  const member2Address = '0xF09192ed618C49e9f9A439D97d798F8c600A38a8';
  
  const artifact = JSON.parse(fs.readFileSync('artifacts/contracts/ClubVaultV2.sol/ClubVaultV2.json'));
  const vault = new ethers.Contract(vaultAddress, artifact.abi, signer);

  console.log('--- Checking Proposal #2 On-Chain ---');
  const p = await vault.getProposal(2);
  console.log('Status:', p.status, '(0=PENDING, 1=APPROVED, 2=REJECTED, 3=EXECUTED)');
  console.log('Approvals:', p.approvalsCount.toString());
  console.log('Amount:', ethers.formatEther(p.amount), 'tMSTC');

  if (p.status !== 1n) {
    console.log('Proposal #2 is not yet in APPROVED status. Waiting for Member 2 approval.');
    return;
  }

  const preBal = await provider.getBalance(vaultAddress);
  const preReserved = await vault.reservedFunds();
  const preM2Bal = await provider.getBalance(member2Address);

  console.log('\n--- State Before Execution ---');
  console.log('Vault Balance:', ethers.formatEther(preBal), 'tMSTC');
  console.log('Reserved Funds:', ethers.formatEther(preReserved), 'tMSTC');
  console.log('Recipient (Member 2) Balance:', ethers.formatEther(preM2Bal), 'tMSTC');

  console.log('\n--- Executing Proposal #2 On-Chain ---');
  const tx = await vault.executeProposal(2);
  console.log('Execution Tx Sent:', tx.hash);
  console.log('Waiting for confirmation...');
  const receipt = await tx.wait(1);
  console.log('Confirmed in block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());

  const postBal = await provider.getBalance(vaultAddress);
  const postReserved = await vault.reservedFunds();
  const postM2Bal = await provider.getBalance(member2Address);
  const postP = await vault.getProposal(2);

  console.log('\n--- State After Execution ---');
  console.log('Proposal #2 Final Status:', postP.status, '(3 = EXECUTED)');
  console.log('Vault Balance:', ethers.formatEther(postBal), 'tMSTC (Decreased by', ethers.formatEther(preBal - postBal), 'tMSTC)');
  console.log('Reserved Funds:', ethers.formatEther(postReserved), 'tMSTC');
  console.log('Recipient (Member 2) Balance:', ethers.formatEther(postM2Bal), 'tMSTC (Increased by', ethers.formatEther(postM2Bal - preM2Bal), 'tMSTC)');

  // Verify Proposal #1 remains untouched
  const p1 = await vault.getProposal(1);
  console.log('\n--- Preserved Proposal #1 Verification ---');
  console.log('Proposal #1 Status:', p1.status, '(0 = PENDING)');
  console.log('Proposal #1 Approvals:', p1.approvalsCount.toString(), '/ 2');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
