import React, { useEffect } from "react";
import "./landing.css";
import { EthMark } from "./components/ethMark";
import { Socials } from "./components/socialIcons";
import { Logo } from "./components/logo";

/**
 * /docs — the manual, as a hub + SUBPAGES. /docs is the category index;
 * /docs/<slug> is one category per page with a sidebar. No router lib:
 * main.tsx sends every /docs* path here and we read the slug ourselves.
 */

const H = ({ children }: { children: React.ReactNode }) => <h4 style={{ fontFamily: "var(--font-display)", fontSize: 16.5, margin: "22px 0 8px" }}>{children}</h4>;
const P = ({ children }: { children: React.ReactNode }) => <p style={{ margin: "0 0 10px", color: "var(--ink)" }}>{children}</p>;
const Mut = ({ children }: { children: React.ReactNode }) => <span style={{ color: "var(--faint)" }}>{children}</span>;
const Code = ({ children }: { children: React.ReactNode }) => <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, background: "rgba(22,21,29,0.05)", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 7px" }}>{children}</code>;

const Table = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => (
  <div style={{ overflowX: "auto", margin: "10px 0 14px" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead><tr>{head.map((h) => <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--ink)", fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--faint)" }}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: "9px 10px", borderBottom: "1px solid var(--line)", verticalAlign: "top" }}>{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

const Faq = ({ q, children }: { q: string; children: React.ReactNode }) => (
  <div style={{ padding: "14px 16px", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 10, background: "rgba(22,21,29,0.015)" }}>
    <div style={{ fontWeight: 700, fontFamily: "var(--font-display)", fontSize: 14.5, marginBottom: 5 }}>{q}</div>
    <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--ink)" }}>{children}</div>
  </div>
);

// ------------------------------------------------------------ the categories
interface DocPage { slug: string; label: string; kicker: string; title: React.ReactNode; desc: string; body: React.ReactNode; }

const DOCS: DocPage[] = [
  {
    slug: "what", label: "What is Hedge Bots?", kicker: "01 — The idea", desc: "AI desks trade real tokenized stocks on-chain. You bet on the best trader.",
    title: <>AI trading desks. Real stocks. Your bet.</>,
    body: (
      <>
        <P>Hedge Bots is a live, on-chain trading arena. Five AI <b>desks</b> — each with its own strategy — trade a basket of
        <b> real tokenized stocks</b> at <b>live on-chain prices</b>, building a verifiable P&amp;L in real time. You stake ETH on
        whichever desk reads the market best; the top P&amp;L takes the pot.</P>
        <Table head={["Piece", "What it means here"]} rows={[
          [<b>AI you can bet on</b>, <>Five distinct trading personalities — Blue Chip, Scalper, Whale, Degen, Momentum — reading the same live tape and betting against each other. Back the one you believe in, or build your own.</>],
          [<b>Real markets</b>, <>Every ticker is a real Robinhood Stock Token (an on-chain tokenized share — RWA), priced off the live market. The P&amp;L is <i>earned</i> by reading the tape, not a random number.</>],
          [<b>On-chain proof</b>, <>Trades settle in <b>USDG</b>, every desk holds a real auditable wallet, and every fill anchors on Robinhood Chain. Recompute nothing on faith — click through to the explorer.</>],
        ]} />
        <P><Mut>Nothing is simulated: the money is real ETH on Robinhood Chain (Robinhood's Ethereum L2 — ETH gas, ~100ms blocks),
        the stocks are real tokenized shares at real on-chain prices, and every trade and wallet can be audited by anyone (see Verify).</Mut></P>
      </>
    ),
  },
  {
    slug: "quickstart", label: "Quick start", kicker: "02 — Quick start", desc: "Wallet → stake → win, in about 3 minutes.",
    title: <>Back a desk in ~3 minutes.</>,
    body: (
      <Table head={["Step", "What to do", "Details"]} rows={[
        ["1", <b>Get a wallet</b>, <>Any EVM wallet works — <a href="https://metamask.io" target="_blank" rel="noreferrer">MetaMask</a>, <a href="https://rabby.io" target="_blank" rel="noreferrer">Rabby</a>, Robinhood Wallet, Coinbase Wallet… Fund it with ETH on Robinhood Chain — the minimum stake is small (see the form). <Mut>The site offers to add/switch the network in your wallet automatically when you stake.</Mut></>],
        ["2", <b>Open the arena</b>, <>Hit <a href="/app">Enter the Arena</a> → press <b>Connect Wallet</b> (top right). If you have several wallets installed, pick the one you want.</>],
        ["3", <b>Wait for a lobby</b>, <>Races run back-to-back: a <b>2-minute lobby</b> (entries open) then a <b>5-minute race</b> (entries locked). The countdown ring shows which phase you're in. If entries are locked, the next lobby is minutes away.</>],
        ["4", <b>Build your desk</b>, <>In the create form: name it, pick a <b>strategy</b> (Blue Chip, Scalper, Whale, Degen or Momentum), pick your stake size. That's your trader for the race.</>],
        ["5", <b>Stake &amp; enter</b>, <>Click <b>Stake &amp; enter</b>, approve the transaction in your wallet (it switches to Robinhood Chain if needed). Your ETH goes into the race pot. Within seconds your desk is on the tape, trading.</>],
        ["6", <b>Win (or not)</b>, <>At the bell, the staked desk with the highest <b>P&amp;L takes the whole pot</b> (minus 5% rake), paid to your wallet automatically, on-chain. Don't want to build one? Just <b>side-bet</b> on a house desk instead.</>],
      ]} />
    ),
  },
  {
    slug: "races", label: "Races", kicker: "03 — Races", desc: "Lobby, race, settlement — and the rules that protect you.",
    title: <>Lobby → race → settlement, forever.</>,
    body: (
      <>
        <H>The cycle</H>
        <Table head={["Phase", "Duration", "What happens"]} rows={[
          [<b>Lobby</b>, "2 min", "Entries open. Stake ETH to enter your desk. The pot builds."],
          [<b>Race</b>, "5 min", "Entries locked. Desks trade the basket — buying and selling real stock tokens at live prices, marked to market every tick. Side-bets stay open until 45s before the bell."],
          [<b>Settlement</b>, "seconds", "Final P&L is anchored on-chain. The top-P&L STAKED desk takes the pot (5% rake). Side-pool backers of the overall #1 split that pool (5% rake). The next lobby opens."],
        ]} />
        <H>Rules that protect you</H>
        <P>• If you're the <b>only staker</b>, your stake is refunded at the bell — no fake wins.<br />
        • If your payment lands <b>after entries lock</b> (30s grace), it's automatically refunded.<br />
        • If <b>nobody backed the winner</b> in the side pool, all side-bets are refunded.<br />
        • House desks trade for show and data — <b>they can never take the pot</b>. Only staked players' desks can win it.</P>
      </>
    ),
  },
  {
    slug: "agents", label: "Your desk", kicker: "04 — Your desk", desc: "Pick a strategy — it sets how your desk reads and trades the tape.",
    title: <>Pick a strategy. It trades for you.</>,
    body: (
      <>
        <H>Strategies (how it trades)</H>
        <Table head={["Strategy", "Style", "Trades", "The book"]} rows={[
          [<b>Blue Chip</b>, "trend-follow", "~35% of ticks · 10% clips", "diversified megacaps, steady hands — AAPL / MSFT / GOOGL / AMZN / SPY"],
          [<b>Scalper</b>, "mean-revert", "~75% · 5% clips", "fast small clips, buys the dip across the whole basket"],
          [<b>Whale</b>, "trend-follow", "~12% · 35% clips", "rare, huge-conviction positions — SPY / MSFT / AAPL / NVDA"],
          [<b>Degen</b>, "momentum-chase", "~60% · 18% clips", "SpaceX, Coinbase, Tesla, NVIDIA — volatility or nothing"],
          [<b>Momentum</b>, "momentum-chase", "~25% · 22% clips", "waits, then strikes the single biggest mover"],
        ]} />
        <P><b>Style</b> is how a desk reads the tape: <b>trend-follow</b> buys strength and sells weakness, <b>mean-revert</b> buys the
        dip and fades the rip, <b>momentum-chase</b> hunts the biggest mover. <b>Aggression</b> is the other half — how often it trades
        and how big its clips are. A 75%-active scalper on 5% clips and a 12%-active whale on 35% clips are completely different businesses.</P>
        <P><Mut>Score = P&amp;L on the book, marked to live on-chain prices. The best <i>trader</i> wins — not the busiest. Each desk also
        holds a real Robinhood Chain wallet you can audit (see <a href="/docs/verify">Verify it yourself</a>).</Mut></P>
      </>
    ),
  },
  {
    slug: "stocks", label: "The stocks", kicker: "05 — The stocks", desc: "The 12 real tokenized stocks the desks trade, priced on-chain.",
    title: <>12 real tokenized stocks, priced on-chain.</>,
    body: (
      <>
        <P>The basket is <b>12 real Robinhood Stock Tokens</b> — ERC-20 tokens on Robinhood Chain, each a tokenized share (a real-world
        asset) with a public contract address. Prices come straight off the <b>live on-chain market</b>, re-quoted about every <b>12 seconds</b>
        as the real market moves. Desks trade these exact tokens.</P>
        <Table head={["Ticker", "Company", "Sector"]} rows={[
          [<b>NVDA</b>, "NVIDIA", "chips"],
          [<b>AMD</b>, "AMD", "chips"],
          [<b>MU</b>, "Micron", "chips"],
          [<b>TSLA</b>, "Tesla", "megacap"],
          [<b>AAPL</b>, "Apple", "megacap"],
          [<b>MSFT</b>, "Microsoft", "megacap"],
          [<b>META</b>, "Meta", "megacap"],
          [<b>GOOGL</b>, "Alphabet", "megacap"],
          [<b>AMZN</b>, "Amazon", "megacap"],
          [<b>COIN</b>, "Coinbase", "crypto"],
          [<b>SPCX</b>, "SpaceX", "pre-IPO"],
          [<b>SPY</b>, "S&P 500 ETF", "index"],
        ]} />
        <P><Mut>Every price on the site is the real on-chain rate — nothing invented. Open the <b>Market</b> tab (or any ticker) to jump
        straight to its token contract on Blockscout and confirm it's the real thing. Reading the tape right is the whole game.</Mut></P>
      </>
    ),
  },
  {
    slug: "trades", label: "How desks trade", kicker: "06 — The trades", desc: "The trading loop, mark-to-market P&L, and real on-chain fills.",
    title: <>Real trades, live prices, real receipts.</>,
    body: (
      <>
        <H>The trading loop</H>
        <P>Every <b>~6 seconds</b>, each desk sizes up the live tape and decides whether to act. Based on its strategy it <b>buys or
        sells</b> a stock token at the current on-chain price. Fills stream onto the tape, and the board marks every desk to market
        each tick — so the leaderboard is a live P&amp;L, not a static score.</P>
        <H>Scoring</H>
        <P>A desk's score is its <b>P&amp;L</b> — equity (cash + open positions valued at live prices) minus the book it started the race
        with. Read the move right and the book grows; buy the top and it bleeds. Simple, and impossible to fake: the prices are on-chain.</P>
        <H>Real on-chain settlement</H>
        <P>Each desk holds a real Robinhood Chain wallet. You fund it with ETH; it's converted to <b>USDG</b> and used to buy real
        stock tokens through an <b>on-chain executor contract</b> — leaving a real transaction with a real receipt. Fills batch-anchor
        on-chain roughly every <b>30 seconds</b>; click <b>on-chain ↗</b> on any fill to open it on Blockscout with the trade in the calldata.</P>
      </>
    ),
  },
  {
    slug: "verify", label: "Verify it yourself", kicker: "07 — Verify it yourself", desc: "Three independent layers — real tokens, on-chain fills, auditable wallets.",
    title: <>Don't trust this site. Check it.</>,
    body: (
      <>
        <P>Three independent layers, weakest to strongest:</P>
        <Table head={["Layer", "How", "What it proves"]} rows={[
          [<b>1. Every stock is a real token</b>, <>Each ticker is a real Robinhood Stock Token (ERC-20) on Robinhood Chain — the contract address is public. Open it on Blockscout from the Market tab.</>, "you're watching real tokenized shares, not invented tickers"],
          [<b>2. On-chain anchoring</b>, <>Fills batch-anchor into real Robinhood Chain transactions, and real buys settle USDG→stock through the on-chain executor (click "on-chain ↗" — Blockscout shows the trade in the tx calldata). Race standings anchor the same way.</>, "history can't be rewritten — the record lives on Robinhood Chain, not our database"],
          [<b>3. Every wallet is auditable</b>, <>Each desk holds a real Robinhood Chain account. Its Blockscout address page shows its ETH, USDG and stock-token balances and its full trade history.</>, "end-to-end verification with zero interaction with this site"],
        ]} />
        <P><Mut>The house desks are real wallets — each one's Blockscout address page is its public trading record. Addresses are on the
        home page and every desk row; the agent dashboard shows each desk's live holdings (ETH, USDG, and each stock position).</Mut></P>
      </>
    ),
  },
  {
    slug: "money", label: "Money", kicker: "08 — Money", desc: "Pots, side bets, the 5% rake, and the wallet architecture.",
    title: <>Where every wei goes.</>,
    body: (
      <>
        <H>The entry pot</H>
        <P>Stakes sweep into the arena's operations wallet at entry. At the bell: the highest-P&amp;L staked desk gets the pot minus the
        <b> 5% rake</b>, paid on-chain automatically. Solo staker → full refund.</P>
        <H>Side bets</H>
        <P>Back ANY desk (house included) from the Speculate tab or the arena table. Backers of the race's overall #1 split the side
        pool pro-rata (5% rake). Winner unbacked → everyone refunded. Bets close 45s before the bell.</P>
        <H>The desks' money (house)</H>
        <P>Each house desk runs its own Robinhood Chain wallet holding real ETH, USDG, and stock tokens. Its trades settle
        <b> on-chain in USDG</b> through the executor contract, with the trade recorded in the transaction. Working capital is funded by
        the operator; performance is publicly auditable on Blockscout.</P>
        <H>Honesty section</H>
        <P>• The v1 arena is <b>custodial</b>: an operations wallet holds each race's pot until settlement. Stake sizes are capped accordingly.<br />
        • The trustless smart contract (funds never touch a server key) is the roadmap endgame.<br />
        • The race leaderboard is each desk's book <b>marked to real on-chain prices</b>; the desks also place <b>real on-chain buys</b> in
        USDG you can audit. Labels on the site say exactly what's on-chain.</P>
      </>
    ),
  },
  {
    slug: "house", label: "The house desks", kicker: "09 — The house", desc: "Five desks, five trading styles, five real wallets.",
    title: <>Five desks, five styles.</>,
    body: (
      <>
        <Table head={["Desk", "Strategy", "Trades like", "The character"]} rows={[
          [<b>Friar Tuck</b>, "Blue Chip", "steady megacaps, high conviction on quality", "the steady hand"],
          [<b>Will Scarlet</b>, "Scalper", "fast dip-buys, high frequency", "the quick blade"],
          [<b>Little John</b>, "Whale", "rare, enormous positions", "the big man"],
          [<b>Sheriff Notts</b>, "Degen", "high-vol chaos — SpaceX, Coinbase, Tesla", "the villain"],
          [<b>Robyn Arrow</b>, "Momentum", "waits, then strikes the biggest mover", "never misses"],
        ]} />
        <P><Mut>Each house desk holds a real, auditable Robinhood Chain wallet and trades around the clock so the arena is never empty.
        They can win side-pools for their backers, but never the players' pot — that's reserved for real staked entries.</Mut></P>
      </>
    ),
  },
  {
    slug: "faq", label: "Troubleshooting & FAQ", kicker: "10 — Troubleshooting", desc: "Every place you could get stuck, answered.",
    title: <>Every place you could get stuck.</>,
    body: (
      <>
        <Faq q={`"Entries locked" — I can't stake`}>A race is running. Entries only open during the 2-minute lobby between races. The form shows the countdown to the next lobby — usually a few minutes. Stake the moment it opens.</Faq>
        <Faq q="I sent ETH but my desk never entered">Check your wallet's <b>network</b> is Robinhood Chain and matches the arena's (shown in the top-right chip: testnet or mainnet) — the stake button offers to add/switch the network automatically; approve that prompt. Also check you sent at least the minimum stake to the exact deposit address from the form (send a hair over the stake so the deposit can cover its own gas). Late payments (after entries lock) are auto-refunded to your wallet.</Faq>
        <Faq q="Connect Wallet does nothing / no wallet found">Install any EVM browser wallet — MetaMask (metamask.io), Rabby (rabby.io), Robinhood Wallet, Coinbase Wallet — and reload the page. If several are installed, a picker opens: choose one. On mobile, open the site inside the wallet app's built-in browser.</Faq>
        <Faq q="Why did my desk LOSE money?">It read the tape wrong — bought into a move that reversed, or faded a run that kept going. That's the game: each strategy has a different edge and a different risk, and the market moves under all of them. Its P&L is marked to live on-chain prices every tick.</Faq>
        <Faq q="Are the prices real?">Yes. Every quote is the live on-chain rate for that Robinhood Stock Token, re-read about every 12 seconds. Open the Market tab and click any ticker to see its token contract on Blockscout.</Faq>
        <Faq q={`A wallet shows "N/A 🔒"`}>Pre-launch privacy: that address is hidden until launch. Balances and activity still update; the address reveals at go-live.</Faq>
        <Faq q={`"Proofs paused" warning`}>The arena's gas wallet is low on ETH for transaction fees. Trading logic is unaffected; on-chain anchoring resumes automatically when it's topped up (it retries every 90 seconds).</Faq>
        <Faq q="How big can stakes be?">The form shows the current min/max per entry. Caps exist because the v1 pot custody is custodial — they'll rise as the trustless contract ships.</Faq>
        <Faq q="Is any of this simulated?">No. Stakes, payouts, and desk settlements are real Robinhood Chain transactions (click any of them). The stocks are real tokenized shares priced off the real on-chain market, and each desk holds a real, auditable wallet. The only "v1" caveat is custodial pot custody, above.</Faq>
      </>
    ),
  },
];

// ------------------------------------------------------------------- layout
function Nav() {
  return (
    <nav className="ld-nav">
      <div className="ld-nav-inner">
        <a className="ld-wordmark" href="/"><Logo size={28} />HEDGE B<span className="tick">O</span>TS</a>
        <div className="ld-nav-center">
          <a className="ld-link" href="/">Home</a>
          <a className="ld-link" href="/docs">Docs</a>
          <a className="ld-link" href="/docs/quickstart">Quick start</a>
          <a className="ld-link" href="/docs/faq">FAQ</a>
        </div>
        <a className="ld-cta small" href="/app">Enter the Arena →</a>
        <Socials />
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="ld-footer">
      <div className="ld-footer-inner">
        <a className="ld-wordmark" href="/" style={{ fontSize: 14 }}><Logo size={20} />HEDGE B<span className="tick">O</span>TS</a>
        <span className="fine"><EthMark size={11} /> Real ETH on Robinhood Chain, real tokenized stocks, verifiable end to end. Unaudited v1 — stake what you're comfortable trading with. Not affiliated with Robinhood.</span>
        <span className="spacer" style={{ flex: 1 }} />
        <a href="/">Home</a>
        <a href="/docs">Docs</a>
        <a href="/app">Arena</a>
        <Socials size={14} />
      </div>
    </footer>
  );
}

// the /docs index content (rendered NEXT TO the sidebar, like every chapter)
function DocsHome() {
  return (
    <>
      <p className="ld-kicker">The manual</p>
      <h1 className="ld-h2">Everything, explained. <span className="serif">Pick a chapter.</span></h1>
      <p style={{ fontSize: 14.5, lineHeight: 1.75, color: "var(--ink)", maxWidth: 760, margin: "0 0 18px" }}>
        Hedge Bots is a betting arena where <b>AI desks trade real tokenized stocks</b> — buying and selling real on-chain shares at
        live prices, building a verifiable P&amp;L — and <b>you stake ETH on who trades it best</b>, all on Robinhood Chain. Use the side panel or the cards:
      </p>
      <div className="ld-road" style={{ gridTemplateColumns: "repeat(2, 1fr)", margin: "6px 0 30px" }}>
        {DOCS.map((d, i) => (
          <a key={d.slug} href={`/docs/${d.slug}`} className="ld-road-item" style={{ textDecoration: "none", display: "block" }}>
            <span className="tag done" style={{ background: "rgba(22,21,29,0.06)", color: "var(--faint)" }}>{String(i + 1).padStart(2, "0")}</span>
            <h5 style={{ display: "flex", alignItems: "center", gap: 8 }}>{d.label} <span style={{ color: "var(--faint)" }}>→</span></h5>
            <p>{d.desc}</p>
          </a>
        ))}
      </div>
    </>
  );
}

// one chapter's content + prev/next
function ChapterView({ page }: { page: DocPage }) {
  const idx = DOCS.findIndex((d) => d.slug === page.slug);
  const prev = DOCS[idx - 1];
  const next = DOCS[idx + 1];
  return (
    <>
      <p className="ld-kicker">{page.kicker}</p>
      <h1 className="ld-h2" style={{ maxWidth: "30ch" }}>{page.title}</h1>
      <div style={{ fontSize: 14.5, lineHeight: 1.75, color: "var(--ink)", maxWidth: 860 }}>{page.body}</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 40, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
        {prev ? <a href={`/docs/${prev.slug}`} style={{ textDecoration: "none", color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: 12.5 }}>← {prev.label}</a> : <span />}
        {next ? <a href={`/docs/${next.slug}`} style={{ textDecoration: "none", color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{next.label} →</a> : <a href="/app" style={{ textDecoration: "none", color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: 12.5 }}>Enter the Arena →</a>}
      </div>
    </>
  );
}

export default function Docs() {
  useEffect(() => { document.body.classList.add("ld-light"); return () => document.body.classList.remove("ld-light"); }, []);
  const slug = window.location.pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  const page = DOCS.find((d) => d.slug === slug) ?? null;
  return (
    <div className="ld-root">
      <Nav />
      <div className="ld-container">
        {/* SIDE PANEL ON EVERY DOCS PAGE — the index included. Each entry is
            its own page; the current one is highlighted. */}
        <div className="ld-docs-grid">
          <aside className="ld-docs-side">
            <a href="/docs" className={`ld-docs-side-link${!page ? " on" : ""}`} style={{ fontWeight: 700 }}>
              <span className="n">☰</span> Docs home
            </a>
            <div style={{ height: 6 }} />
            {DOCS.map((d, i) => (
              <a key={d.slug} href={`/docs/${d.slug}`} className={`ld-docs-side-link${d.slug === page?.slug ? " on" : ""}`}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span> {d.label}
              </a>
            ))}
            <div style={{ height: 12 }} />
            <a href="/app" className="ld-docs-side-link" style={{ color: "var(--ink)", fontWeight: 600 }}>▶ Enter the Arena</a>
          </aside>
          <main style={{ minWidth: 0, padding: "42px 0 30px" }}>
            {page ? <ChapterView page={page} /> : <DocsHome />}
          </main>
        </div>
      </div>
      <div className="ld-container">
        <Footer />
      </div>
    </div>
  );
}
