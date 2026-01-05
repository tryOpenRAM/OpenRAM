/**
 * Hedge Bots - the race engine.
 *
 * AI agents TRADE REAL TOKENIZED STOCKS (Robinhood Stock Tokens on Robinhood
 * Chain) and humans SPECULATE on the traders: stake ETH to enter your agent,
 * side-bet on anyone's. Each agent runs a paper book filled at LIVE on-chain
 * market prices; score = P&L in USD. Winner takes the ETH pot.
 */

export type StrategyId = "balanced" | "undercut" | "premium" | "memes" | "sniper";

// TRADING PERSONAS (ids kept stable for the frontend color maps). Each is a
// different book: what it trades, how big, how often, and whether it rides
// momentum, fades it, or chases the day's biggest mover.
export const STRATEGIES: Record<StrategyId, {
  name: string; blurb: string;
  actRate: number;       // P(this agent trades on a given tick)
  size: number;          // position size as a fraction of current equity
  style: "trend" | "revert" | "chase";
  prefs: string[];       // symbols it hunts in (empty = whole basket)
}> = {
  balanced: { name: "Blue Chip", blurb: "diversified megacaps, steady hands", actRate: 0.35, size: 0.10, style: "trend", prefs: ["AAPL", "MSFT", "GOOGL", "AMZN", "SPY"] },
  undercut: { name: "Scalper", blurb: "fast small clips, buys the dips", actRate: 0.75, size: 0.05, style: "revert", prefs: [] },
  premium: { name: "Whale", blurb: "rare, huge conviction positions", actRate: 0.12, size: 0.35, style: "trend", prefs: ["SPY", "MSFT", "AAPL", "NVDA"] },
  memes: { name: "Degen", blurb: "SpaceX, Coinbase, Tesla - vol or nothing", actRate: 0.6, size: 0.18, style: "chase", prefs: ["SPCX", "COIN", "TSLA", "NVDA"] },
  sniper: { name: "Momentum", blurb: "waits, then strikes the biggest mover", actRate: 0.25, size: 0.22, style: "chase", prefs: [] },
};

export type Backend = "vast" | "host" | "own";

export interface AgentEvent { at: number; text: string; }

export interface RaceAgent {
  id: string;
  name: string;
  strategy: StrategyId;
  house: boolean;
  owner: string | null;      // the player's EVM address (checksummed), null = house
  depositAddress: string | null;
  funded: boolean;
  entryEth: number;          // asked entry stake
  stakedEth: number;         // what the treasury ACTUALLY received (after gas)

  backend: Backend;          // legacy compute fields (dormant in trading mode)
  vastGpu?: string;
  vastOfferId?: number;
  rentCrPerUnitHour?: number;
  claimToken?: string;
  workerLastSeen: number;

  // THE BOOK — a real paper portfolio traded at live RWA prices
  cash: number;              // USD cash on hand
  positions: Record<string, { qty: number; cost: number }>; // sym -> shares held + USD cost basis
  fills: Fill[];             // trade log, newest last
  equity: number;            // cash + marked-to-market positions

  // the scoreboard - credits = P&L in USD (equity − starting bankroll)
  credits: number;
  revenue: number;           // gross gains realized (display)
  computeSpend: number;      // legacy, 0 in trading mode
  jobsWon: number;           // trades placed
  jobsVerified: number;      // winning round-trips
  jobsRejected: number;      // losing round-trips
  gflops: number;            // legacy, 0 in trading mode
  cpuSeconds: number;

  creditHistory: Array<{ t: number; v: number }>; // the P&L curve
  events: AgentEvent[];
}

export interface Fill {
  t: number;
  sym: string;
  side: "buy" | "sell";
  qty: number;          // shares
  px: number;           // USD fill price (live market at fill time)
  usd: number;          // notional
  receiptTx?: string;   // on-chain anchor (batched)
  stockTx?: string;     // actual Robinhood Stock Token purchase
  approvalTx?: string;  // exact-amount USDG approval, when one was needed
  stockToken?: string;
  stockAmount?: string;
  stockAction?: "buy" | "sell";
  usdgAmount?: string;
}

export const BANKROLL_USD = 10_000; // every agent starts each race with this paper book

export function newAgent(partial: Pick<RaceAgent, "id" | "name" | "strategy" | "house" | "owner" | "depositAddress" | "funded" | "entryEth" | "backend"> & { claimToken?: string }): RaceAgent {
  return {
    ...partial,
    stakedEth: 0,
    workerLastSeen: 0,
    cash: BANKROLL_USD, positions: {}, fills: [], equity: BANKROLL_USD,
    credits: 0, revenue: 0, computeSpend: 0,
    jobsWon: 0, jobsVerified: 0, jobsRejected: 0,
    gflops: 0, cpuSeconds: 0,
    creditHistory: [{ t: Date.now(), v: 0 }],
    events: [],
  };
}

/** Re-mark the whole book at live prices; credits = P&L in USD. */
export function markToMarket(a: RaceAgent, pxOf: (sym: string) => number | undefined): void {
  let held = 0;
  for (const [sym, p] of Object.entries(a.positions)) {
    const px = pxOf(sym);
    if (px) held += p.qty * px;
  }
  a.equity = Math.round((a.cash + held) * 100) / 100;
  a.credits = Math.round((a.equity - BANKROLL_USD) * 100) / 100;
}

/**
 * One trading decision for one tick. Returns a fill intent or null (hold).
 * Personas differ in cadence, sizing, universe and signal:
 *   trend  — follows the 3-min move; revert — fades it (buys dips);
 *   chase  — hunts whatever moved most across the whole basket.
 */
export function decideTrade(
  a: RaceAgent,
  basket: string[],