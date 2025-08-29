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
        registry = _registry;
        vault = _vault;
        _cycle.approve(address(_vault), type(uint256).max);
    }

    function setParams(uint16 _feeBps, uint256 _minBet) external onlyOwner {
        require(_feeBps <= 1000, "predict: fee too high");
        feeBps = _feeBps;
        minBet = _minBet;
    }

    // ------------------------------------------------------------- lifecycle

    function createMarket(uint64 epoch, uint64[] calldata candidates)
        external
        returns (uint64 marketId)
    {
        require(epoch >= registry.currentEpoch(), "predict: epoch past");
        require(candidates.length >= 2 && candidates.length <= 8, "predict: 2-8 candidates");
        for (uint256 i = 0; i < candidates.length; i++) {
            require(registry.agentExists(candidates[i]), "predict: unknown agent");
            for (uint256 j = i + 1; j < candidates.length; j++) {
                require(candidates[i] != candidates[j], "predict: duplicate");
            }
        }

        marketId = ++marketCount;
        Market storage m = _markets[marketId];
        m.id = marketId;
        m.epoch = epoch;
        m.creator = msg.sender;
        m.bettingEnds = registry.epochEndTime(epoch);
        m.candidates = candidates;

        emit MarketCreated(marketId, epoch, msg.sender, candidates, m.bettingEnds);
    }

    function bet(uint64 marketId, uint64 agentId, uint256 amount) external nonReentrant {
        Market storage m = _markets[marketId];
        require(m.id != 0, "predict: no market");
        require(!m.resolved, "predict: resolved");
        require(block.timestamp < m.bettingEnds, "predict: betting over");
        require(amount >= minBet, "predict: below min");
        require(_isCandidate(m, agentId), "predict: not a candidate");

        require(cycle.transferFrom(msg.sender, address(this), amount), "predict: pull failed");
        poolOf[marketId][agentId] += amount;
        betOf[marketId][msg.sender][agentId] += amount;
        m.totalPool += amount;
        totalVolume += amount;
        emit BetPlaced(marketId, msg.sender, agentId, amount);
    }

    /// @notice Trustless resolution from the registry's epoch ledger, any
    /// time after the epoch ends. Ties split across all tied camps. Markets
    /// void (full refunds) when max earnings are zero or the winning camp is
    /// empty.
    function resolve(uint64 marketId) external nonReentrant {
        Market storage m = _markets[marketId];
        require(m.id != 0, "predict: no market");
        require(!m.resolved, "predict: resolved");
        require(block.timestamp >= registry.epochEndTime(m.epoch), "predict: epoch live");

        uint256 maxEarnings = 0;
        for (uint256 i = 0; i < m.candidates.length; i++) {
            uint256 e = registry.epochEarnings(m.epoch, m.candidates[i]);
            if (e > maxEarnings) maxEarnings = e;
        }

        m.resolved = true;

        if (maxEarnings == 0) {
            m.voided = true;
            emit MarketResolved(marketId, m.winners, m.totalPool, 0, 0, true);
            return;
        }

        uint256 winnersPool = 0;
        for (uint256 i = 0; i < m.candidates.length; i++) {
            uint64 cand = m.candidates[i];
            if (registry.epochEarnings(m.epoch, cand) == maxEarnings) {
                m.winners.push(cand);
                winnersPool += poolOf[marketId][cand];
            }
        }
        m.winnersPool = winnersPool;

        if (winnersPool == 0) {
            // nobody backed the actual winner: void, full refunds
            m.voided = true;
            emit MarketResolved(marketId, m.winners, m.totalPool, 0, 0, true);
            return;
        }

        uint256 fee = (m.totalPool * feeBps) / 10_000;
        if (fee > 0) {
            m.feeTaken = fee;
            vault.notifyFee(fee);
            totalFeesRouted += fee;
        }
        emit MarketResolved(marketId, m.winners, m.totalPool, winnersPool, fee, false);
    }

    function claim(uint64 marketId) external nonReentrant returns (uint256 payout) {
        Market storage m = _markets[marketId];
        require(m.id != 0, "predict: no market");
        require(m.resolved, "predict: unresolved");
        require(!claimed[marketId][msg.sender], "predict: claimed");
        claimed[marketId][msg.sender] = true;

        if (m.voided) {
            for (uint256 i = 0; i < m.candidates.length; i++) {