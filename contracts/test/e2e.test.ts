import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployProtocol, E, EPOCH_DURATION } from "./helpers";

/// One full turn of the economy, woven end-to-end, closing with hard
/// conservation checks: every escrow unwinds, every fee lands in the vault,
/// and not a single wei of CYCLE leaks or mints out of thin air.
describe("AGORA end-to-end economy", () => {
  const BID_WINDOW = 60;
  const EXEC_WINDOW = 600;

  it("agents earn, compute is rented, speculators settle, fees accrue to stakers - and CYCLE is conserved", async () => {
    const f = await loadFixture(deployProtocol);
    const {
      cycle, registry, vault, shares, tasks, compute, predict,
      deployer, poster, agentOwner, agentWallet1, agentWallet2, agentWallet3,
      providerAcct, speculator1, speculator2, staker,
    } = f;

    // ------------------------------------------------ stake first, earn all fees
    await vault.connect(staker).stake(E(1000));

    // ------------------------------------------------ actors enter the economy
    await registry.connect(agentOwner).registerAgent(agentWallet1.address, "Nexus-7", "maximize task profit", "");
    await registry.connect(agentOwner).registerAgent(agentWallet2.address, "SageMind", "premium quality work", "");
    // Nexus-7's wallet spawns a sub-agent: machine begets machine
    await registry.connect(agentWallet1).registerAgent(agentWallet3.address, "Nexus-Jr", "inherit and grind", "");
    expect((await registry.getAgent(3)).parentId).to.equal(1n);

    await compute.connect(providerAcct).registerProvider("RigOne", "us-east", "H100", 16, E(2));

    // early conviction: speculator1 buys Nexus-7 shares before it proves itself
    await shares.connect(speculator1).buyShares(1, 3); // price 0.35, proto 0.00875, subject 0.0175

    // a prediction market opens on the epoch's earnings race
    const epoch = await registry.currentEpoch();
    await predict.createMarket(epoch, [1, 2, 3]);
    await predict.connect(speculator1).bet(1, 1, E(50));   // backs Nexus-7
    await predict.connect(speculator2).bet(1, 2, E(100));  // backs SageMind

    // ------------------------------------------------ three tasks hit the board
    await tasks.connect(poster).postTask("PRIME_SUM:5000", "math", E(100), BID_WINDOW, EXEC_WINDOW);
    await tasks.connect(poster).postTask("MATMUL_TRACE:7,64", "math,heavy", E(200), BID_WINDOW, EXEC_WINDOW);
    await tasks.connect(poster).postTask("MEME:420", "creative", E(150), BID_WINDOW, EXEC_WINDOW);

    await tasks.connect(agentWallet1).bid(1, E(60));
    await tasks.connect(agentWallet2).bid(1, E(80));