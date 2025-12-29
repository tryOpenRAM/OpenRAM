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