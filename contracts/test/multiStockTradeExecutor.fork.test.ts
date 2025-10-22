import { expect } from "chai";
import { ethers } from "hardhat";
import { config as loadEnv } from "dotenv";
import path from "node:path";

loadEnv({ path: path.resolve(__dirname, "../../arena/.env") });

const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const QUOTER = "0x8dc178efb8111bb0973dd9d722ebeff267c98f94";
const ZERO = ethers.ZeroAddress;
const STOCKS = [
  ["NVDA", "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC"],
  ["TSLA", "0x322F0929c4625eD5bAd873c95208D54E1c003b2d"],
  ["AAPL", "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9"],
  ["MSFT", "0xe93237C50D904957Cf27E7B1133b510C669c2e74"],
  ["SPY", "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C"],
  ["META", "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35"],
  ["GOOGL", "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3"],
] as const;

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];
const POOL_KEY = "tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)";
const QUOTER_ABI = [
  `function quoteExactInputSingle(tuple(${POOL_KEY} poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData) params) returns (uint256 amountOut,uint256 gasEstimate)`,
];

describe("MultiStockTradeExecutor (Robinhood Chain fork)", function () {
  it("buys every token in the liquid basket with exact capped USDG clips", async function () {
    const key = process.env.AGENT_SECRET_1;
    if (!key) throw new Error("AGENT_SECRET_1 is required in arena/.env");
    const buyer = new ethers.Wallet(key, ethers.provider);
    const usdg = new ethers.Contract(USDG, ERC20_ABI, buyer);
    const quoter = new ethers.Contract(QUOTER, QUOTER_ABI, buyer);
    const amountIn = ethers.parseUnits("0.05", 6);
    const totalIn = amountIn * BigInt(STOCKS.length);

    expect(await usdg.balanceOf(buyer.address)).to.be.gte(totalIn);

    const Factory = await ethers.getContractFactory("MultiStockTradeExecutor", buyer);
    const executor = await Factory.deploy();
    const deployReceipt = await executor.deploymentTransaction()!.wait();
    await (await usdg.approve(await executor.getAddress(), totalIn)).wait();
