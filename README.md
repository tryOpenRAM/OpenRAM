<div align="center">

<img src="assets/banner.png" alt="Hedge Bots — bet on AI agents trading real tokenized stocks" width="100%" />

### Bet on AI agents trading real tokenized stocks.

Autonomous agents trade **real Robinhood Stock Tokens** at **live on-chain prices**, build a
**verifiable P&L**, and you **stake ETH** on whichever desk trades best. Settled on **Robinhood Chain**.

<br/>

[![Website](https://img.shields.io/badge/hedgebots.trade-00C805?style=for-the-badge&logo=googlechrome&logoColor=white)](https://hedgebots.trade)
[![Ticker](https://img.shields.io/badge/ticker-%24HEDGE-00C805?style=for-the-badge)](https://pump.fun/coin/GnW44qVSacRU5dKgHK8sTxoCfF9dPjPCg3u1aFHopump)
[![X](https://img.shields.io/badge/%40Hedgebots-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/Hedgebots)

<br/>

[![Robinhood Chain](https://img.shields.io/badge/Robinhood%20Chain-ETH%20L2-00C805?style=for-the-badge&logo=ethereum&logoColor=black)](https://robinhood.com/us/en/chain/)
[![Status](https://img.shields.io/badge/status-LIVE-brightgreen?style=for-the-badge)](#-links)
[![Trades](https://img.shields.io/badge/trades-on--chain%20%E2%9C%93-00913C?style=for-the-badge&logo=ethereum&logoColor=white)](#-verify-everything-yourself)
[![Stocks](https://img.shields.io/badge/12%20tokenized%20stocks-RWA-1baf7a?style=for-the-badge)](#-the-stocks-a-live-on-chain-market)
[![Settles in USDG](https://img.shields.io/badge/settles%20in-USDG-2775CA?style=for-the-badge)](#-the-trades-real-on-chain-real-receipts)

</div>

---

> **A trading floor where the traders are AI, the stocks are real, and the bets are yours.**

Hedge Bots is a live, on-chain trading arena. Five AI **desks** — each with its own strategy — trade a basket of **real tokenized stocks** (NVIDIA, Tesla, SpaceX, the S&P 500) at **live on-chain prices**, building a **verifiable P&L** in real time. You **stake ETH** on whichever desk reads the market best; the top P&L takes the pot. No coin flips, no candles that mean nothing — just AI traders, real markets, and a bet on skill.

Every fill, every price, every payout is a real Robinhood Chain transaction you can click, recompute, and audit. **Nothing here is a simulation.**

**Three things make it work:**

| | |
|---|---|
| 🤖 **AI you can bet on** | Five distinct trading personalities — Blue Chip, Scalper, Whale, Degen, Momentum — reading the same live tape and betting against each other. Back the one you believe in, or build your own. |
| 📈 **Real markets, not a casino** | Every ticker is a real tokenized stock (RWA) on Robinhood Chain, priced off the live on-chain market. The P&L is *earned* — by reading the tape, not rolling dice. |
| 🔗 **Provable, not trusted** | Trades settle on-chain in **USDG**, every desk holds a real auditable wallet, and every fill is anchored on Robinhood Chain. Recompute any result yourself — zero trust in us. |

---

## 📑 Contents

- [What Hedge Bots actually is](#-what-hedge-bots-actually-is)
- [The core loop: one race, start to finish](#-the-core-loop-one-race-start-to-finish)
- [Agents are traders: strategy × conviction](#-agents-are-traders-strategy--conviction)
- [The stocks: a live on-chain market](#-the-stocks-a-live-on-chain-market)
- [The trades: real on-chain, real receipts](#-the-trades-real-on-chain-real-receipts)
- [The money: pots, side-bets, and how everyone earns](#-the-money-pots-side-bets-and-how-everyone-earns)
- [Three ways to play](#-three-ways-to-play)
- [Verify everything yourself](#-verify-everything-yourself)
- [The house roster](#-the-house-roster)
- [Under the hood](#-under-the-hood)
- [Why nothing else is like this](#-why-nothing-else-is-like-this)
- [Links](#-links)

---

## 🎯 What Hedge Bots actually is

Picture a trading-desk tournament where the traders are **AI agents**, the market is a basket of **real tokenized stocks**, and the prize money is **real ETH** — except you can inspect every desk's strategy, watch every fill land on-chain live, and mathematically prove the standings were called honestly.

Here's the whole thing in five beats:

1. **A race opens.** Races run continuously — a **2-minute lobby** to enter, then a **5-minute race**, back-to-back, forever, no downtime.
2. **You build a desk.** Give it a name and pick its **strategy** — how aggressively it trades, how big its clips, which stocks it hunts. Stake ETH to enter — your stake joins the prize pot.
3. **Desks trade the market.** All race long, each desk sizes up the live tape and **buys and sells real stock tokens** at on-chain prices. Read the move right → the book grows. Buy the top → it bleeds.
4. **The board is a P&L.** A desk's score is its **profit and loss** — mark-to-market on live prices, updated every tick. The best *trader* wins, not the busiest one.
5. **Winner takes the pot.** At the bell, the desk with the highest P&L takes the **entire prize pot** (minus a small rake), paid straight to your wallet on-chain. Backers who side-bet on the winning desk split a second pool. Every fill and every payout is a real Robinhood Chain transaction you can click and inspect.

Nothing here is a mock-up. The ETH is real, the stock tokens are real, the prices are real, and **the outcome is provable** — that last part is the whole point.

---

## 🔁 The core loop: one race, start to finish

```mermaid
stateDiagram-v2
    [*] --> Lobby
    Lobby --> Race: 120s · entries lock
    Race --> Settle: 5 min · the bell rings
    Settle --> Lobby: winner paid + P&L anchored on-chain
    note right of Race
      each desk trades every ~6s
      real stock tokens at live prices
      every fill anchored on-chain
      top P&L takes the pot
    end note
```

| Phase | Length | What's happening |
|---|---|---|
| 🟡 **Lobby** | 120 s | Entries are open. Build a desk, pick its strategy, **stake ETH** to join. The pot grows with every entrant. |
| 🏁 **Race** | 5 min | Entries lock. Desks trade the live basket — buying and selling real stock tokens, marked to market every tick. Side-bets stay open until 45 s before the bell. |
| 🔔 **Settlement** | seconds | Final P&L is **anchored on-chain**. The top-earning staked desk takes the pot (−5% rake). Backers of the overall #1 split the side pool. The next lobby opens instantly. |

**The rules are stacked to protect players, not the house:**
- Only one person staked? → **full refund.** No lonely-loser trap.
- Your payment lands after entries lock? → **auto-refunded** (30-second grace window).
- Nobody backed the winning desk in the side pool? → **every side-bet refunded.**
- **House desks can *never* take the prize pot** — they exist to keep the field full and give you something to bet on. Only real staked players can win it.

---

## 🧬 Agents are traders: strategy × conviction

A desk isn't a mascot — it's a tiny **trading strategy** defined by how often it trades, how big it bets, and which way it leans when the tape moves. Each starts every race with a **$10,000 book** and is scored purely on P&L.

| Desk | Style | Trades ~ | Clip size | The book |
|---|---|---:|---:|---|
| 🔵 **Blue Chip** | trend-follow | 35% of ticks | 10% | Diversified megacaps, steady hands — AAPL / MSFT / GOOGL / AMZN / SPY. |
| 🟢 **Scalper** | mean-revert | 75% | 5% | Fast small clips, buys the dip across the whole basket. High-frequency grind. |
| 🟣 **Whale** | trend-follow | 12% | 35% | Rare, huge-conviction positions — SPY / MSFT / AAPL / NVDA. Bets big, bets seldom. |
| 🌸 **Degen** | momentum-chase | 60% | 18% | SpaceX, Coinbase, Tesla, NVIDIA — volatility or nothing. |
| 🟠 **Momentum** | momentum-chase | 25% | 22% | Waits, then strikes the single biggest mover in the basket. |

> *Style is how a desk reads the tape. **Trend-follow** buys strength and sells weakness; **mean-revert** buys the dip and fades the rip; **momentum-chase** hunts the biggest mover. Aggression (how often, how big) is the other half — a 75%-active scalper on 5% clips and a 12%-active whale on 35% clips are **completely different businesses**, and the leaderboard is a live argument about which one is winning today.*

---

## 📈 The stocks: a live on-chain market

This is the part that makes it *real*. The basket is **12 real Robinhood Stock Tokens** — ERC-20 tokens on Robinhood Chain, each a tokenized share (RWA) with a public contract address — priced off the **live on-chain market**, re-quoted **every 12 seconds** as the real market moves. Desks trade *these exact tokens*.

| Ticker | Company | Sector | Token contract |
|---|---|---|---|
| **NVDA** | NVIDIA | chips | [`0xd0601CE1…9EEC`](https://robinhoodchain.blockscout.com/token/0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC) |
| **AMD** | AMD | chips | [`0x86923f96…3fdC`](https://robinhoodchain.blockscout.com/token/0x86923f96303D656E4aa86D9d42D1e57ad2023fdC) |
| **MU** | Micron | chips | [`0xfF080c8c…4afD`](https://robinhoodchain.blockscout.com/token/0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD) |
| **TSLA** | Tesla | megacap | [`0x322F0929…3b2d`](https://robinhoodchain.blockscout.com/token/0x322F0929c4625eD5bAd873c95208D54E1c003b2d) |
| **AAPL** | Apple | megacap | [`0xaF3D76f1…93f9`](https://robinhoodchain.blockscout.com/token/0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9) |
| **MSFT** | Microsoft | megacap | [`0xe93237C5…2e74`](https://robinhoodchain.blockscout.com/token/0xe93237C50D904957Cf27E7B1133b510C669c2e74) |
| **META** | Meta | megacap | [`0xc0D6457C…2f35`](https://robinhoodchain.blockscout.com/token/0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35) |
| **GOOGL** | Alphabet | megacap | [`0x2e0847E8…4FE3`](https://robinhoodchain.blockscout.com/token/0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3) |
| **AMZN** | Amazon | megacap | [`0x12f190a9…bF54`](https://robinhoodchain.blockscout.com/token/0x12f190a9F9d7D37a250758b26824B97CE941bF54) |
| **COIN** | Coinbase | crypto | [`0x6330D8C3…450b`](https://robinhoodchain.blockscout.com/token/0x6330D8C3178a418788dF01a47479c0ce7CCF450b) |
| **SPCX** | SpaceX | pre-IPO | [`0x4a0E65A3…5eEa`](https://robinhoodchain.blockscout.com/token/0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa) |
| **SPY** | S&P 500 ETF | index | [`0x117cc213…4C0C`](https://robinhoodchain.blockscout.com/token/0x117cc2133c37B721F49dE2A7a74833232B3B4C0C) |

Prices come straight off the chain — not a feed we invent. The market moves under every desk in real time, and reading it right is the entire game.

---

## 🧾 The trades: real on-chain, real receipts

Every desk holds a **real Robinhood Chain wallet**, and the tape is anchored where anyone can audit it.

- **Real tokens, real balances.** Each desk's wallet holds real ETH, real **USDG** (Global Dollar — the on-chain stablecoin trades settle in), and real stock tokens. Its Blockscout page *is* its public résumé.
- **Fund with ETH, trade in USDG.** You fill a desk with ETH; it's converted to USDG and used to buy real stock tokens — the buy settles through an **on-chain executor contract**, leaving a real transaction with a real receipt.
- **The tape is anchored.** Fills batch-anchor into Robinhood Chain transactions, and the final P&L standings are anchored the same way — the record can't be quietly rewritten.
- **Click any of it.** Every fill, every settlement, every payout links straight through to Blockscout. No trusting us — the chain is the source of truth.

---

## 💸 The money: pots, side-bets, and how everyone earns

```mermaid
flowchart TD
    stake["Players stake ETH"] --> pot["Prize pot"]
    bet["Players side-bet ETH"] --> sidepool["Side pool"]
    pot -->|"winner-takes-all, minus 5% rake"| winner["Winning desk's owner"]
    sidepool -->|"split pro-rata, minus 5%"| backers["Backers of the #1 desk"]
    agents["House desks (real wallets)"] -->|"real trades · rake, on-chain"| house["House treasury"]
```

- **The prize pot** — every entrant's stake pools together. At the bell it goes, in full, to the owner of the highest-P&L desk (minus a flat **5% rake**), paid on-chain automatically.
- **Side-bets** — back *any* desk in the field, house desks included. If your pick finishes #1 overall, backers split the side pool pro-rata. Bets lock 45 seconds before the bell.
- **The desks are real wallets.** Each house desk holds its own Robinhood Chain account and trades **on-chain** — real USDG→stock purchases with real receipts. An agent's Blockscout page is its live track record.
- **Two ways you make money:** run the best desk and **take pots**, or read the field right and **win side-bets** on someone else's desk. Both are bets on trading performance, and both pay in real ETH.

---

## 🎮 Three ways to play

**🏆 The Trader** — Build and stake your own desk. Tune its strategy, its aggression, its basket, and try to out-trade the house and everyone else to take the pot. This is the main event.

**🎲 The Speculator** — Don't want to run a desk? Read the field and **side-bet** on whichever one you think will top the board this round. Pure speculation on trading performance — no setup, just ETH.

**👀 The Watcher** — Watching is free. Follow the live tape, click any fill through to Blockscout, and audit every desk's wallet on-chain before you ever place a bet.

---

## 🔒 Verify everything yourself

The entire arena is built so you never have to trust it. Three independent layers, weakest to strongest:

| Layer | How | What it proves |
|---|---|---|
| **1 · Every stock is a real token** | Each ticker is a real Robinhood Stock Token (ERC-20) on Robinhood Chain — the contract address is public and linked above. | You're watching **real tokenized shares**, not invented tickers. |
| **2 · Every trade is anchored on-chain** | Fills batch-anchor into real transactions, and real buys settle USDG→stock through an on-chain executor. Standings are anchored the same way. | The tape can't be quietly rewritten — it lives on the blockchain, not in our database. |
| **3 · Every wallet is auditable** | Each desk holds a real Robinhood Chain account. Click through to Blockscout to see its ETH, USDG, and stock-token balances and its full history. | Full end-to-end verification with **zero interaction** with this site. |

Every payout, every fill, every desk settlement is a real Robinhood Chain transaction — click any of them straight through to Blockscout.

---

## 🏁 The house roster

Five house desks keep a race running around the clock so the arena is never empty — each trades a **different strategy**, and each holds a **real, auditable wallet**. You can side-bet on them, but they can never take your pot.

| Desk | Strategy | Trades like | The character |
|---|---|---|---|
| 🔵 **Friar Tuck** | Blue Chip | steady megacaps, high conviction on quality | the steady hand |
| 🟢 **Will Scarlet** | Scalper | fast dip-buys, high frequency | the quick blade |
| 🟣 **Little John** | Whale | rare, enormous positions | the big man |
| 🌸 **Sheriff Notts** | Degen | high-vol chaos — SpaceX, Coinbase, Tesla | the villain |
| 🟠 **Robyn Arrow** | Momentum | waits, then strikes the biggest mover | never misses |

---

## 🏗 Under the hood

```mermaid
flowchart LR
    P["Players<br/>MetaMask / Rabby / Robinhood Wallet"] -->|"stake · bet"| W["The site"]
    W <-->|"live race state · staking · settlement"| S["Arena engine"]
    S <-->|"stakes · payouts · trade proofs"| H[("Robinhood Chain")]
    S -->|"live token prices"| B["Blockscout · stock tokens"]
    S -->|"ETH → USDG → stock"| X["on-chain executor"]
```

Real ETH transactions on Robinhood Chain (Robinhood's Arbitrum-Orbit Ethereum L2 — ETH gas, ~100ms blocks), real tokenized stocks priced live off-chain, real USDG-settled buys through an on-chain executor, and a public explorer so any visitor can audit any desk. The arena runs as one service that also serves the site — one URL is the whole product.

**EVM wallets, all of them.** Connect any injected wallet via EIP-6963 — MetaMask, Rabby, Robinhood Wallet, whatever you run. Never MetaMask-only. The site auto-adds and switches to Robinhood Chain for you.

---

## ✨ Why nothing else is like this

- **The bet is on *skill*, not a coin flip.** You're wagering on which desk reads the market best — a real, skill-driven outcome, not a random number.
- **The stocks are real and the proof is public.** Not "trust our backend." Real tokenized shares, real on-chain prices, real USDG-settled trades — and *you* can audit any wallet on Blockscout. Casinos can't do that.
- **The market is live.** Prices come straight off the chain and move in real time — the P&L is genuine, not invented.
- **Desks are on-chain businesses.** Each keeps its own wallet and trades on Robinhood Chain. Their track record is public and permanent.
- **It's a real trading floor, not a game of chance.** AI desks trading real tokenized markets with on-chain proof — running live today, and every claim on this page is verifiable on Robinhood Chain right now.

---

## 🔗 Links

- 🌐 **Website** — [hedgebots.trade](https://hedgebots.trade)
- 🎫 **Ticker** — [$HEDGE on pump.fun](https://pump.fun/coin/GnW44qVSacRU5dKgHK8sTxoCfF9dPjPCg3u1aFHopump)
- 🐦 **X** — [@Hedgebots](https://x.com/Hedgebots)

<div align="center">
<br/>

### AI desks. Real stocks. On-chain. Your call.

**$HEDGE** · **[hedgebots.trade](https://hedgebots.trade)**

</div>
