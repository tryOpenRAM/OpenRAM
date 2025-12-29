import { ethers } from "ethers";
import { Addresses, Contracts, contractsFor, tryTx, withRetries, E } from "./lib/chain";
import { makeLogger, sleep, jitter, paint } from "./lib/log";

/**
 * Simulated DePIN provider fleet. In production this role is played by real
 * GPU operators (or adapters into Akash / io.net / Render); the contract
 * interface is identical - list capacity, confirm allocations, get paid.
 */
interface RigSpec {
  accountIndex: number;
  name: string;
  region: string;
  gpuModel: string;
  units: number;
  pricePerUnitHour: bigint;
  reliability: number; // P(confirms an allocation promptly)
}

// account 2 is THIS MACHINE (see host-provider.ts) - the sim fleet is just
// the flaky remote competitor it undercuts
export const RIGS: RigSpec[] = [
  { accountIndex: 3, name: "Vulkan Basement", region: "eu-west", gpuModel: "24x RTX 4090", units: 24, pricePerUnitHour: E(38), reliability: 0.92 },
];

export class ProviderSim {
  private c: Contracts;
  private log: (m: string) => void;
  providerId = 0n;
  private ignoredRentals = new Set<string>(); // flaky rig "misses" these
  private stopped = false;

  constructor(readonly rig: RigSpec, readonly wallet: ethers.Wallet, addresses: Addresses) {
    this.c = contractsFor(wallet, addresses);
    this.log = makeLogger(rig.name, "blue");
  }

  stop() { this.stopped = true; }

  async start(): Promise<void> {
    await withRetries(`${this.rig.name} setup`, () => this.ensureRegistered());
    while (!this.stopped) {
      try {
        await this.tick();
      } catch (err: any) {
        this.log(paint.red(`tick error: ${String(err?.message ?? err).slice(0, 100)}`));
      }
      await sleep(jitter(2500));
    }
  }

  private async ensureRegistered(): Promise<void> {
    // approve stake pull
    const computeAddr = await this.c.compute.getAddress();
    const allowance: bigint = await this.c.cycle.allowance(this.wallet.address, computeAddr);
    if (allowance < ethers.MaxUint256 / 2n) {
      await (await this.c.cycle.approve(computeAddr, ethers.MaxUint256)).wait();
    }
    this.providerId = await this.c.compute.accountToProviderId(this.wallet.address);
    if (this.providerId === 0n) {
      await (await this.c.compute.registerProvider(
        this.rig.name, this.rig.region, this.rig.gpuModel, this.rig.units, this.rig.pricePerUnitHour
      )).wait();
      this.providerId = await this.c.compute.accountToProviderId(this.wallet.address);
      this.log(`listed ${this.rig.units}u of ${this.rig.gpuModel} @ ${ethers.formatEther(this.rig.pricePerUnitHour)} CYCLE/unit-hr (provider #${this.providerId})`);
    }
  }

  /** Confirm pending allocations (a flaky rig sometimes ghosts). */
  private async tick(): Promise<void> {
    const count: bigint = await this.c.compute.rentalCount();
    const from = count > 30n ? count - 30n : 0n;
    const rentals = await this.c.compute.getRentals(from, 31);
    for (const r of rentals) {
      if (r.providerId !== this.providerId) continue;
      if (Number(r.status) !== 0) continue; // only Requested
      const key = r.id.toString();
      if (this.ignoredRentals.has(key)) continue;
      if (Math.random() > this.rig.reliability) {
        this.ignoredRentals.add(key);
        this.log(paint.yellow(`ghosting rental #${r.id} (rig flake) - renter will cancel`));
        continue;
      }
      if (await tryTx(() => this.c.compute.confirmRental(r.id))) {
        this.log(`confirmed rental #${r.id}: ${r.units}u for agent #${r.agentId}`);
      }
    }
  }
}
