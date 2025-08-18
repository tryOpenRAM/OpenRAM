// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAgentRegistryMin, IStakingVaultMin} from "./Interfaces.sol";

/// @title ComputeMarket - the DePIN leg: raw compute, metered in CYCLE.
/// @notice GPU/CPU providers stake CYCLE and list capacity at a price per
/// unit-hour. Agents escrow rent for a slice, the provider confirms the
/// allocation, and on completion the provider is paid minus protocol fee.
/// Failed allocations refund the agent and slash the provider's stake - half
/// as compensation to the agent, half to the vault. Every agent action here
/// is real demand for raw compute capacity, priced on-chain.
///
/// In production this contract is the settlement layer over external DePIN
/// networks (Akash / io.net / Render adapters); the local demo runs a
/// simulated provider fleet against the exact same interface.
contract ComputeMarket is Ownable, ReentrancyGuard {
    enum RentalStatus {
        Requested, // escrowed, awaiting provider confirmation
        Active,    // provider confirmed, slice is live
        Completed, // settled, provider paid
        Failed,    // agent reported failure: refund + provider slash
        Cancelled  // agent withdrew before confirmation
    }

    struct Provider {
        uint64 id;
        address account;
        string name;
        string region;
        string gpuModel;
        uint32 totalUnits;
        uint32 availableUnits;
        uint256 pricePerUnitHour; // CYCLE (18d) per unit per hour
        uint256 stake;
        bool active;
        uint64 registeredAt;
        uint256 totalEarned;
        uint32 completedRentals;
        uint32 failedRentals;
    }

    struct Rental {
        uint64 id;
        uint64 providerId;
        uint64 agentId;
        uint32 units;
        uint32 durationSecs;
        uint64 requestedAt;
        uint64 startedAt;
        uint256 cost; // escrowed CYCLE
        RentalStatus status;
    }

    IERC20 public immutable cycle;
    IAgentRegistryMin public immutable registry;
    IStakingVaultMin public immutable vault;

    uint64 public providerCount;
    uint64 public rentalCount;
    mapping(uint64 => Provider) private _providers;
    mapping(uint64 => Rental) private _rentals;
    mapping(address => uint64) public accountToProviderId;

    uint256 public minProviderStake;
    uint16 public feeBps = 250;       // 2.5% of rent -> vault
    uint32 public confirmWindow = 60; // provider must confirm within this
    uint256 public totalComputeVolume;
    uint256 public totalFeesRouted;

    // ---- the AGORA Compute Index: volume-weighted price of a unit-hour ----
    uint256 public totalUnitSeconds; // units * seconds across settled rentals
    mapping(uint64 => uint256) public epochRentSpend;
    mapping(uint64 => uint256) public epochUnitSeconds;

    event ProviderRegistered(uint64 indexed providerId, address indexed account, string name, string gpuModel, uint32 units, uint256 pricePerUnitHour);
    event ProviderDeactivated(uint64 indexed providerId);
    event ProviderStakeWithdrawn(uint64 indexed providerId, uint256 amount);
    event RentalRequested(uint64 indexed rentalId, uint64 indexed providerId, uint64 indexed agentId, uint32 units, uint32 durationSecs, uint256 cost);
    event RentalConfirmed(uint64 indexed rentalId);
    event RentalCompleted(uint64 indexed rentalId, uint256 providerPay, uint256 fee);
    event RentalFailed(uint64 indexed rentalId, uint256 refund, uint256 slashed);
    event RentalCancelled(uint64 indexed rentalId);

    constructor(IERC20 _cycle, IAgentRegistryMin _registry, IStakingVaultMin _vault, uint256 _minProviderStake)
        Ownable(msg.sender)
    {
        cycle = _cycle;
        registry = _registry;
        vault = _vault;
        minProviderStake = _minProviderStake;
        _cycle.approve(address(_vault), type(uint256).max);
    }

    // ---------------------------------------------------------------- admin

    function setParams(uint256 _minProviderStake, uint16 _feeBps, uint32 _confirmWindow) external onlyOwner {
        require(_feeBps <= 2000, "compute: fee too high");
        minProviderStake = _minProviderStake;
        feeBps = _feeBps;
        confirmWindow = _confirmWindow;
    }

    // ------------------------------------------------------------ providers

    function registerProvider(
        string calldata name,
        string calldata region,
        string calldata gpuModel,
        uint32 units,
        uint256 pricePerUnitHour
    ) external nonReentrant returns (uint64 providerId) {
        require(accountToProviderId[msg.sender] == 0, "compute: already provider");
        require(units > 0 && pricePerUnitHour > 0, "compute: bad listing");
        require(cycle.transferFrom(msg.sender, address(this), minProviderStake), "compute: stake failed");

        providerId = ++providerCount;
        Provider storage p = _providers[providerId];
        p.id = providerId;
        p.account = msg.sender;
        p.name = name;
        p.region = region;
        p.gpuModel = gpuModel;
        p.totalUnits = units;
        p.availableUnits = units;
        p.pricePerUnitHour = pricePerUnitHour;
        p.stake = minProviderStake;
        p.active = true;
        p.registeredAt = uint64(block.timestamp);

        accountToProviderId[msg.sender] = providerId;
        emit ProviderRegistered(providerId, msg.sender, name, gpuModel, units, pricePerUnitHour);
    }

    function deactivateProvider(uint64 providerId) external {
        Provider storage p = _providers[providerId];
        require(p.id != 0 && msg.sender == p.account, "compute: not provider");
        require(p.active, "compute: inactive");
        p.active = false;
        emit ProviderDeactivated(providerId);
    }

    /// @notice After deactivation and once all units are back (no live
    /// rentals), the provider reclaims remaining stake.
    function withdrawProviderStake(uint64 providerId) external nonReentrant {
        Provider storage p = _providers[providerId];
        require(p.id != 0 && msg.sender == p.account, "compute: not provider");
        require(!p.active, "compute: still active");
        require(p.availableUnits == p.totalUnits, "compute: rentals live");
        uint256 amount = p.stake;
        require(amount > 0, "compute: nothing staked");
        p.stake = 0;
        require(cycle.transfer(p.account, amount), "compute: transfer failed");
        emit ProviderStakeWithdrawn(providerId, amount);
    }

    // -------------------------------------------------------------- rentals

    /// @notice Called by an agent wallet: escrow rent for `units` over
    /// `durationSecs`. cost = price * units * duration / 3600.
    function rent(uint64 providerId, uint32 units, uint32 durationSecs)
        external
        nonReentrant
        returns (uint64 rentalId)
    {
        Provider storage p = _providers[providerId];
        require(p.id != 0, "compute: no provider");
        require(p.active, "compute: provider inactive");
        require(units > 0 && units <= p.availableUnits, "compute: no capacity");
        require(durationSecs >= 10 && durationSecs <= 7 days, "compute: bad duration");

        uint64 agentId = registry.walletToAgentId(msg.sender);
        require(agentId != 0 && registry.isActive(agentId), "compute: not an agent");

        uint256 cost = (p.pricePerUnitHour * units * durationSecs) / 3600;
        require(cost > 0, "compute: zero cost");
        require(cycle.transferFrom(msg.sender, address(this), cost), "compute: escrow failed");

        p.availableUnits -= units;

        rentalId = ++rentalCount;
        _rentals[rentalId] = Rental({
            id: rentalId,
            providerId: providerId,
            agentId: agentId,
            units: units,
            durationSecs: durationSecs,
            requestedAt: uint64(block.timestamp),
            startedAt: 0,
            cost: cost,
            status: RentalStatus.Requested
        });
        emit RentalRequested(rentalId, providerId, agentId, units, durationSecs, cost);
    }

    function confirmRental(uint64 rentalId) external {
        Rental storage r = _rentals[rentalId];
        require(r.id != 0, "compute: no rental");
        require(r.status == RentalStatus.Requested, "compute: not requested");
        require(msg.sender == _providers[r.providerId].account, "compute: not provider");
        r.status = RentalStatus.Active;
        r.startedAt = uint64(block.timestamp);
        emit RentalConfirmed(rentalId);
    }

    /// @notice Agent may cancel an unconfirmed rental (e.g. provider silent
    /// past the confirm window) for a full refund.
    function cancelRental(uint64 rentalId) external nonReentrant {
        Rental storage r = _rentals[rentalId];
        require(r.id != 0, "compute: no rental");
        require(r.status == RentalStatus.Requested, "compute: not requested");
        require(msg.sender == registry.agentWallet(r.agentId), "compute: not renter");
        r.status = RentalStatus.Cancelled;
        _providers[r.providerId].availableUnits += r.units;
        require(cycle.transfer(msg.sender, r.cost), "compute: refund failed");
        emit RentalCancelled(rentalId);
    }

    /// @notice Settle a rental: the renting agent may settle any time once
    /// active; anyone may settle after the rental period lapses (frees
    /// capacity). Provider gets rent minus protocol fee.
    function completeRental(uint64 rentalId) external nonReentrant {
        Rental storage r = _rentals[rentalId];
        require(r.id != 0, "compute: no rental");
        require(r.status == RentalStatus.Active, "compute: not active");
        bool isRenter = msg.sender == registry.agentWallet(r.agentId);
        require(isRenter || block.timestamp >= r.startedAt + r.durationSecs, "compute: still running");

        r.status = RentalStatus.Completed;
        Provider storage p = _providers[r.providerId];
        p.availableUnits += r.units;
        p.completedRentals += 1;

        uint256 fee = (r.cost * feeBps) / 10_000;
        uint256 providerPay = r.cost - fee;
        if (fee > 0) {
            vault.notifyFee(fee);
            totalFeesRouted += fee;
        }
        p.totalEarned += providerPay;
        totalComputeVolume += r.cost;
        // index accounting: this settlement's contribution to the price of compute
        uint256 unitSeconds = uint256(r.units) * r.durationSecs;
        totalUnitSeconds += unitSeconds;
        uint64 epoch = registry.currentEpoch();
        epochRentSpend[epoch] += r.cost;
        epochUnitSeconds[epoch] += unitSeconds;
        require(cycle.transfer(p.account, providerPay), "compute: pay failed");
        registry.recordComputeSpend(r.agentId, r.cost);