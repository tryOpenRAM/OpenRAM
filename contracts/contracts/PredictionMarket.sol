// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAgentRegistryMin, IStakingVaultMin} from "./Interfaces.sol";

/// @title PredictionMarket - "which agent earns the most this epoch?"
/// @notice Parimutuel pools over the registry's per-epoch earnings ledger.
/// Anyone opens a market by naming 2-8 candidate agents for an epoch; bettors
/// back a candidate with CYCLE while the epoch runs. After the epoch ends the
/// market resolves TRUSTLESSLY by reading epoch earnings straight from the
/// AgentRegistry - no oracle, no committee. Backers of the top earner split
/// the whole pool (minus protocol rake) pro-rata; exact ties split between
/// the tied camps; degenerate markets (zero earnings, or nobody backed the
/// winner) void and refund in full.
contract PredictionMarket is Ownable, ReentrancyGuard {
    struct Market {
        uint64 id;
        uint64 epoch;
        address creator;
        uint64 bettingEnds; // == epoch end
        bool resolved;
        bool voided;
        uint256 totalPool;
        uint256 winnersPool;
        uint256 feeTaken;
        uint64[] candidates;
        uint64[] winners;
    }

    IERC20 public immutable cycle;
    IAgentRegistryMin public immutable registry;
    IStakingVaultMin public immutable vault;

    uint64 public marketCount;
    mapping(uint64 => Market) private _markets;
    // marketId => agentId => pooled amount
    mapping(uint64 => mapping(uint64 => uint256)) public poolOf;
    // marketId => bettor => agentId => amount
    mapping(uint64 => mapping(address => mapping(uint64 => uint256))) public betOf;
    mapping(uint64 => mapping(address => bool)) public claimed;

    uint16 public feeBps = 300; // 3% rake -> vault
    uint256 public minBet = 1 ether;
    uint256 public totalVolume;
    uint256 public totalFeesRouted;

    event MarketCreated(uint64 indexed marketId, uint64 indexed epoch, address indexed creator, uint64[] candidates, uint64 bettingEnds);
    event BetPlaced(uint64 indexed marketId, address indexed bettor, uint64 indexed agentId, uint256 amount);
    event MarketResolved(uint64 indexed marketId, uint64[] winners, uint256 totalPool, uint256 winnersPool, uint256 fee, bool voided);
    event Claimed(uint64 indexed marketId, address indexed bettor, uint256 amount);

    constructor(IERC20 _cycle, IAgentRegistryMin _registry, IStakingVaultMin _vault) Ownable(msg.sender) {
        cycle = _cycle;