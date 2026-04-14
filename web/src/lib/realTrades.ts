/**
 * REAL on-chain trades — read the actual Robinhood Stock Token purchases the
 * agent wallets made, straight from Blockscout. Persistent: these exist forever
 * on-chain regardless of race phase, so the timeline is never blank and always
 * shows genuine trades with their real tx links.
 */
const EXPLORER = "https://robinhoodchain.blockscout.com";

const WALLETS: Array<{ name: string; strategy: string; address: string }> = [
  { name: "Friar Tuck", strategy: "balanced", address: "0x36cCCA43255E5c9B4CD323431d536ACad4890011" },
  { name: "Will Scarlet", strategy: "undercut", address: "0x9f8fd324703522678A4C4cc89c586B71F9261182" },
  { name: "Little John", strategy: "premium", address: "0x7Afa69c0e94363077883B1374d68fB8833F6cc06" },
  { name: "Sheriff Notts", strategy: "memes", address: "0x725647C38A964cAECd401241995d2040955a99AD" },
  { name: "Robyn Arrow", strategy: "sniper", address: "0xfc80495BD390207BcA94F9760efc08ef1a571B4D" },
];

const STOCK_TOKENS: Record<string, string> = {
  "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec": "NVDA",
  "0xaf3d76f1834a1d425780943c99ea8a608f8a93f9": "AAPL",
  "0x322f0929c4625ed5bad873c95208d54e1c003b2d": "TSLA",
  "0x6330d8c3178a418788df01a47479c0ce7ccf450b": "COIN",
  "0x12f190a9f9d7d37a250758b26824b97ce941bf54": "AMZN",
  "0xe93237c50d904957cf27e7b1133b510c669c2e74": "MSFT",
  "0x117cc2133c37b721f49de2a7a74833232b3b4c0c": "SPY",
  "0x4a0e65a3eccec6dbe60ae065f2e7bb85fae35eea": "SPCX",
  "0x86923f96303d656e4aa86d9d42d1e57ad2023fdc": "AMD",
  "0xff080c8ce2e5feadaca0da81314ae59d232d4afd": "MU",
  "0xc0d6457c16cc70d6790dd43521c899c87ce02f35": "META",
  "0x2e0847e8910a9732eb3fb1bb4b70a580adad4fe3": "GOOGL",
};

export interface RealTrade {
  t: number; name: string; strategy: string; agentId: string;
  sym: string; side: "buy" | "sell"; qty: number; px: number; usd: number;
  receiptTx: string; proven: boolean;
}

/** Fetch every real stock-token buy across the 5 agent wallets. `prices` maps
 *  symbol -> live USD (from the arena market) to fill in notional. */
export async function fetchRealTrades(prices: Record<string, number>): Promise<RealTrade[]> {
  const out: RealTrade[] = [];
  await Promise.all(WALLETS.map(async (w) => {
    try {
      const r = await fetch(`${EXPLORER}/api/v2/addresses/${w.address}/token-transfers?type=ERC-20`, { signal: AbortSignal.timeout(9000) });
      const j: any = await r.json();
      for (const t of j.items ?? []) {
        const tokenAddr = (t.token?.address ?? t.token?.address_hash ?? "").toLowerCase();
        const sym = STOCK_TOKENS[tokenAddr];
        if (!sym) continue;
        const incoming = t.to?.hash?.toLowerCase() === w.address.toLowerCase();
        const dec = Number(t.token?.decimals ?? 18);
        const qty = Number(t.total?.value ?? t.value ?? 0) / 10 ** dec;
        if (!(qty > 0)) continue;
        const px = prices[sym] ?? 0;
        out.push({
          t: t.timestamp ? Date.parse(t.timestamp) : 0,
          name: w.name, strategy: w.strategy, agentId: "",
          sym, side: incoming ? "buy" : "sell",
          qty: Math.round(qty * 10000) / 10000, px,
          usd: Math.round(qty * px * 100) / 100,
          receiptTx: t.transaction_hash, proven: true,
        });
      }
    } catch { /* wallet fetch blip — skip, others still fill */ }
  }));
  out.sort((a, b) => b.t - a.t);
  return out.slice(0, 40);
}
