// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./ClubVault.sol";

/**
 * @title VaultFactory
 * @notice Factory registry for deploying and indexing isolated ClubVault instances on MST Blockchain.
 */
contract VaultFactory {
    // Array of all deployed vaults
    address[] public allVaults;

    // Index of vaults per member
    mapping(address => address[]) private _memberVaults;

    // Fast existence check
    mapping(address => bool) public isRegisteredVault;

    // Events
    event VaultCreated(
        address indexed vaultAddress,
        string name,
        string description,
        address indexed creator,
        uint256 memberCount,
        uint256 requiredApprovals,
        uint256 timestamp
    );

    /**
     * @notice Deploy a new ClubVault instance and register it in the global registry.
     * @param _name Name of the club or organization.
     * @param _description Purpose and context of the vault.
     * @param _initialMembers List of initial club members (1 to 50 members).
     * @param _requiredApprovals Quorum threshold for proposal approval and receipt confirmation.
     * @return vaultAddress The address of the newly deployed ClubVault contract.
     */
    function createVault(
        string calldata _name,
        string calldata _description,
        address[] calldata _initialMembers,
        uint256 _requiredApprovals
    ) external returns (address vaultAddress) {
        ClubVault newVault = new ClubVault(
            _name,
            _description,
            _initialMembers,
            _requiredApprovals
        );

        vaultAddress = address(newVault);
        allVaults.push(vaultAddress);
        isRegisteredVault[vaultAddress] = true;

        for (uint256 i = 0; i < _initialMembers.length; i++) {
            _memberVaults[_initialMembers[i]].push(vaultAddress);
        }

        emit VaultCreated(
            vaultAddress,
            _name,
            _description,
            msg.sender,
            _initialMembers.length,
            _requiredApprovals,
            block.timestamp
        );
    }

    /**
     * @notice Get total number of vaults deployed via this factory.
     */
    function totalVaults() external view returns (uint256) {
        return allVaults.length;
    }

    /**
     * @notice Get list of all deployed vault addresses.
     */
    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }

    /**
     * @notice Get all vaults where the specified address is a member.
     * @param _member Address of the member to query.
     */
    function getVaultsForMember(address _member) external view returns (address[] memory) {
        return _memberVaults[_member];
    }
}
