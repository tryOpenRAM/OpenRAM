import { ethers, artifacts, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

const E = (n: string | number) => ethers.parseEther(String(n));

// ---- demo economy parameters -----------------------------------------------
const EPOCH_DURATION = 300; // 5-minute epochs so prediction markets resolve live
const MIN_AGENT_STAKE = E(100);
const MIN_PROVIDER_STAKE = E(500);
const CURVE_DIVISOR = 40;
const REVIEW_WINDOW = 45; // seconds before silent posters auto-approve

// actor roles by account index (hardhat accounts locally; SWARM_MNEMONIC on
// public networks - NEVER the well-known hardhat keys in public)
// 0 deployer/treasury | 1 task faucet (the "user" side) | 2-3 compute providers
// 4-9 agent wallets   | 10-13 speculators + market maker | 15 local web wallet
const MINTS: Array<[number, bigint]> = [
  [1, E(2_000_000)],
  [2, E(100_000)], [3, E(100_000)],