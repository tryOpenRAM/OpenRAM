import { config as loadEnv } from "dotenv";
import path from "node:path";
import { AbiCoder, Contract, Interface, JsonRpcProvider, Wallet, formatEther, formatUnits, parseEther, parseUnits } from "ethers";

loadEnv({ path: path.resolve(__dirname, "../../arena/.env") });

const RPC = process.env.FUND_RPC ?? "https://rpc.mainnet.chain.robinhood.com";
const ROUTER = "0x8876789976dEcBfCbBbe364623C63652db8C0904";
const QUOTER = "0x8dc178efb8111bb0973dd9d722ebeff267c98f94";
const ETH = "0x0000000000000000000000000000000000000000";
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const TARGET = parseUnits("5", 6);
const MIN_ETH_RESERVE = parseEther("0.005");
const MAX_GAS_ETH = parseEther("0.0002");
const KEY = { currency0: ETH, currency1: USDG, fee: 460, tickSpacing: 9, hooks: ETH };
const coder = AbiCoder.defaultAbiCoder();
const POOL_KEY = "tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)";
const PATH_KEY = "tuple(address intermediateCurrency,uint24 fee,int24 tickSpacing,address hooks,bytes hookData)";
const EXACT_IN = `tuple(address currencyIn,${PATH_KEY}[] path,uint256[] minHopPriceX36,uint128 amountIn,uint128 amountOutMinimum)`;
const QUOTER_ABI = [`function quoteExactInputSingle(tuple(${POOL_KEY} poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData) params) returns (uint256 amountOut,uint256 gasEstimate)`];
const ERC20_ABI = ["function balanceOf(address) view returns(uint256)"];
const router = new Interface(["function execute(bytes commands,bytes[] inputs,uint256 deadline) payable"]);

async function quote(q: Contract, amount: bigint): Promise<bigint> {
  const [out] = await q.quoteExactInputSingle.staticCall({ poolKey: KEY, zeroForOne: true, exactAmount: amount, hookData: "0x" });
  return out;
}

function calldata(wallet: string, amountIn: bigint, minOut: bigint): string {
  const swap = coder.encode([EXACT_IN], [{
    currencyIn: ETH,
    path: [{ intermediateCurrency: USDG, fee: 460, tickSpacing: 9, hooks: ETH, hookData: "0x" }],
    minHopPriceX36: [], amountIn, amountOutMinimum: minOut,
  }]);
  const settle = coder.encode(["address", "uint256", "bool"], [ETH, amountIn, true]);
  const take = coder.encode(["address", "address", "uint256"], [USDG, wallet, 0]);