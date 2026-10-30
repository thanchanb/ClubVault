// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./ClubVault.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title ClubVaultV2
 * @notice Extends ClubVault with EIP-712 gas-sponsored proposal voting for the MST Blockchain BUILDATHON.
 * @dev Preserves 100% of ClubVault V1 rules, invariants, and direct-voting methods while adding
 * secure cryptographic signature recovery for relayed voting transactions.
 * Avoids Cancun opcode dependencies (such as mcopy) to ensure 100% compatibility with MST Testnet (EVM Paris).
 */
contract ClubVaultV2 is ClubVault {
    using ECDSA for bytes32;

    // EIP-712 Domain TypeHash and Parameters
    bytes32 public constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 public constant NAME_HASH = keccak256(bytes("ClubVault"));
    bytes32 public constant VERSION_HASH = keccak256(bytes("2"));

    // EIP-712 TypeHash for proposal voting
    bytes32 public constant VOTE_TYPEHASH = keccak256(
        "VoteProposal(address voter,uint256 proposalId,bool approve,uint256 nonce,uint256 deadline)"
    );

    // Replay protection: per-member sequential nonces
    mapping(address => uint256) public nonces;

    // Custom Errors
    error DeadlineExceeded(uint256 deadline, uint256 currentTimestamp);
    error InvalidSignature();

    // Event emitted when a vote is relayed
    event VoteRelayed(
        uint256 indexed proposalId,
        address indexed voter,
        address indexed relayer,
        bool approve,
        uint256 nonce
    );

    /**
     * @notice Constructor initializes ClubVault governance.
     */
    constructor(
        string memory _name,
        string memory _description,
        address[] memory _initialMembers,
        uint256 _requiredApprovals
    )
        ClubVault(_name, _description, _initialMembers, _requiredApprovals)
    {}

    /**
     * @notice Computes EIP-712 domain separator dynamically to handle potential chain forks.
     */
    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                NAME_HASH,
                VERSION_HASH,
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Computes EIP-712 digest for a vote struct.
     */
    function hashVote(
        address _voter,
        uint256 _proposalId,
        bool _approve,
        uint256 _nonce,
        uint256 _deadline
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                VOTE_TYPEHASH,
                _voter,
                _proposalId,
                _approve,
                _nonce,
                _deadline
            )
        );
        return keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash)
        );
    }

    /**
     * @notice Cast a member vote on a proposal via an off-chain EIP-712 cryptographic signature.
     * @dev Callable by anyone (the relayer) paying native gas.
     * Reverts if signature is invalid, expired, from a non-member, or has an unexpected nonce.
     * @param _voter The authorized member whose vote is being cast.
     * @param _proposalId Identifier of the proposal to vote on.
     * @param _approve True for approval, false for rejection.
     * @param _deadline Unix timestamp after which the signature expires.
     * @param _signature 65-byte ECDSA signature (r, s, v).
     */
    function voteProposalBySig(
        address _voter,
        uint256 _proposalId,
        bool _approve,
        uint256 _deadline,
        bytes calldata _signature
    ) external {
        if (block.timestamp > _deadline) {
            revert DeadlineExceeded(_deadline, block.timestamp);
        }

        // 1. Recover voter from EIP-712 typed digest
        bytes32 digest = hashVote(
            _voter,
            _proposalId,
            _approve,
            nonces[_voter],
            _deadline
        );
        address recovered = ECDSA.recover(digest, _signature);

        // 2. Strict cryptographic validation: never trust caller-supplied voter address
        if (recovered == address(0) || recovered != _voter) {
            revert InvalidSignature();
        }

        // 3. Strict membership validation
        if (!isMember[_voter]) {
            revert NotMember(_voter);
        }

        // 4. Increment nonce (EVM atomicity will roll this back if _voteProposal reverts)
        nonces[_voter]++;

        // 5. Execute voting logic (enforces proposal status, duplicate votes, quorum)
        _voteProposal(_proposalId, _voter, _approve);

        emit VoteRelayed(_proposalId, _voter, msg.sender, _approve, nonces[_voter] - 1);
    }
}
