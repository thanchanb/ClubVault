import { expect } from "chai";
import { ethers } from "hardhat";
import { ClubVault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ClubVault Unit & Invariant Test Suite", function () {
  let vault: ClubVault;
  let owner: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let member3: SignerWithAddress;
  let nonMember: SignerWithAddress;
  let recipient: SignerWithAddress;
  let membersList: string[];

  const CLUB_NAME = "Robotics & AI Club";
  const CLUB_DESC = "Autonomous Systems & Hardware Treasury";
  const REQUIRED_APPROVALS = 2; // 2 out of 3 members required

  beforeEach(async function () {
    [owner, member1, member2, member3, nonMember, recipient] = await ethers.getSigners();
    membersList = [member1.address, member2.address, member3.address];

    const ClubVaultFactory = await ethers.getContractFactory("ClubVault");
    vault = await ClubVaultFactory.deploy(
      CLUB_NAME,
      CLUB_DESC,
      membersList,
      REQUIRED_APPROVALS
    );
    await vault.waitForDeployment();
  });

  describe("1. Deployment & Bounded Membership Rules", function () {
    it("should initialize with correct metadata and members", async function () {
      expect(await vault.clubName()).to.equal(CLUB_NAME);
      expect(await vault.clubDescription()).to.equal(CLUB_DESC);
      expect(await vault.memberCount()).to.equal(3);
      expect(await vault.requiredApprovals()).to.equal(REQUIRED_APPROVALS);

      expect(await vault.isMember(member1.address)).to.be.true;
      expect(await vault.isMember(member2.address)).to.be.true;
      expect(await vault.isMember(member3.address)).to.be.true;
      expect(await vault.isMember(nonMember.address)).to.be.false;

      const storedMembers = await vault.getMembers();
      expect(storedMembers).to.deep.equal(membersList);
    });

    it("should reject deployment with 0 members", async function () {
      const Factory = await ethers.getContractFactory("ClubVault");
      await expect(
        Factory.deploy(CLUB_NAME, CLUB_DESC, [], 1)
      ).to.be.revertedWithCustomError(vault, "InvalidMemberCount");
    });

    it("should reject deployment exceeding MAX_MEMBERS (50)", async function () {
      const Factory = await ethers.getContractFactory("ClubVault");
      const excessiveMembers: string[] = [];
      for (let i = 0; i < 51; i++) {
        excessiveMembers.push(ethers.Wallet.createRandom().address);
      }
      await expect(
        Factory.deploy(CLUB_NAME, CLUB_DESC, excessiveMembers, 25)
      ).to.be.revertedWithCustomError(vault, "InvalidMemberCount");
    });

    it("should reject deployment with duplicate members", async function () {
      const Factory = await ethers.getContractFactory("ClubVault");
      await expect(
        Factory.deploy(CLUB_NAME, CLUB_DESC, [member1.address, member1.address], 1)
      ).to.be.revertedWithCustomError(vault, "DuplicateMember");
    });

    it("should reject deployment with zero required approvals or quorum > members", async function () {
      const Factory = await ethers.getContractFactory("ClubVault");
      await expect(
        Factory.deploy(CLUB_NAME, CLUB_DESC, [member1.address], 0)
      ).to.be.revertedWithCustomError(vault, "InvalidQuorum");

      await expect(
        Factory.deploy(CLUB_NAME, CLUB_DESC, [member1.address], 2)
      ).to.be.revertedWithCustomError(vault, "InvalidQuorum");
    });
  });

  describe("2. Treasury Deposits & Safe Accounting Invariants", function () {
    it("should accept deposits via deposit() and direct transfers via receive()", async function () {
      const depositAmount1 = ethers.parseEther("5.0");
      const depositAmount2 = ethers.parseEther("3.0");

      await expect(vault.connect(owner).deposit({ value: depositAmount1 }))
        .to.emit(vault, "FundsDeposited")
        .withArgs(owner.address, depositAmount1, depositAmount1);

      await expect(
        owner.sendTransaction({ to: await vault.getAddress(), value: depositAmount2 })
      )
        .to.emit(vault, "FundsDeposited")
        .withArgs(owner.address, depositAmount2, depositAmount1 + depositAmount2);

      expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(
        depositAmount1 + depositAmount2
      );
      expect(await vault.availableFunds()).to.equal(depositAmount1 + depositAmount2);
      expect(await vault.reservedFunds()).to.equal(0);
    });

    it("should reject zero-value deposit", async function () {
      await expect(
        vault.connect(owner).deposit({ value: 0 })
      ).to.be.revertedWithCustomError(vault, "InvalidProposalAmount");
    });
  });

  describe("3. Standard Payment Proposals & Double-Spend Prevention", function () {
    const treasuryFund = ethers.parseEther("10.0");
    const proposalAmount = ethers.parseEther("6.0");

    beforeEach(async function () {
      await vault.connect(owner).deposit({ value: treasuryFund });
    });

    it("should reject proposal creation by non-members", async function () {
      await expect(
        vault
          .connect(nonMember)
          .createProposal(0, recipient.address, proposalAmount, "Hardware kit", 0, 0)
      ).to.be.revertedWithCustomError(vault, "NotMember");
    });

    it("should reject proposal exceeding available funds", async function () {
      const excessiveAmount = ethers.parseEther("11.0");
      await expect(
        vault
          .connect(member1)
          .createProposal(0, recipient.address, excessiveAmount, "Too expensive", 0, 0)
      ).to.be.revertedWithCustomError(vault, "InsufficientAvailableFunds");
    });

    it("should create proposal and auto-cast affirmative vote for proposer", async function () {
      await expect(
        vault
          .connect(member1)
          .createProposal(0, recipient.address, proposalAmount, "Hardware kit", 0, 0)
      )
        .to.emit(vault, "ProposalCreated")
        .withArgs(1, 0, member1.address, recipient.address, proposalAmount, "Hardware kit")
        .and.to.emit(vault, "ProposalVoted")
        .withArgs(1, member1.address, true, 1, 0);

      const prop = await vault.getProposal(1);
      expect(prop.approvalsCount).to.equal(1);
      expect(prop.status).to.equal(0); // PENDING
      expect(await vault.reservedFunds()).to.equal(0);
    });

    it("should transition to APPROVED and lock reservedFunds when quorum reached", async function () {
      await vault
        .connect(member1)
        .createProposal(0, recipient.address, proposalAmount, "Hardware kit", 0, 0);

      // Member 2 casts the 2nd approval (reaching requiredApprovals = 2)
      await expect(vault.connect(member2).voteProposal(1, true))
        .to.emit(vault, "ProposalStatusChanged")
        .withArgs(1, 0, 1); // PENDING (0) -> APPROVED (1)

      const prop = await vault.getProposal(1);
      expect(prop.status).to.equal(1); // APPROVED
      expect(await vault.reservedFunds()).to.equal(proposalAmount);
      expect(await vault.availableFunds()).to.equal(treasuryFund - proposalAmount);

      // Verify that another proposal for remaining funds cannot exceed availableFunds (4.0 ETH)
      await expect(
        vault
          .connect(member2)
          .createProposal(0, recipient.address, ethers.parseEther("5.0"), "Exceeds remaining", 0, 0)
      ).to.be.revertedWithCustomError(vault, "InsufficientAvailableFunds");
    });

    it("should reject double voting by the same member", async function () {
      await vault
        .connect(member1)
        .createProposal(0, recipient.address, proposalAmount, "Hardware kit", 0, 0);

      await expect(
        vault.connect(member1).voteProposal(1, true)
      ).to.be.revertedWithCustomError(vault, "AlreadyVoted");
    });

    it("should transition to REJECTED when rejections make quorum impossible", async function () {
      await vault
        .connect(member1)
        .createProposal(0, recipient.address, proposalAmount, "Hardware kit", 0, 0);

      // Members 2 and 3 both reject
      await vault.connect(member2).voteProposal(1, false);
      await expect(vault.connect(member3).voteProposal(1, false))
        .to.emit(vault, "ProposalStatusChanged")
        .withArgs(1, 0, 2); // PENDING (0) -> REJECTED (2)

      const prop = await vault.getProposal(1);
      expect(prop.status).to.equal(2); // REJECTED
      expect(await vault.reservedFunds()).to.equal(0);
    });

    it("should execute approved proposal, disburse funds, and deduct reservedFunds", async function () {
      await vault
        .connect(member1)
        .createProposal(0, recipient.address, proposalAmount, "Hardware kit", 0, 0);
      await vault.connect(member2).voteProposal(1, true); // APPROVED

      const initialRecipientBal = await ethers.provider.getBalance(recipient.address);

      await expect(vault.executeProposal(1))
        .to.emit(vault, "FundsDisbursed")
        .withArgs(1, recipient.address, proposalAmount, 0)
        .and.to.emit(vault, "ProposalStatusChanged")
        .withArgs(1, 1, 3); // APPROVED (1) -> EXECUTED (3)

      const finalRecipientBal = await ethers.provider.getBalance(recipient.address);
      expect(finalRecipientBal - initialRecipientBal).to.equal(proposalAmount);

      expect(await vault.reservedFunds()).to.equal(0);
      expect(await vault.availableFunds()).to.equal(treasuryFund - proposalAmount);
      expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(
        treasuryFund - proposalAmount
      );
    });

    it("should reject execution of unapproved or already executed proposals", async function () {
      await vault
        .connect(member1)
        .createProposal(0, recipient.address, proposalAmount, "Hardware kit", 0, 0);

      // Attempt execution while PENDING
      await expect(vault.executeProposal(1)).to.be.revertedWithCustomError(
        vault,
        "InvalidProposalState"
      );

      // Approve and execute
      await vault.connect(member2).voteProposal(1, true);
      await vault.executeProposal(1);

      // Attempt double execution
      await expect(vault.executeProposal(1)).to.be.revertedWithCustomError(
        vault,
        "InvalidProposalState"
      );
    });

    it("should reject execution after executionDeadline and allow releasing reservedFunds via markProposalExpired", async function () {
      // Create proposal with a 2-hour execution window
      const twoHours = 2 * 3600;
      await vault
        .connect(member1)
        .createProposal(0, recipient.address, proposalAmount, "Time-limited kit", twoHours, 0);

      // Approve proposal
      await vault.connect(member2).voteProposal(1, true); // APPROVED

      expect(await vault.reservedFunds()).to.equal(proposalAmount);
      expect(await vault.availableFunds()).to.equal(treasuryFund - proposalAmount);

      // Cannot mark expired before deadline
      await expect(vault.markProposalExpired(1)).to.be.revertedWithCustomError(
        vault,
        "ExecutionDeadlineNotExceeded"
      );

      // Fast forward past executionDeadline
      await time.increase(twoHours + 10);

      // Attempting to execute now should revert with ExecutionDeadlineExceeded
      await expect(vault.executeProposal(1)).to.be.revertedWithCustomError(
        vault,
        "ExecutionDeadlineExceeded"
      );

      // Now anyone can call markProposalExpired to unlock the reserved funds
      await expect(vault.markProposalExpired(1))
        .to.emit(vault, "ProposalExpired")
        .withArgs(1, proposalAmount)
        .and.to.emit(vault, "ProposalStatusChanged")
        .withArgs(1, 1, 2); // APPROVED (1) -> REJECTED (2)

      // Verified: reserved funds released back to availableFunds!
      expect(await vault.reservedFunds()).to.equal(0);
      expect(await vault.availableFunds()).to.equal(treasuryFund);
    });

    it("should allow deferred pending proposal to be approved once funds are deposited via approvePendingProposal", async function () {
      // Treasury has 10 ETH.
      // Member 1 creates Proposal 1 for 7 ETH
      await vault
        .connect(member1)
        .createProposal(0, recipient.address, ethers.parseEther("7.0"), "Project Alpha", 0, 0);
      // Member 1 creates Proposal 2 for 5 ETH (7 + 5 = 12 ETH > 10 ETH)
      await vault
        .connect(member1)
        .createProposal(0, recipient.address, ethers.parseEther("5.0"), "Project Beta", 0, 0);

      // Approve Proposal 1 -> Locks 7 ETH (available = 3 ETH)
      await vault.connect(member2).voteProposal(1, true);
      expect(await vault.reservedFunds()).to.equal(ethers.parseEther("7.0"));
      expect(await vault.availableFunds()).to.equal(ethers.parseEther("3.0"));

      // Member 2 votes on Proposal 2 -> approvalsCount reaches 2, but available funds (3 ETH) < 5 ETH
      // So Proposal 2 remains PENDING to preserve solvency!
      await vault.connect(member2).voteProposal(2, true);
      const prop2 = await vault.getProposal(2);
      expect(prop2.status).to.equal(0); // PENDING
      expect(prop2.approvalsCount).to.equal(2);
      expect(await vault.reservedFunds()).to.equal(ethers.parseEther("7.0")); // still 7 ETH

      // Attempting to approve while still underfunded fails
      await expect(vault.approvePendingProposal(2)).to.be.revertedWithCustomError(
        vault,
        "InsufficientAvailableFunds"
      );

      // Now new deposit arrives (5 ETH)
      await vault.connect(owner).deposit({ value: ethers.parseEther("5.0") });
      expect(await vault.availableFunds()).to.equal(ethers.parseEther("8.0"));

      // Now approvePendingProposal succeeds!
      await expect(vault.approvePendingProposal(2))
        .to.emit(vault, "ProposalStatusChanged")
        .withArgs(2, 0, 1); // PENDING -> APPROVED

      const prop2Approved = await vault.getProposal(2);
      expect(prop2Approved.status).to.equal(1); // APPROVED
      expect(await vault.reservedFunds()).to.equal(ethers.parseEther("12.0"));
      expect(await vault.availableFunds()).to.equal(ethers.parseEther("3.0"));
    });
  });

  describe("4. Advance-Payment & Receipt-Confirmation Subsystem", function () {
    const treasuryFund = ethers.parseEther("10.0");
    const advanceAmount = ethers.parseEther("3.0");
    const GRACE_PERIOD = 3 * 24 * 3600; // 3 days

    beforeEach(async function () {
      await vault.connect(owner).deposit({ value: treasuryFund });
    });

    it("should enforce grace period bounds (1 hour to 90 days)", async function () {
      // Too short (< 1 hour)
      await expect(
        vault
          .connect(member1)
          .createProposal(1, recipient.address, advanceAmount, "Drone Parts", 0, 1800)
      ).to.be.revertedWithCustomError(vault, "InvalidGracePeriod");

      // Too long (> 90 days)
      await expect(
        vault
          .connect(member1)
          .createProposal(1, recipient.address, advanceAmount, "Drone Parts", 0, 91 * 24 * 3600)
      ).to.be.revertedWithCustomError(vault, "InvalidGracePeriod");
    });

    it("should disburse advance payment and transition to ADVANCE_DISBURSED", async function () {
      await vault
        .connect(member1)
        .createProposal(1, recipient.address, advanceAmount, "Drone Parts", 0, GRACE_PERIOD);
      await vault.connect(member2).voteProposal(1, true); // APPROVED

      const initialRecipientBal = await ethers.provider.getBalance(recipient.address);

      await expect(vault.executeProposal(1))
        .to.emit(vault, "FundsDisbursed")
        .withArgs(1, recipient.address, advanceAmount, 1)
        .and.to.emit(vault, "ProposalStatusChanged")
        .withArgs(1, 1, 4); // APPROVED (1) -> ADVANCE_DISBURSED (4)

      const finalRecipientBal = await ethers.provider.getBalance(recipient.address);
      expect(finalRecipientBal - initialRecipientBal).to.equal(advanceAmount);

      expect(await vault.totalUnconfirmedAdvances()).to.equal(advanceAmount);
      expect(await vault.recipientActiveAdvances(recipient.address)).to.equal(advanceAmount);

      const prop = await vault.getProposal(1);
      expect(prop.status).to.equal(4); // ADVANCE_DISBURSED
      expect(prop.receiptDeadline).to.be.gt(prop.createdAt);
    });

    it("should permit receipt submission before deadline and transition to RECEIPT_PENDING_CONFIRMATION", async function () {
      await vault
        .connect(member1)
        .createProposal(1, recipient.address, advanceAmount, "Drone Parts", 0, GRACE_PERIOD);
      await vault.connect(member2).voteProposal(1, true);
      await vault.executeProposal(1);

      const receiptCID = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
      const receiptMemo = "Purchased 4x brushless motors from HobbyKing";

      // Non-recipient and non-proposer cannot submit receipt
      await expect(
        vault.connect(member3).submitReceipt(1, receiptCID, receiptMemo)
      ).to.be.revertedWithCustomError(vault, "NotMember");

      // Recipient submits receipt
      await expect(
        vault.connect(recipient).submitReceipt(1, receiptCID, receiptMemo)
      )
        .to.emit(vault, "ReceiptSubmitted")
        .withArgs(1, recipient.address, receiptCID, receiptMemo, (await vault.getProposal(1)).receiptDeadline)
        .and.to.emit(vault, "ProposalStatusChanged")
        .withArgs(1, 4, 5); // ADVANCE_DISBURSED (4) -> RECEIPT_PENDING_CONFIRMATION (5)

      const prop = await vault.getProposal(1);
      expect(prop.status).to.equal(5);
      expect(prop.receiptHash).to.equal(receiptCID);
    });

    it("should reject empty receipt hash", async function () {
      await vault
        .connect(member1)
        .createProposal(1, recipient.address, advanceAmount, "Drone Parts", 0, GRACE_PERIOD);
      await vault.connect(member2).voteProposal(1, true);
      await vault.executeProposal(1);

      await expect(
        vault.connect(recipient).submitReceipt(1, "", "Missing receipt document")
      ).to.be.revertedWithCustomError(vault, "InvalidReceiptHash");
    });

    it("should reject double voting on receipts", async function () {
      await vault
        .connect(member1)
        .createProposal(1, recipient.address, advanceAmount, "Drone Parts", 0, GRACE_PERIOD);
      await vault.connect(member2).voteProposal(1, true);
      await vault.executeProposal(1);

      await vault
        .connect(recipient)
        .submitReceipt(1, "ipfs://receipt123", "Valid store invoice");

      await vault.connect(member1).voteOnReceipt(1, true, "Verified");
      await expect(
        vault.connect(member1).voteOnReceipt(1, true, "Voting again")
      ).to.be.revertedWithCustomError(vault, "AlreadyVoted");
    });

    it("should settle advance when members confirm receipt by quorum", async function () {
      await vault
        .connect(member1)
        .createProposal(1, recipient.address, advanceAmount, "Drone Parts", 0, GRACE_PERIOD);
      await vault.connect(member2).voteProposal(1, true);
      await vault.executeProposal(1);

      await vault
        .connect(recipient)
        .submitReceipt(1, "ipfs://receipt123", "Valid store invoice");

      // Member 1 votes to confirm
      await vault.connect(member1).voteOnReceipt(1, true, "Verified with vendor invoice");

      // Member 2 votes to confirm -> reaches requiredApprovals = 2
      await expect(
        vault.connect(member2).voteOnReceipt(1, true, "Looks authentic")
      )
        .to.emit(vault, "ReceiptConfirmed")
        .withArgs(1, recipient.address, advanceAmount)
        .and.to.emit(vault, "ProposalStatusChanged")
        .withArgs(1, 5, 6); // RECEIPT_PENDING_CONFIRMATION (5) -> RECEIPT_CONFIRMED (6)

      expect(await vault.totalUnconfirmedAdvances()).to.equal(0);
      expect(await vault.recipientActiveAdvances(recipient.address)).to.equal(0);
      expect(await vault.isAdvanceBlocked(recipient.address)).to.be.false;
    });

    it("should dispute receipt and block recipient if members vote to reject", async function () {
      await vault
        .connect(member1)
        .createProposal(1, recipient.address, advanceAmount, "Drone Parts", 0, GRACE_PERIOD);
      await vault.connect(member2).voteProposal(1, true);
      await vault.executeProposal(1);

      await vault
        .connect(recipient)
        .submitReceipt(1, "ipfs://fake-receipt", "Suspicious generic receipt");

      // Members 1 and 2 vote to reject receipt
      await vault.connect(member1).voteOnReceipt(1, false, "Invoice number does not exist");
      await expect(
        vault.connect(member2).voteOnReceipt(1, false, "Price mismatch and blurred date")
      )
        .to.emit(vault, "ReceiptDisputed")
        .withArgs(1, recipient.address, "Price mismatch and blurred date")
        .and.to.emit(vault, "RecipientBlockStatusUpdated")
        .withArgs(recipient.address, true)
        .and.to.emit(vault, "ProposalStatusChanged")
        .withArgs(1, 5, 7); // RECEIPT_PENDING_CONFIRMATION (5) -> RECEIPT_DISPUTED (7)

      expect(await vault.isAdvanceBlocked(recipient.address)).to.be.true;

      // Recipient is blocked from requesting further advances
      await expect(
        vault
          .connect(member1)
          .createProposal(1, recipient.address, ethers.parseEther("1.0"), "Another advance", 0, GRACE_PERIOD)
      ).to.be.revertedWithCustomError(vault, "RecipientIsBlocked");
    });

    it("should handle receipt timeout and transition to RECEIPT_DEFAULTED", async function () {
      await vault
        .connect(member1)
        .createProposal(1, recipient.address, advanceAmount, "Drone Parts", 0, GRACE_PERIOD);
      await vault.connect(member2).voteProposal(1, true);
      await vault.executeProposal(1);

      // Cannot mark defaulted before deadline
      await expect(
        vault.markReceiptDefaulted(1)
      ).to.be.revertedWithCustomError(vault, "ReceiptDeadlineNotExceeded");

      // Advance time beyond receiptDeadline
      await time.increase(GRACE_PERIOD + 10);

      // Now anyone can trigger default
      await expect(vault.markReceiptDefaulted(1))
        .to.emit(vault, "ReceiptDefaulted")
        .and.to.emit(vault, "RecipientBlockStatusUpdated")
        .withArgs(recipient.address, true)
        .and.to.emit(vault, "ProposalStatusChanged")
        .withArgs(1, 4, 8); // ADVANCE_DISBURSED (4) -> RECEIPT_DEFAULTED (8)

      expect(await vault.isAdvanceBlocked(recipient.address)).to.be.true;
    });

    it("should allow recipient to repay advance funds and clear blocked status", async function () {
      await vault
        .connect(member1)
        .createProposal(1, recipient.address, advanceAmount, "Drone Parts", 0, GRACE_PERIOD);
      await vault.connect(member2).voteProposal(1, true);
      await vault.executeProposal(1);

      // Default the advance
      await time.increase(GRACE_PERIOD + 10);
      await vault.markReceiptDefaulted(1);
      expect(await vault.isAdvanceBlocked(recipient.address)).to.be.true;

      // Repay partial amount rejected
      await expect(
        vault.connect(recipient).repayAdvance(1, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWithCustomError(vault, "RepaymentAmountMismatch");

      // Full repayment restores balance and unblocks recipient
      await expect(
        vault.connect(recipient).repayAdvance(1, { value: advanceAmount })
      )
        .to.emit(vault, "AdvanceRepaid")
        .withArgs(1, recipient.address, advanceAmount)
        .and.to.emit(vault, "RecipientBlockStatusUpdated")
        .withArgs(recipient.address, false)
        .and.to.emit(vault, "ProposalStatusChanged")
        .withArgs(1, 8, 9); // RECEIPT_DEFAULTED (8) -> RECEIPT_REPAID (9)

      expect(await vault.isAdvanceBlocked(recipient.address)).to.be.false;
      expect(await vault.totalUnconfirmedAdvances()).to.equal(0);
      expect(await vault.availableFunds()).to.equal(treasuryFund);
    });
  });

  describe("5. Reentrancy & Unauthorized Withdrawal Invariant Checks", function () {
    const treasuryFund = ethers.parseEther("10.0");
    const proposalAmount = ethers.parseEther("2.0");

    beforeEach(async function () {
      await vault.connect(owner).deposit({ value: treasuryFund });
    });

    it("should prevent unauthorized direct withdrawals", async function () {
      // Non-member trying to call executeProposal with invalid ID
      await expect(
        vault.connect(nonMember).executeProposal(999)
      ).to.be.revertedWithCustomError(vault, "ProposalNotFound");

      // Treasury balance remains strictly intact
      expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(treasuryFund);
      expect(await vault.availableFunds()).to.equal(treasuryFund);
    });

    it("should defeat reentrancy attack attempts during proposal execution", async function () {
      const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrant");
      const attacker = await MaliciousFactory.deploy(await vault.getAddress());
      await attacker.waitForDeployment();
      const attackerAddress = await attacker.getAddress();

      // Propose disbursement to attacker contract
      await vault
        .connect(member1)
        .createProposal(0, attackerAddress, proposalAmount, "Hardware Grant", 0, 0);
      await vault.connect(member2).voteProposal(1, true); // APPROVED

      // Attacker sets target proposal ID to try re-entering executeProposal(1) upon receipt
      await attacker.setTargetProposal(1);

      // Execute proposal: attacker's receive() attempts to re-enter executeProposal(1)
      // OpenZeppelin ReentrancyGuard or the updated state (status EXECUTED) prevents reentrancy
      // The transaction will fail if the fallback reverts or succeeds safely
      // In either case, the attacker cannot drain extra funds!
      try {
        await vault.executeProposal(1);
      } catch (err) {
        // Reentrancy revert caught
      }

      // Verify attacker received at most proposalAmount, never more
      const attackerBalance = await ethers.provider.getBalance(attackerAddress);
      expect(attackerBalance).to.be.lte(proposalAmount);

      // Vault balance invariant is strictly preserved
      const remainingVaultBalance = await ethers.provider.getBalance(await vault.getAddress());
      expect(remainingVaultBalance).to.be.gte(treasuryFund - proposalAmount);
    });
  });
});
