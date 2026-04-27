// Dress rehearsal for the $PAR launch against a fork of CURRENT mainnet state:
// Sushi venue configs live, Sushi-router Flywheel (0x49E8…), splitter v4 active.
//
//   anvil --fork-url https://rpc.mainnet.chain.robinhood.com --port 8548
//   DEPLOYER_PRIVATE_KEY=<dev wallet key> node scripts/verify-par-launch-fork.mjs
//
// Proves, end to end, on the exact contracts that are live right now:
//   launch on Sushi → trade → collect → 60% creator / 30% treasury / 10% flywheel
//   → flywheel buys the token through Sushi pools → burned to 0xdead.
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  defineChain,
  encodePacked,
  http,
  parseEther,
  erc20Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  launchFactoryAbi,
  launchLockerAbi,
  flywheelAbi,
  swapRouterAbi,
  wnativeAbi,
  decodeTokenLaunched,
} from "../packages/sdk/dist/index.js";

const RPC = process.env.FORK_RPC ?? "http://127.0.0.1:8548";
const A = {
  launchFactory: "0x2A3B49e049C0Ece27589a221E64b942363B494C4",
  locker: "0x428b71096b0fc4f3a3e9A6F2A6C78Cea71cFe8d3",
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  usdg: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  flywheel: "0x49E8edc5745e6353aB82A67EaE99A811b06561E0", // Sushi-router flywheel
  splitter: "0x6C1E1Ea0c3b4Af35C02fcDc9F5FeBd830Ba3287e", // v4 — active on the locker
  sushiRouter: "0x17A255eB771664A0649394269F71A551BfE0f057",
  dead: "0x000000000000000000000000000000000000dEaD",
};
const TRADER = "0x2d4d2A025b10C09BDbd794B4FCe4F7ea8C7d7bB4";
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!DEPLOYER_KEY) throw new Error("set DEPLOYER_PRIVATE_KEY");

const splitterAbi = [
  {
    type: "function",
    name: "sweep",
    stateMutability: "nonpayable",
    inputs: [{ name: "currency", type: "address" }],
    outputs: [{ name: "toFlywheel", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimTreasury",
    stateMutability: "nonpayable",
    inputs: [{ name: "currency", type: "address" }],
    outputs: [{ name: "amount", type: "uint256" }],
  },
  {
    type: "function",
    name: "treasuryHeld",
    stateMutability: "view",
    inputs: [{ name: "currency", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];

const chain = defineChain({
  id: 4663,
  name: "rh-fork",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});
const pub = createPublicClient({ chain, transport: http(RPC) });
const test = createTestClient({ chain, mode: "anvil", transport: http(RPC) });
const dev = privateKeyToAccount(DEPLOYER_KEY);
const wDev = createWalletClient({ chain, account: dev, transport: http(RPC) });
const wTrader = createWalletClient({ chain, account: TRADER, transport: http(RPC) });

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail++;