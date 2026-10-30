import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ClubVaultV2, VaultFactoryV2 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ClubVaultV2 & EIP-712 Relayer Test Suite", function () {
  let deployer: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let member3: SignerWithAddress;
  let nonMember: SignerWithAddress;
  let relayer: SignerWithAddress;
  let recipient: SignerWithAddress;

  let vaultV2: ClubVaultV2;
  let vaultV2Address: string;
  let factoryV2: VaultFactoryV2;
  let chainId: bigint;

  const CLUB_NAME = "Robotics Club V2";
  const CLUB_DESC = "Robotics and AI student group treasury with EIP-712 support";
  const REQUIRED_APPROVALS = 2n;

  // EIP-712 Types definition matching the smart contract
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
    [deployer, member1, member2, member3, nonMember, relayer, recipient] =
      await ethers.getSigners();

    const network = await ethers.provider.getNetwork();
    chainId = network.chainId;

    // Deploy VaultFactoryV2
    const FactoryFactory = await ethers.getContractFactory("VaultFactoryV2");
    factoryV2 = await FactoryFactory.deploy();
    await factoryV2.waitForDeployment();

    // Deploy ClubVaultV2 directly
    const VaultFactory = await ethers.getContractFactory("ClubVaultV2");
    vaultV2 = await VaultFactory.deploy(
      CLUB_NAME,
      CLUB_DESC,
      [deployer.address, member1.address, member2.address, member3.address],
      REQUIRED_APPROVALS
    );
    await vaultV2.waitForDeployment();
    vaultV2Address = await vaultV2.getAddress();

    // Fund the vault with 10 ETH
    await deployer.sendTransaction({
      to: vaultV2Address,
      value: ethers.parseEther("10"),
    });
  });

  describe("1. V2 Initialization & Factory Registration", function () {
    it("should initialize ClubVaultV2 with correct metadata and members", async function () {
      expect(await vaultV2.clubName()).to.equal(CLUB_NAME);
      expect(await vaultV2.clubDescription()).to.equal(CLUB_DESC);
      expect(await vaultV2.memberCount()).to.equal(4n);
      expect(await vaultV2.requiredApprovals()).to.equal(REQUIRED_APPROVALS);
      expect(await vaultV2.isMember(member1.address)).to.be.true;
      expect(await vaultV2.isMember(nonMember.address)).to.be.false;
      expect(await vaultV2.availableFunds()).to.equal(ethers.parseEther("10"));
    });

    it("should deploy ClubVaultV2 through VaultFactoryV2 and register correctly", async function () {
      const tx = await factoryV2.createVault(
        "AI Society",
        "AI student treasury",
        [member1.address, member2.address],
        2n
      );
      await tx.wait();

      expect(await factoryV2.totalVaults()).to.equal(1n);
      const allVaults = await factoryV2.getAllVaults();
      expect(allVaults.length).to.equal(1);
      expect(await factoryV2.isRegisteredVault(allVaults[0])).to.be.true;

      const member1Vaults = await factoryV2.getVaultsForMember(member1.address);
      expect(member1Vaults).to.include(allVaults[0]);
    });
  });

  describe("2. Valid Gas-Sponsored EIP-712 Proposal Voting", function () {
    let proposalId: bigint;
    let deadline: bigint;

    beforeEach(async function () {
      // Proposer (deployer) creates proposal (auto-casts 1 approval)
      const tx = await vaultV2.connect(deployer).createProposal(
        0, // STANDARD_PAYMENT
        recipient.address,
        ethers.parseEther("2"),
        "Buy 3D printer filament",
        7 * 86400,
        0
      );
      await tx.wait();
      proposalId = 1n;

      const latestBlock = await ethers.provider.getBlock("latest");
      deadline = BigInt(latestBlock!.timestamp + 3600); // 1 hour validity
    });

    it("should allow a member to sign off-chain and a relayer to submit on-chain, paying the gas", async function () {
      const initialNonce = await vaultV2.nonces(member1.address);
      expect(initialNonce).to.equal(0n);

      const domain = await getDomain(vaultV2Address, chainId);
      const value = {
        voter: member1.address,
        proposalId: proposalId,
        approve: true,
        nonce: initialNonce,
        deadline: deadline,
      };

      // Member 1 signs off-chain (no gas spent by member1)
      const signature = await member1.signTypedData(domain, types, value);

      const relayerBalanceBefore = await ethers.provider.getBalance(relayer.address);
      const member1BalanceBefore = await ethers.provider.getBalance(member1.address);

      // Relayer submits the transaction on-chain
      const tx = await vaultV2
        .connect(relayer)
        .voteProposalBySig(member1.address, proposalId, true, deadline, signature);
      const receipt = await tx.wait();

      const relayerBalanceAfter = await ethers.provider.getBalance(relayer.address);
      const member1BalanceAfter = await ethers.provider.getBalance(member1.address);

      // Verify gas accounting: relayer paid, member1 paid nothing
      expect(member1BalanceAfter).to.equal(member1BalanceBefore);
      expect(relayerBalanceAfter).to.be.lessThan(relayerBalanceBefore);

      // Verify on-chain state updates
      expect(await vaultV2.hasVotedOnProposal(proposalId, member1.address)).to.be.true;
      expect(await vaultV2.proposalVoteChoice(proposalId, member1.address)).to.be.true;
      expect(await vaultV2.nonces(member1.address)).to.equal(1n);

      // Since required approvals is 2 and deployer + member1 approved, proposal is APPROVED
      const prop = await vaultV2.getProposal(proposalId);
      expect(prop.status).to.equal(1n); // APPROVED
      expect(prop.approvalsCount).to.equal(2n);

      // Verify VoteRelayed event was emitted
      await expect(tx)
        .to.emit(vaultV2, "VoteRelayed")
        .withArgs(proposalId, member1.address, relayer.address, true, 0n);
    });

    it("should record a gas-sponsored rejection vote correctly", async function () {
      const domain = await getDomain(vaultV2Address, chainId);
      const value = {
        voter: member1.address,
        proposalId: proposalId,
        approve: false, // REJECT
        nonce: 0n,
        deadline: deadline,
      };

      const signature = await member1.signTypedData(domain, types, value);

      await vaultV2
        .connect(relayer)
        .voteProposalBySig(member1.address, proposalId, false, deadline, signature);

      const prop = await vaultV2.getProposal(proposalId);
      expect(prop.rejectionsCount).to.equal(1n);
      expect(await vaultV2.hasVotedOnProposal(proposalId, member1.address)).to.be.true;
      expect(await vaultV2.proposalVoteChoice(proposalId, member1.address)).to.be.false;
    });
  });

  describe("3. Security & Cryptographic Attack Defence", function () {
    let proposalId: bigint;
    let deadline: bigint;

    beforeEach(async function () {
      await vaultV2.connect(deployer).createProposal(
        0,
        recipient.address,
        ethers.parseEther("1"),
        "Test proposal",
        7 * 86400,
        0
      );
      proposalId = 1n;
      const latestBlock = await ethers.provider.getBlock("latest");
      deadline = BigInt(latestBlock!.timestamp + 3600);
    });

    it("should revert if signature is expired (DeadlineExceeded)", async function () {
      const pastDeadline = BigInt((await ethers.provider.getBlock("latest"))!.timestamp - 10);
      const domain = await getDomain(vaultV2Address, chainId);
      const value = {
        voter: member1.address,
        proposalId: proposalId,
        approve: true,
        nonce: 0n,
        deadline: pastDeadline,
      };

      const signature = await member1.signTypedData(domain, types, value);

      await expect(
        vaultV2
          .connect(relayer)
          .voteProposalBySig(member1.address, proposalId, true, pastDeadline, signature)
      ).to.be.revertedWithCustomError(vaultV2, "DeadlineExceeded");
    });

    it("should revert if signer is a non-member", async function () {
      const domain = await getDomain(vaultV2Address, chainId);
      const value = {
        voter: nonMember.address,
        proposalId: proposalId,
        approve: true,
        nonce: 0n,
        deadline: deadline,
      };

      const signature = await nonMember.signTypedData(domain, types, value);

      await expect(
        vaultV2
          .connect(relayer)
          .voteProposalBySig(nonMember.address, proposalId, true, deadline, signature)
      )
        .to.be.revertedWithCustomError(vaultV2, "NotMember")
        .withArgs(nonMember.address);
    });

    it("should revert if signature was tampered or malformed (InvalidSignature)", async function () {
      const domain = await getDomain(vaultV2Address, chainId);
      const value = {
        voter: member1.address,
        proposalId: proposalId,
        approve: true,
        nonce: 0n,
        deadline: deadline,
      };

      const signature = await member1.signTypedData(domain, types, value);

      // Attempt to tamper: relayer flips vote choice to false (reject) while keeping signature
      await expect(
        vaultV2
          .connect(relayer)
          .voteProposalBySig(member1.address, proposalId, false, deadline, signature)
      ).to.be.revertedWithCustomError(vaultV2, "InvalidSignature");

      // Attempt to tamper: alter proposal ID
      await expect(
        vaultV2
          .connect(relayer)
          .voteProposalBySig(member1.address, 999n, true, deadline, signature)
      ).to.be.revertedWithCustomError(vaultV2, "InvalidSignature");

      // Attempt to tamper: claim another voter address
      await expect(
        vaultV2
          .connect(relayer)
          .voteProposalBySig(member2.address, proposalId, true, deadline, signature)
      ).to.be.revertedWithCustomError(vaultV2, "InvalidSignature");
    });

    it("should prevent signature replay attacks by consuming the nonce", async function () {
      const domain = await getDomain(vaultV2Address, chainId);
      const value = {
        voter: member1.address,
        proposalId: proposalId,
        approve: true,
        nonce: 0n,
        deadline: deadline,
      };

      const signature = await member1.signTypedData(domain, types, value);

      // First broadcast succeeds
      await vaultV2
        .connect(relayer)
        .voteProposalBySig(member1.address, proposalId, true, deadline, signature);

      // Replay attack with same signature: nonce is now 1, so hashVote uses nonce 1, signature recovers different address
      await expect(
        vaultV2
          .connect(relayer)
          .voteProposalBySig(member1.address, proposalId, true, deadline, signature)
      ).to.be.revertedWithCustomError(vaultV2, "InvalidSignature");
    });

    it("should reject signatures intended for another chain (Cross-Chain Replay Defence)", async function () {
      const fakeChainId = 999999n;
      const domain = await getDomain(vaultV2Address, fakeChainId);
      const value = {
        voter: member1.address,
        proposalId: proposalId,
        approve: true,
        nonce: 0n,
        deadline: deadline,
      };

      const signature = await member1.signTypedData(domain, types, value);

      await expect(
        vaultV2
          .connect(relayer)
          .voteProposalBySig(member1.address, proposalId, true, deadline, signature)
      ).to.be.revertedWithCustomError(vaultV2, "InvalidSignature");
    });

    it("should reject signatures intended for another vault (Cross-Vault Replay Defence)", async function () {
      // Deploy a separate second vault
      const VaultFactory = await ethers.getContractFactory("ClubVaultV2");
      const vaultV2B = await VaultFactory.deploy(
        "Another Club",
        "Desc",
        [member1.address, member2.address],
        2n
      );
      await vaultV2B.waitForDeployment();
      const vaultV2BAddress = await vaultV2B.getAddress();

      // Sign message for vault B
      const domainB = await getDomain(vaultV2BAddress, chainId);
      const value = {
        voter: member1.address,
        proposalId: proposalId,
        approve: true,
        nonce: 0n,
        deadline: deadline,
      };
      const signatureB = await member1.signTypedData(domainB, types, value);

      // Attempt to replay signatureB on vault A
      await expect(
        vaultV2
          .connect(relayer)
          .voteProposalBySig(member1.address, proposalId, true, deadline, signatureB)
      ).to.be.revertedWithCustomError(vaultV2, "InvalidSignature");
    });
  });

  describe("4. Interaction Between Direct Voting and Relayed Voting", function () {
    let proposalId: bigint;
    let deadline: bigint;

    beforeEach(async function () {
      await vaultV2.connect(deployer).createProposal(
        0,
        recipient.address,
        ethers.parseEther("1"),
        "Testing interaction",
        7 * 86400,
        0
      );
      proposalId = 1n;
      const latestBlock = await ethers.provider.getBlock("latest");
      deadline = BigInt(latestBlock!.timestamp + 3600);
    });

    it("should reject relayed vote if member already voted directly", async function () {
      // Member 1 votes false directly on-chain (proposal remains PENDING)
      await vaultV2.connect(member1).voteProposal(proposalId, false);

      // Now member 1 signs an EIP-712 vote
      const domain = await getDomain(vaultV2Address, chainId);
      const value = {
        voter: member1.address,
        proposalId: proposalId,
        approve: false,
        nonce: 0n,
        deadline: deadline,
      };
      const signature = await member1.signTypedData(domain, types, value);

      // Relayer submits it -> reverts with AlreadyVoted and rolls back nonce increment
      await expect(
        vaultV2
          .connect(relayer)
          .voteProposalBySig(member1.address, proposalId, false, deadline, signature)
      )
        .to.be.revertedWithCustomError(vaultV2, "AlreadyVoted")
        .withArgs(proposalId, member1.address);

      // Nonce must not have incremented due to EVM rollback
      expect(await vaultV2.nonces(member1.address)).to.equal(0n);
    });

    it("should reject direct vote if member already voted via relay", async function () {
      const domain = await getDomain(vaultV2Address, chainId);
      const value = {
        voter: member1.address,
        proposalId: proposalId,
        approve: false, // Vote false so proposal stays PENDING
        nonce: 0n,
        deadline: deadline,
      };
      const signature = await member1.signTypedData(domain, types, value);

      // Relayed vote first
      await vaultV2
        .connect(relayer)
        .voteProposalBySig(member1.address, proposalId, false, deadline, signature);

      // Member 1 attempts to vote again directly
      await expect(
        vaultV2.connect(member1).voteProposal(proposalId, false)
      )
        .to.be.revertedWithCustomError(vaultV2, "AlreadyVoted")
        .withArgs(proposalId, member1.address);
    });

    it("should complete full workflow: creation -> relayed vote -> quorum -> direct execution & payout", async function () {
      const domain = await getDomain(vaultV2Address, chainId);
      const value = {
        voter: member1.address,
        proposalId: proposalId,
        approve: true,
        nonce: 0n,
        deadline: deadline,
      };
      const signature = await member1.signTypedData(domain, types, value);

      // Relayed vote achieves quorum (2 of 4)
      await vaultV2
        .connect(relayer)
        .voteProposalBySig(member1.address, proposalId, true, deadline, signature);

      const prop = await vaultV2.getProposal(proposalId);
      expect(prop.status).to.equal(1n); // APPROVED

      // Any member executes the proposal
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
      await vaultV2.connect(member2).executeProposal(proposalId);
      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);

      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(ethers.parseEther("1"));
      const executedProp = await vaultV2.getProposal(proposalId);
      expect(executedProp.status).to.equal(3n); // EXECUTED
    });
  });
});
