// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ClubVault
 * @notice Multi-member decentralized treasury and expense management vault for clubs, DAOs, and student teams.
 *
 * @dev ARCHITECTURAL NOTE & HONEST LIMITATION (Priority 4):
 * On-chain receipt confirmation is a SUBJECTIVE MEMBER GOVERNANCE DECISION (social consensus),
 * NOT cryptographic proof that an off-chain purchase or physical commerce actually occurred.
 * The contract records metadata hashes (e.g. IPFS CIDs of merchant receipts), enforces voting quorums,
 * verifies timeout windows, and updates internal treasury accounting. It cannot cryptographically
 * verify real-world off-chain commercial settlement.
 *
 * SAFETY INVARIANTS (Priority 5):
 * 1. Vault Solvency Invariant: address(this).balance >= reservedFunds at all times.
 * 2. Available Funds Invariant: availableFunds() == address(this).balance - reservedFunds.
 * 3. Bounded Membership: memberCount <= MAX_MEMBERS (hard-capped at 50 to prevent gas DoS).
 * 4. Double-Spend Prevention: Proposal amounts are deducted from availableFunds and locked in
 *    reservedFunds upon approval. Funds can only be disbursed through approved proposals.
 */
contract ClubVault is ReentrancyGuard {
    // --- Constants ---
    uint256 public constant MAX_MEMBERS = 50;
    uint256 public constant MIN_MEMBERS = 1;
    uint256 public constant MIN_GRACE_PERIOD = 1 hours;
    uint256 public constant MAX_GRACE_PERIOD = 90 days;

    // --- Enums ---
    enum ProposalType {
        STANDARD_PAYMENT, // Direct payment upon approval
        ADVANCE_PAYMENT    // Advance payment requiring post-disbursement receipt confirmation
    }

    enum ProposalStatus {
        PENDING,                     // Created, voting underway
        APPROVED,                    // Quorum approved, locked in reservedFunds
        REJECTED,                    // Rejected by voting members
        EXECUTED,                    // Standard payment disbursed
        ADVANCE_DISBURSED,           // Advance paid out, awaiting receipt submission
        RECEIPT_PENDING_CONFIRMATION,// Receipt hash submitted, members voting on confirmation
        RECEIPT_CONFIRMED,           // Members confirmed receipt validity
        RECEIPT_DISPUTED,            // Members rejected receipt; recipient flagged
        RECEIPT_DEFAULTED,           // Deadline expired without valid receipt; recipient flagged
        RECEIPT_REPAID               // Advance funds refunded by recipient
    }

    // --- Structs ---
    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        ProposalStatus status;
        address proposer;
        address payable recipient;
        uint256 amount;
        string description;
        uint256 approvalsCount;
        uint256 rejectionsCount;
        uint256 createdAt;
        uint256 executionDeadline;   // Deadline to execute approved proposal
        uint256 receiptGracePeriod;  // Duration allowed for receipt confirmation after advance disbursement
        uint256 receiptDeadline;     // Concrete block timestamp when receipt window expires
        string receiptHash;          // IPFS CID or SHA-256 hash of expense receipt
        string receiptDescription;   // Context/memo for submitted receipt
        uint256 receiptApprovals;    // Member confirmations for receipt
        uint256 receiptRejections;   // Member rejections for receipt
    }

    // --- State Variables ---
    string public clubName;
    string public clubDescription;

    address[] public members;
    mapping(address => bool) public isMember;
    uint256 public memberCount;

    // Quorum: required positive votes to approve proposals and confirm receipts
    uint256 public requiredApprovals;

    // Accounting variables
    uint256 public totalDeposits;
    uint256 public reservedFunds;             // Funds locked for approved proposals awaiting execution
    uint256 public totalUnconfirmedAdvances;  // Cumulative advance funds disbursed awaiting receipt settlement

    // Recipient accountability tracking
    mapping(address => bool) public isAdvanceBlocked; // Blocked if recipient defaulted or disputed
    mapping(address => uint256) public recipientActiveAdvances;

    // Proposals
    uint256 public proposalCount;
    mapping(uint256 => Proposal) private _proposals;

    // Voting tracking: proposalId => memberAddress => voted
    mapping(uint256 => mapping(address => bool)) public hasVotedOnProposal;
    mapping(uint256 => mapping(address => bool)) public proposalVoteChoice; // true = approve, false = reject

    // Receipt voting tracking: proposalId => memberAddress => voted
    mapping(uint256 => mapping(address => bool)) public hasVotedOnReceipt;
    mapping(uint256 => mapping(address => bool)) public receiptVoteChoice; // true = confirm, false = reject

    // --- Events ---
    event ClubInitialized(string name, string description, uint256 memberCount, uint256 requiredApprovals);
    event FundsDeposited(address indexed sender, uint256 amount, uint256 newBalance);
    event ProposalCreated(
        uint256 indexed proposalId,
        ProposalType indexed proposalType,
        address indexed proposer,
        address recipient,
        uint256 amount,
        string description
    );
    event ProposalVoted(uint256 indexed proposalId, address indexed voter, bool approve, uint256 approvals, uint256 rejections);
    event ProposalStatusChanged(uint256 indexed proposalId, ProposalStatus indexed oldStatus, ProposalStatus indexed newStatus);
    event FundsDisbursed(uint256 indexed proposalId, address indexed recipient, uint256 amount, ProposalType proposalType);
    event ReceiptSubmitted(uint256 indexed proposalId, address indexed submitter, string receiptHash, string receiptDescription, uint256 receiptDeadline);
    event ReceiptVoted(uint256 indexed proposalId, address indexed voter, bool approve, uint256 approvals, uint256 rejections);
    event ReceiptConfirmed(uint256 indexed proposalId, address indexed recipient, uint256 amount);
    event ReceiptDisputed(uint256 indexed proposalId, address indexed recipient, string reason);
    event ReceiptDefaulted(uint256 indexed proposalId, address indexed recipient, uint256 timestamp);
    event AdvanceRepaid(uint256 indexed proposalId, address indexed payer, uint256 amount);
    event RecipientBlockStatusUpdated(address indexed recipient, bool isBlocked);

    // --- Errors ---
    error NotMember(address caller);
    error InvalidMemberCount(uint256 count);
    error DuplicateMember(address member);
    error InvalidAddress();
    error InvalidQuorum(uint256 required, uint256 totalMembers);
    error InsufficientAvailableFunds(uint256 requested, uint256 available);
    error RecipientIsBlocked(address recipient);
    error InvalidProposalAmount();
    error ProposalNotFound(uint256 proposalId);
    error InvalidProposalState(ProposalStatus current, ProposalStatus expected);
    error AlreadyVoted(uint256 proposalId, address voter);
    error ExecutionDeadlineExceeded(uint256 deadline, uint256 currentTimestamp);
    error ReceiptDeadlineExceeded(uint256 deadline, uint256 currentTimestamp);
    error ReceiptDeadlineNotExceeded(uint256 deadline, uint256 currentTimestamp);
    error InvalidReceiptHash();
    error TransferFailed(address recipient, uint256 amount);
    error RepaymentAmountMismatch(uint256 provided, uint256 expected);
    error InvalidGracePeriod(uint256 period);

    // --- Modifiers ---
    modifier onlyMember() {
        if (!isMember[msg.sender]) revert NotMember(msg.sender);
        _;
    }

    /**
     * @notice Construct a new ClubVault instance with bounded membership and strict governance threshold.
     * @param _name Name of the club or team.
     * @param _description Purpose and manifesto of the vault.
     * @param _initialMembers Array of unique member addresses (1 <= count <= 50).
     * @param _requiredApprovals Number of affirmative votes required to pass proposals and confirm receipts.
     */
    constructor(
        string memory _name,
        string memory _description,
        address[] memory _initialMembers,
        uint256 _requiredApprovals
    ) {
        if (_initialMembers.length < MIN_MEMBERS || _initialMembers.length > MAX_MEMBERS) {
            revert InvalidMemberCount(_initialMembers.length);
        }
        if (_requiredApprovals == 0 || _requiredApprovals > _initialMembers.length) {
            revert InvalidQuorum(_requiredApprovals, _initialMembers.length);
        }

        clubName = _name;
        clubDescription = _description;
        memberCount = _initialMembers.length;
        requiredApprovals = _requiredApprovals;

        for (uint256 i = 0; i < _initialMembers.length; i++) {
            address m = _initialMembers[i];
            if (m == address(0)) revert InvalidAddress();
            if (isMember[m]) revert DuplicateMember(m);

            isMember[m] = true;
            members.push(m);
        }

        emit ClubInitialized(_name, _description, memberCount, requiredApprovals);
    }

    // --- Deposit & Treasury Views ---

    /**
     * @notice Deposit native tokens (tMSTC / ETH) into the vault treasury.
     */
    receive() external payable {
        _deposit();
    }

    /**
     * @notice Explicit deposit function with event emission.
     */
    function deposit() external payable {
        _deposit();
    }

    function _deposit() internal {
        if (msg.value == 0) revert InvalidProposalAmount();
        totalDeposits += msg.value;
        emit FundsDeposited(msg.sender, msg.value, address(this).balance);
    }

    /**
     * @notice Returns unallocated treasury funds that are safe to propose or reserve.
     * @dev Core safe accounting invariant: address(this).balance >= reservedFunds.
     */
    function availableFunds() public view returns (uint256) {
        uint256 balance = address(this).balance;
        if (balance <= reservedFunds) {
            return 0;
        }
        return balance - reservedFunds;
    }

    /**
     * @notice Get list of all member addresses.
     */
    function getMembers() external view returns (address[] memory) {
        return members;
    }

    /**
     * @notice Retrieve full proposal details.
     */
    function getProposal(uint256 _proposalId) external view returns (Proposal memory) {
        if (_proposalId == 0 || _proposalId > proposalCount) revert ProposalNotFound(_proposalId);
        return _proposals[_proposalId];
    }

    // --- Proposal Creation & Voting ---

    /**
     * @notice Propose a standard payment or an advance payment.
     * @param _proposalType Type: STANDARD_PAYMENT or ADVANCE_PAYMENT.
     * @param _recipient Address of vendor or club member receiving funds.
     * @param _amount Amount in native currency (wei).
     * @param _description Reason and budget item context.
     * @param _executionWindow Seconds from approval during which proposal must be executed.
     * @param _receiptGracePeriod Seconds from disbursement allowed to submit and confirm receipt (for advances).
     */
    function createProposal(
        ProposalType _proposalType,
        address payable _recipient,
        uint256 _amount,
        string calldata _description,
        uint256 _executionWindow,
        uint256 _receiptGracePeriod
    ) external onlyMember returns (uint256) {
        if (_recipient == address(0)) revert InvalidAddress();
        if (_amount == 0) revert InvalidProposalAmount();
        if (_amount > availableFunds()) revert InsufficientAvailableFunds(_amount, availableFunds());
        if (isAdvanceBlocked[_recipient] && _proposalType == ProposalType.ADVANCE_PAYMENT) {
            revert RecipientIsBlocked(_recipient);
        }

        if (_proposalType == ProposalType.ADVANCE_PAYMENT) {
            if (_receiptGracePeriod < MIN_GRACE_PERIOD || _receiptGracePeriod > MAX_GRACE_PERIOD) {
                revert InvalidGracePeriod(_receiptGracePeriod);
            }
        } else {
            _receiptGracePeriod = 0;
        }

        if (_executionWindow < 1 hours) {
            _executionWindow = 7 days; // Default 7 day execution window
        }

        proposalCount++;
        uint256 newId = proposalCount;

        Proposal storage p = _proposals[newId];
        p.id = newId;
        p.proposalType = _proposalType;
        p.status = ProposalStatus.PENDING;
        p.proposer = msg.sender;
        p.recipient = _recipient;
        p.amount = _amount;
        p.description = _description;
        p.createdAt = block.timestamp;
        p.executionDeadline = block.timestamp + _executionWindow;
        p.receiptGracePeriod = _receiptGracePeriod;

        emit ProposalCreated(newId, _proposalType, msg.sender, _recipient, _amount, _description);

        // Auto-cast affirmative vote by proposer
        _voteProposal(newId, msg.sender, true);

        return newId;
    }

    /**
     * @notice Vote to approve or reject a pending proposal.
     * @param _proposalId Proposal identifier.
     * @param _approve True for approval, false for rejection.
     */
    function voteProposal(uint256 _proposalId, bool _approve) external onlyMember {
        _voteProposal(_proposalId, msg.sender, _approve);
    }

    function _voteProposal(uint256 _proposalId, address _voter, bool _approve) internal {
        if (_proposalId == 0 || _proposalId > proposalCount) revert ProposalNotFound(_proposalId);
        Proposal storage p = _proposals[_proposalId];

        if (p.status != ProposalStatus.PENDING) {
            revert InvalidProposalState(p.status, ProposalStatus.PENDING);
        }
        if (hasVotedOnProposal[_proposalId][_voter]) {
            revert AlreadyVoted(_proposalId, _voter);
        }

        hasVotedOnProposal[_proposalId][_voter] = true;
        proposalVoteChoice[_proposalId][_voter] = _approve;

        if (_approve) {
            p.approvalsCount++;
        } else {
            p.rejectionsCount++;
        }

        emit ProposalVoted(_proposalId, _voter, _approve, p.approvalsCount, p.rejectionsCount);

        // Check if approval quorum reached
        if (p.approvalsCount >= requiredApprovals) {
            // Verify solvency before transitioning to APPROVED
            if (p.amount > availableFunds()) {
                // If funds became unavailable due to prior approvals, remain PENDING until funded
                return;
            }

            p.status = ProposalStatus.APPROVED;
            reservedFunds += p.amount; // Reserve funds immediately to prevent double spending
            emit ProposalStatusChanged(_proposalId, ProposalStatus.PENDING, ProposalStatus.APPROVED);
        }
        // Check if rejection threshold reached (impossible to reach requiredApprovals)
        else if (p.rejectionsCount > memberCount - requiredApprovals) {
            p.status = ProposalStatus.REJECTED;
            emit ProposalStatusChanged(_proposalId, ProposalStatus.PENDING, ProposalStatus.REJECTED);
        }
    }

    // --- Execution & Disbursement ---

    /**
     * @notice Execute an approved proposal, transferring funds to the recipient.
     * @param _proposalId Proposal identifier.
     */
    function executeProposal(uint256 _proposalId) external nonReentrant {
        if (_proposalId == 0 || _proposalId > proposalCount) revert ProposalNotFound(_proposalId);
        Proposal storage p = _proposals[_proposalId];

        if (p.status != ProposalStatus.APPROVED) {
            revert InvalidProposalState(p.status, ProposalStatus.APPROVED);
        }
        if (block.timestamp > p.executionDeadline) {
            // Execution window expired, release reserved funds back to treasury
            reservedFunds -= p.amount;
            p.status = ProposalStatus.REJECTED;
            emit ProposalStatusChanged(_proposalId, ProposalStatus.APPROVED, ProposalStatus.REJECTED);
            revert ExecutionDeadlineExceeded(p.executionDeadline, block.timestamp);
        }

        // State changes (Checks-Effects-Interactions)
        reservedFunds -= p.amount;

        if (p.proposalType == ProposalType.STANDARD_PAYMENT) {
            p.status = ProposalStatus.EXECUTED;
            emit ProposalStatusChanged(_proposalId, ProposalStatus.APPROVED, ProposalStatus.EXECUTED);
        } else {
            // Advance payment
            p.status = ProposalStatus.ADVANCE_DISBURSED;
            p.receiptDeadline = block.timestamp + p.receiptGracePeriod;
            totalUnconfirmedAdvances += p.amount;
            recipientActiveAdvances[p.recipient] += p.amount;
            emit ProposalStatusChanged(_proposalId, ProposalStatus.APPROVED, ProposalStatus.ADVANCE_DISBURSED);
        }

        emit FundsDisbursed(_proposalId, p.recipient, p.amount, p.proposalType);

        // Interaction
        (bool success, ) = p.recipient.call{value: p.amount}("");
        if (!success) {
            revert TransferFailed(p.recipient, p.amount);
        }
    }

    // --- Advance Payment & Receipt Confirmation Subsystem ---

    /**
     * @notice Submit receipt evidence (IPFS hash / doc digest) for an advance payment.
     * @param _proposalId Identifier of the advance proposal.
     * @param _receiptHash IPFS CID or cryptographic hash of the receipt/invoice document.
     * @param _receiptDescription Memo detailing items purchased and actual expense.
     */
    function submitReceipt(
        uint256 _proposalId,
        string calldata _receiptHash,
        string calldata _receiptDescription
    ) external {
        if (_proposalId == 0 || _proposalId > proposalCount) revert ProposalNotFound(_proposalId);
        Proposal storage p = _proposals[_proposalId];

        if (p.status != ProposalStatus.ADVANCE_DISBURSED) {
            revert InvalidProposalState(p.status, ProposalStatus.ADVANCE_DISBURSED);
        }
        if (msg.sender != p.recipient && msg.sender != p.proposer) {
            revert NotMember(msg.sender);
        }
        if (block.timestamp > p.receiptDeadline) {
            revert ReceiptDeadlineExceeded(p.receiptDeadline, block.timestamp);
        }
        if (bytes(_receiptHash).length == 0) {
            revert InvalidReceiptHash();
        }

        p.receiptHash = _receiptHash;
        p.receiptDescription = _receiptDescription;
        p.status = ProposalStatus.RECEIPT_PENDING_CONFIRMATION;

        emit ReceiptSubmitted(_proposalId, msg.sender, _receiptHash, _receiptDescription, p.receiptDeadline);
        emit ProposalStatusChanged(_proposalId, ProposalStatus.ADVANCE_DISBURSED, ProposalStatus.RECEIPT_PENDING_CONFIRMATION);
    }

    /**
     * @notice Vote to confirm or reject a submitted expense receipt.
     * @param _proposalId Proposal identifier.
     * @param _confirm True if member approves receipt as legitimate, false if rejected.
     * @param _reason Optional explanation for vote (especially rejections).
     */
    function voteOnReceipt(uint256 _proposalId, bool _confirm, string calldata _reason) external onlyMember {
        if (_proposalId == 0 || _proposalId > proposalCount) revert ProposalNotFound(_proposalId);
        Proposal storage p = _proposals[_proposalId];

        if (p.status != ProposalStatus.RECEIPT_PENDING_CONFIRMATION) {
            revert InvalidProposalState(p.status, ProposalStatus.RECEIPT_PENDING_CONFIRMATION);
        }
        if (hasVotedOnReceipt[_proposalId][msg.sender]) {
            revert AlreadyVoted(_proposalId, msg.sender);
        }

        hasVotedOnReceipt[_proposalId][msg.sender] = true;
        receiptVoteChoice[_proposalId][msg.sender] = _confirm;

        if (_confirm) {
            p.receiptApprovals++;
        } else {
            p.receiptRejections++;
        }

        emit ReceiptVoted(_proposalId, msg.sender, _confirm, p.receiptApprovals, p.receiptRejections);

        // Check if receipt confirmed by quorum
        if (p.receiptApprovals >= requiredApprovals) {
            p.status = ProposalStatus.RECEIPT_CONFIRMED;
            totalUnconfirmedAdvances -= p.amount;
            if (recipientActiveAdvances[p.recipient] >= p.amount) {
                recipientActiveAdvances[p.recipient] -= p.amount;
            } else {
                recipientActiveAdvances[p.recipient] = 0;
            }

            emit ReceiptConfirmed(_proposalId, p.recipient, p.amount);
            emit ProposalStatusChanged(_proposalId, ProposalStatus.RECEIPT_PENDING_CONFIRMATION, ProposalStatus.RECEIPT_CONFIRMED);
        }
        // Check if receipt rejected by members (conflicting/fraudulent claim)
        else if (p.receiptRejections > memberCount - requiredApprovals) {
            p.status = ProposalStatus.RECEIPT_DISPUTED;
            isAdvanceBlocked[p.recipient] = true;

            emit ReceiptDisputed(_proposalId, p.recipient, _reason);
            emit RecipientBlockStatusUpdated(p.recipient, true);
            emit ProposalStatusChanged(_proposalId, ProposalStatus.RECEIPT_PENDING_CONFIRMATION, ProposalStatus.RECEIPT_DISPUTED);
        }
    }

    /**
     * @notice Mark an advance as defaulted if the receipt deadline has elapsed without valid receipt confirmation.
     * @param _proposalId Proposal identifier.
     */
    function markReceiptDefaulted(uint256 _proposalId) external {
        if (_proposalId == 0 || _proposalId > proposalCount) revert ProposalNotFound(_proposalId);
        Proposal storage p = _proposals[_proposalId];

        if (p.status != ProposalStatus.ADVANCE_DISBURSED && p.status != ProposalStatus.RECEIPT_PENDING_CONFIRMATION) {
            revert InvalidProposalState(p.status, ProposalStatus.ADVANCE_DISBURSED);
        }
        if (block.timestamp <= p.receiptDeadline) {
            revert ReceiptDeadlineNotExceeded(p.receiptDeadline, block.timestamp);
        }

        ProposalStatus oldStatus = p.status;
        p.status = ProposalStatus.RECEIPT_DEFAULTED;
        isAdvanceBlocked[p.recipient] = true;

        emit ReceiptDefaulted(_proposalId, p.recipient, block.timestamp);
        emit RecipientBlockStatusUpdated(p.recipient, true);
        emit ProposalStatusChanged(_proposalId, oldStatus, ProposalStatus.RECEIPT_DEFAULTED);
    }

    /**
     * @notice Recipient or sponsor refunds advance funds back to the treasury to clear a disputed/defaulted/unused advance.
     * @param _proposalId Proposal identifier.
     */
    function repayAdvance(uint256 _proposalId) external payable nonReentrant {
        if (_proposalId == 0 || _proposalId > proposalCount) revert ProposalNotFound(_proposalId);
        Proposal storage p = _proposals[_proposalId];

        if (
            p.status != ProposalStatus.ADVANCE_DISBURSED &&
            p.status != ProposalStatus.RECEIPT_PENDING_CONFIRMATION &&
            p.status != ProposalStatus.RECEIPT_DISPUTED &&
            p.status != ProposalStatus.RECEIPT_DEFAULTED
        ) {
            revert InvalidProposalState(p.status, ProposalStatus.RECEIPT_DISPUTED);
        }
        if (msg.value != p.amount) {
            revert RepaymentAmountMismatch(msg.value, p.amount);
        }

        totalDeposits += msg.value;
        totalUnconfirmedAdvances -= p.amount;
        if (recipientActiveAdvances[p.recipient] >= p.amount) {
            recipientActiveAdvances[p.recipient] -= p.amount;
        } else {
            recipientActiveAdvances[p.recipient] = 0;
        }

        // If recipient has no remaining active disputes/defaults, unblock
        if (recipientActiveAdvances[p.recipient] == 0) {
            isAdvanceBlocked[p.recipient] = false;
            emit RecipientBlockStatusUpdated(p.recipient, false);
        }

        ProposalStatus oldStatus = p.status;
        p.status = ProposalStatus.RECEIPT_REPAID;

        emit AdvanceRepaid(_proposalId, msg.sender, msg.value);
        emit ProposalStatusChanged(_proposalId, oldStatus, ProposalStatus.RECEIPT_REPAID);
    }
}
