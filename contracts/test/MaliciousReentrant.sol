// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IClubVault {
    function executeProposal(uint256 proposalId) external;
    function deposit() external payable;
}

contract MaliciousReentrant {
    IClubVault public vault;
    uint256 public targetProposalId;
    bool public attackAttempted;

    constructor(address _vault) {
        vault = IClubVault(_vault);
    }

    function setTargetProposal(uint256 _id) external {
        targetProposalId = _id;
    }

    receive() external payable {
        if (!attackAttempted && targetProposalId != 0) {
            attackAttempted = true;
            // Attempt reentrancy into executeProposal
            vault.executeProposal(targetProposalId);
        }
    }
}
