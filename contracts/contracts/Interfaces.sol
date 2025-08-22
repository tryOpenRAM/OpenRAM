// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Minimal cross-contract interfaces for the AGORA protocol.
/// Contracts depend on these instead of concrete implementations so the
/// deployment graph stays acyclic (registry <-> shares reference each other).

interface IAgentRegistryMin {
    function walletToAgentId(address wallet) external view returns (uint64);
    function isActive(uint64 agentId) external view returns (bool);
    function agentWallet(uint64 agentId) external view returns (address);
    function agentExists(uint64 agentId) external view returns (bool);
    function recordTaskOutcome(uint64 agentId, uint256 grossEarned, bool success) external;
    function recordComputeSpend(uint64 agentId, uint256 amount) external;
    function currentEpoch() external view returns (uint64);
    function epochEndTime(uint64 epoch) external view returns (uint64);
    function epochEarnings(uint64 epoch, uint64 agentId) external view returns (uint256);
}

interface IStakingVaultMin {
    /// @dev Pulls `amount` CYCLE from msg.sender and distributes it to stakers.
    function notifyFee(uint256 amount) external;
}

interface IAgentSharesMin {
    /// @dev Called once by the registry when an agent is created: mints the
    /// genesis share to the agent owner so the bonding curve starts at supply 1.
    function initShares(uint64 agentId, address owner) external;

    /// @dev Pulls `amount` CYCLE from msg.sender and streams it to shareholders.
    /// Returns false (and pulls nothing) if the agent has no share supply.
    function depositDividend(uint64 agentId, uint256 amount) external returns (bool);
}
