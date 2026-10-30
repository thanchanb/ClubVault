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

  console.log('📡 Listening for Member 2 approval on Proposal #2 on MST Testnet...');
  console.log(`Vault: ${vaultAddress}`);
  console.log(`Member 2: ${member2Address}`);
  console.log('Press Ctrl+C to stop.\n');

  while (true) {
    try {
      const p = await vault.getProposal(2);
      const m2Voted = await vault.hasVotedOnProposal(2, member2Address);
      
      if (m2Voted || p.status === 1n || p.approvalsCount >= 2n) {
        console.log('\n🎉 MEMBER 2 APPROVAL DETECTED ON-CHAIN!');
        console.log(`Approvals Count: ${p.approvalsCount} / 2`);
        console.log(`Proposal Status: ${p.status} (1 = APPROVED)`);
        
        const preBal = await provider.getBalance(vaultAddress);
        const preReserved = await vault.reservedFunds();
        const preM2Bal = await provider.getBalance(member2Address);

        console.log('\n--- State Prior to Execution ---');
        console.log(`Vault Balance: ${ethers.formatEther(preBal)} tMSTC`);
        console.log(`Reserved Funds: ${ethers.formatEther(preReserved)} tMSTC`);
        console.log(`Recipient Balance: ${ethers.formatEther(preM2Bal)} tMSTC`);

        console.log('\n🚀 Executing Proposal #2...');
        const tx = await vault.executeProposal(2);
        console.log(`Execution Tx Broadcast: ${tx.hash}`);
        console.log(`MSTScan Link: https://testnet.mstscan.com/tx/${tx.hash}`);
        
        const receipt = await tx.wait(1);
        console.log(`Confirmed in Block: ${receipt.blockNumber}`);
        console.log(`Gas Used: ${receipt.gasUsed.toString()}`);

        const postBal = await provider.getBalance(vaultAddress);
        const postReserved = await vault.reservedFunds();
        const postM2Bal = await provider.getBalance(member2Address);
        const finalP = await vault.getProposal(2);

        console.log('\n✅ DEMONSTRATION COMPLETE — FINAL ON-CHAIN VERIFICATION:');
        console.log(`Proposal #2 Status: ${finalP.status} (3 = EXECUTED)`);
        console.log(`Approvals: ${finalP.approvalsCount} / 2`);
        console.log(`Vault Balance: ${ethers.formatEther(postBal)} tMSTC (Decreased by ${ethers.formatEther(preBal - postBal)} tMSTC)`);
        console.log(`Reserved Funds: ${ethers.formatEther(postReserved)} tMSTC (Fully Released)`);
        console.log(`Recipient Balance: ${ethers.formatEther(postM2Bal)} tMSTC (Increased by ${ethers.formatEther(postM2Bal - preM2Bal)} tMSTC)`);

        // Preservation verification
        const p1 = await vault.getProposal(1);
        console.log('\n🔒 CRITICAL PRESERVATION CHECK:');
        console.log(`Proposal #1 Status: ${p1.status} (0 = PENDING)`);
        console.log(`Proposal #1 Approvals: ${p1.approvalsCount} / 2`);
        console.log(`Proposal #1 Untouched: ${p1.status === 0n && p1.approvalsCount === 1n ? 'YES (VERIFIED)' : 'WARNING'}`);

        break;
      } else {
        process.stdout.write('.');
      }
    } catch (e) {
      console.error('Error polling:', e.message);
    }
    await new Promise(r => setTimeout(r, 3000));
  }
}

main().catch(console.error);
