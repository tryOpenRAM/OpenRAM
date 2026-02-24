import React, { useState, useEffect } from "react";
import { AgoraState, AgentRow, act, write } from "../lib/useAgora";
import { fmt, E, agentColor, STATUS_COLOR, shortAddr, AGENTS_API, getAddress, read } from "../lib/agora";
import { Meter } from "./charts";
import { AgentAvatar } from "./arena";

function useAction() {
  const [msg, setMsg] = useState<{ err: boolean; text: string } | null>(null);
  const run = async (fn: () => Promise<any>, okText: string) => {
    setMsg({ err: false, text: "signing…" });
    const err = await act(fn);
    setMsg(err ? { err: true, text: err } : { err: false, text: okText });
  };
  return { msg, run };
}

const Msg = ({ m }: { m: { err: boolean; text: string } | null }) =>
  m ? <span className={m.err ? "err" : "ok"}> {m.text}</span> : null;

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h3>{children}<span className="hbar" /></h3>
);

// ---------------------------------------------------------- Create an agent
const USER_STRATS = [
  { id: "balanced", label: "Balanced — solid bids, high quality" },
  { id: "undercut", label: "Undercutter — wins on price, riskier" },
  { id: "premium", label: "Premium — big jobs only, never fails" },
  { id: "memes", label: "Meme specialist — owns the creative niche" },
];

export function CreateAgent({ connected = true, onConnect }: { connected?: boolean; onConnect?: () => void }) {
  const [name, setName] = useState("");
  const [strat, setStrat] = useState("balanced");
  const [fund, setFund] = useState("600");
  const [msg, setMsg] = useState<{ err: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!connected) {
    return (
      <div className="card" style={{ borderColor: "rgba(109,40,217,0.35)", background: "linear-gradient(180deg, var(--violet-soft), var(--surface))" }}>
        <CardTitle>Create YOUR agent — it earns while you watch</CardTitle>
        <div className="row" style={{ alignItems: "center", gap: 14 }}>
          <button className="primary" onClick={onConnect}>Connect wallet to create an agent</button>
          <span className="mut" style={{ fontSize: 12 }}>Connect first — then name your agent, fund it with CYCLE, and it competes for you.</span>
        </div>
      </div>
    );
  }

  async function create() {
    setBusy(true);
    setMsg({ err: false, text: "creating your agent…" });
    try {
      const res = await fetch(`${AGENTS_API}/create`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name || "MyAgent", strategy: strat }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMsg({ err: false, text: "registering it on-chain (you pay the 100 CYCLE stake and become the owner)…" });
      const goal = `${USER_STRATS.find((u) => u.id === strat)?.label ?? strat} · created by ${shortAddr(getAddress())}`;
      let err = await act(() => write.registry.registerAgent(data.agentWallet, name || "MyAgent", goal, ""));
      if (err) throw new Error(err);

      const spend = Math.max(150, Number(fund) || 600) - 100; // stake already paid
      setMsg({ err: false, text: `sending it ${spend} CYCLE working capital (bonds + compute rent)…` });
      err = await act(() => write.cycle.transfer(data.agentWallet, E(spend)));
      if (err) throw new Error(err);

      setMsg({ err: false, text: "waiting for the swarm to wake it up…" });
      for (let i = 0; i < 20; i++) {
        const st = await (await fetch(`${AGENTS_API}/status?wallet=${data.agentWallet}`)).json();
        if (st.running) {
          setMsg({ err: false, text: `LIVE — agent #${st.agentId} is bidding in the arena right now. Watch for your YOURS badge below.` });
          setBusy(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      setMsg({ err: false, text: "registered — it will start bidding within a few seconds." });
    } catch (e: any) {
      setMsg({ err: true, text: String(e?.message ?? e).slice(0, 160) });
    }
    setBusy(false);
  }

  return (
    <div className="card" style={{ borderColor: "rgba(109,40,217,0.35)", background: "linear-gradient(180deg, var(--violet-soft), var(--surface))" }}>
      <CardTitle>Create YOUR agent — it earns while you watch</CardTitle>
      <div className="row" style={{ marginBottom: 8 }}>
        <input style={{ width: 150 }} placeholder="agent name" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />
        <select value={strat} onChange={(e) => setStrat(e.target.value)}>
          {USER_STRATS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
        <input style={{ width: 80 }} value={fund} onChange={(e) => setFund(e.target.value)} />
        <span className="mut">CYCLE budget</span>
        <button className="primary" disabled={busy} onClick={create}>Create agent</button>
        <Msg m={msg} />
      </div>
      <div className="mut" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
        Your CYCLE funds it: 100 goes in as its stake (you're the on-chain owner), the rest is its working capital for
        bid bonds and GPU rent. It bids, works and earns <b className="ink">into its own wallet</b> against the house agents —
        every win grows a bankroll you can see below. CYCLE is the demo token (not live yet) — this is the full loop, zero risk.
      </div>
    </div>
  );
}

// ------------------------------------------------------- My Agents dashboard
export function MyAgents({ s, onGlobal, connected = true, onConnect }: { s: AgoraState; onGlobal: () => void; connected?: boolean; onConnect?: () => void }) {
  const me = getAddress();
  // global rank for each agent id (by lifetime earnings)
  const rankOf = new Map<string, number>();
  [...s.agents].sort((a, b) => (b.earnings > a.earnings ? 1 : -1)).forEach((a, i) => rankOf.set(String(a.id), i + 1));
  const mine = s.agents.filter((a) => a.owner.toLowerCase() === me.toLowerCase());

  // each agent's own wallet CYCLE balance = its live bankroll
  const [bankrolls, setBankrolls] = useState<Record<string, bigint>>({});
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const out: Record<string, bigint> = {};
      for (const a of mine) {
        try { out[String(a.id)] = await read.cycle.balanceOf(a.wallet); } catch { /* skip */ }
      }
      if (alive) setBankrolls(out);
    };
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [mine.map((a) => String(a.id)).join(",")]);

  if (mine.length === 0) {
    return (
      <>
        <CreateAgent connected={connected} onConnect={onConnect} />
        <div className="card">
          <CardTitle>Your agents</CardTitle>
          <div className="emptystate">
            <span className="big">🤖</span>
            {connected
              ? "You don't own any agents yet. Create one above — name it, pick how it trades, fund it with CYCLE, and it starts competing against everyone else's agents for real bounties. Track it right here."
              : "Connect your wallet above to create an agent. Once it's live, its P&L shows up right here."}
          </div>
        </div>
      </>
    );
  }

  const totalEarned = mine.reduce((x, a) => x + a.earnings, 0n);
  const totalBankroll = mine.reduce((x, a) => x + (bankrolls[String(a.id)] ?? 0n), 0n);
  const totalDivs = mine.reduce((x, a) => x + a.myDividends, 0n);
  const bestRank = mine.reduce((r, a) => Math.min(r, rankOf.get(String(a.id)) ?? 999), 999);
  const totalDone = mine.reduce((x, a) => x + a.done, 0n);
  const totalFailed = mine.reduce((x, a) => x + a.failed, 0n);

  return (
    <>
      <div className="card" style={{ borderColor: "rgba(109,40,217,0.35)", background: "linear-gradient(180deg, var(--violet-soft), var(--surface))" }}>
        <CardTitle>Your agents — live P&amp;L</CardTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          <MiniStat label="Agents owned" value={String(mine.length)} />
          <MiniStat label="Total earned" value={fmt(totalEarned)} accent />
          <MiniStat label="Combined bankroll" value={fmt(totalBankroll)} accent />
          <MiniStat label="Best global rank" value={bestRank < 999 ? `#${bestRank}` : "—"} />
          <MiniStat label="Career record" value={`${totalDone}W · ${totalFailed}L`} />
        </div>
      </div>

      <div className="card">
        <CardTitle>Your roster ({mine.length}) — ranked against the whole arena</CardTitle>
        {[...mine].sort((a, b) => (b.earnings > a.earnings ? 1 : -1)).map((a) => {
          const rank = rankOf.get(String(a.id)) ?? 0;
          const bankroll = bankrolls[String(a.id)];
          const winRate = a.done + a.failed > 0n ? Number((a.done * 100n) / (a.done + a.failed)) : 0;
          return (
            <div key={String(a.id)} style={{
              display: "grid", gridTemplateColumns: "auto 1fr repeat(4, minmax(0,110px))", gap: 14,
              alignItems: "center", padding: "13px 8px", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{ fontFamily: "var(--font-serif, serif)", fontSize: 26, fontStyle: "italic", color: "var(--violet)", minWidth: 34, textAlign: "center" }}>
                  {rank ? `#${rank}` : "—"}
                </span>
                <AgentAvatar id={a.id} name={a.name} size={34} />
              </div>
              <div style={{ lineHeight: 1.3, minWidth: 0 }}>
                <span className="ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14.5 }}>{a.name}</span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", color: "#fff",
                  background: a.active ? "var(--good)" : "var(--critical)", borderRadius: 5, padding: "1.5px 7px", marginLeft: 8,
                }}>{a.active ? "COMPETING" : "RETIRED"}</span>
                <div className="mut" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.goal}
                </div>
              </div>
              <MiniCol label="Earned" value={fmt(a.earnings)} strong />
              <MiniCol label="Bankroll" value={bankroll !== undefined ? fmt(bankroll) : "…"} />
              <MiniCol label="Win rate" value={`${winRate}% (${a.done}/${a.done + a.failed})`} />
              <MiniCol label="Share price" value={fmt(a.sharePrice, 2)} />
            </div>
          );
        })}
        <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <button className="ghost" onClick={onGlobal}>See the full arena leaderboard →</button>
          <a href="/races" className="mut" style={{ fontSize: 12 }}>Want them racing real players for SOL? → /races</a>
        </div>
      </div>

      <CreateAgent connected={connected} onConnect={onConnect} />
    </>
  );
}

function MiniCol({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div className="mono" style={{ fontSize: 13.5, fontWeight: 600, color: strong ? "var(--accent)" : "var(--ink)" }}>{value}</div>
      <div className="mut" style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
    </div>
  );
}

// ------------------------------------------------------------- Leaderboard
export function Leaderboard({ s }: { s: AgoraState }) {
  const [open, setOpen] = useState<bigint | null>(null);
  const ranked = [...s.agents].sort((a, b) => (b.earnings > a.earnings ? 1 : -1));
  const maxEarn = ranked.reduce((m, a) => (a.earnings > m ? a.earnings : m), 1n);
  const me = getAddress();
  return (
    <div className="card">
      <CardTitle>Agent leaderboard — lifetime CYCLE earned</CardTitle>
      <table>
        <thead>
          <tr>
            <th style={{ width: 26 }}>#</th><th>Agent</th><th className="num">Rep</th>
            <th style={{ width: "18%" }}>Earnings</th>
            <th className="num">GPU spend</th><th className="num">Record</th>
            <th className="num">Shares</th><th className="num">Price</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((a, i) => (
            <React.Fragment key={String(a.id)}>
              <tr className="clickable" onClick={() => setOpen(open === a.id ? null : a.id)}>
                <td className="mut">{i + 1}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <AgentAvatar id={a.id} name={a.name} size={26} />
                    <div style={{ lineHeight: 1.25 }}>
                      <span className="ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{a.name}</span>
                      {a.owner === me && (
                        <span style={{
                          fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em",
                          color: "#fff", background: "var(--violet)", borderRadius: 5,
                          padding: "1.5px 7px", marginLeft: 7, verticalAlign: "middle",
                        }}>YOURS</span>
                      )}
                      {!a.active && <span className="err"> · retired</span>}
                      {a.parentId > 0n && <span className="mut" style={{ fontSize: 10.5 }}> · spawn of #{String(a.parentId)}</span>}
                      <div className="mut" style={{ fontSize: 10.5, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        "{a.goal}"
                      </div>
                    </div>
                  </div>
                </td>
                <td className="num">{String(a.reputation)}</td>
                <td>
                  <div className="ink num" style={{ textAlign: "left", marginBottom: 3 }}>{fmt(a.earnings)}</div>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                    <div style={{
                      height: "100%", borderRadius: 2, background: agentColor(a.id),
                      width: `${Number((a.earnings * 1000n) / maxEarn) / 10}%`,
                      transition: "width 600ms ease",
                    }} />
                  </div>
                </td>
                <td className="num">{fmt(a.computeSpend)}</td>
                <td className="num"><span className="wl-w">{String(a.done)}W</span> <span className="mut">·</span> <span className="wl-l">{String(a.failed)}L</span></td>
                <td className="num">{String(a.sharesSupply)}</td>
                <td className="num">{fmt(a.sharePrice, 2)}</td>
              </tr>
              {open === a.id && (
                <tr><td colSpan={8} style={{ padding: 0, border: "none" }}><AgentDetail a={a} /></td></tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {ranked.length === 0 && (
        <div className="emptystate"><span className="big">⬡</span>no agents registered yet — start the swarm: <b>npm run demo</b></div>
      )}
    </div>
  );
}

function AgentDetail({ a }: { a: AgentRow }) {
  const { msg, run } = useAction();
  return (
    <div className="detail">
      <div className="row" style={{ marginBottom: 10, fontSize: 12 }}>
        <span className="mut">wallet</span> <span className="mono ink">{shortAddr(a.wallet)}</span>
        <span className="mut">· this epoch</span> <span className="mono ink">{fmt(a.epochEarnings)} CYCLE</span>
        <span className="mut">· dividends paid to holders come from 10% of every task payout</span>
      </div>
      <div className="row">
        <button className="primary" onClick={() => run(() => write.shares.buyShares(a.id, 1), "share bought")}>
          Buy 1 share · {fmt((a.sharePrice * 1075n) / 1000n, 2)} CYCLE
        </button>
        <button className="ghost" disabled={a.myShares === 0n} onClick={() => run(() => write.shares.sellShares(a.id, 1), "share sold")}>
          Sell 1
        </button>
        <button className="ghost" disabled={a.myDividends === 0n} onClick={() => run(() => write.shares.claimDividends(a.id), "dividends claimed")}>
          Claim dividends · {fmt(a.myDividends, 2)}
        </button>
        <span className="mut mono">you hold {String(a.myShares)}</span>
        <Msg m={msg} />
      </div>
    </div>
  );
}

// -------------------------------------------------------------- Bounties
const TEMPLATES = [
  { label: "Prime sum — math", make: () => `PRIME_SUM:${2000 + Math.floor(Math.random() * 8000)}`, tags: "math" },
  { label: "Hash chain — crypto", make: () => `SHA_CHAIN:user-${Date.now() % 100000},${50 + Math.floor(Math.random() * 300)}`, tags: "crypto" },
  { label: "Monte-Carlo pi — sim", make: () => `MONTE_PI:${50000 + Math.floor(Math.random() * 150000)},${Date.now() % 999983}`, tags: "math,sim" },
  { label: "Matrix trace — heavy", make: () => `MATMUL_TRACE:${Date.now() % 999983},${24 + Math.floor(Math.random() * 24)}`, tags: "math,heavy" },
  { label: "Meme — creative", make: () => `MEME:${Date.now() % 999983}`, tags: "creative" },
];

export function TaskBoard({ s }: { s: AgoraState }) {
  const { msg, run } = useAction();
  const [tpl, setTpl] = useState(0);
  const [reward, setReward] = useState("120");
  const nameOf = (id: bigint) => s.agents.find((x) => x.id === id)?.name ?? "—";
  const now = Math.floor(Date.now() / 1000);

  return (
    <>
      <div className="card" style={{ borderColor: "rgba(52,211,153,0.2)" }}>
        <CardTitle>Drop a bounty — the swarm bids within ~20s</CardTitle>
        <div className="row">
          <select value={tpl} onChange={(e) => setTpl(Number(e.target.value))}>
            {TEMPLATES.map((t, i) => <option key={t.label} value={i}>{t.label}</option>)}
          </select>
          <input style={{ width: 90 }} value={reward} onChange={(e) => setReward(e.target.value)} />
          <span className="mut">CYCLE escrowed</span>
          <button
            className="primary"
            onClick={() => {
              const t = TEMPLATES[tpl];
              const r = Math.max(1, Number(reward) || 1);
              run(() => write.tasks.postTask(t.make(), t.tags, E(r), 20, 150), "bounty live — watch the feed");
            }}
          >
            Post bounty
          </button>
          <Msg m={msg} />
        </div>
      </div>

      <div className="card">
        <CardTitle>Bounty board — latest {s.tasks.length}</CardTitle>
        <table>
          <thead>
            <tr><th>#</th><th>Spec</th><th className="num">Reward</th><th>Status</th><th>Agent</th><th className="num">Winning bid</th></tr>
          </thead>
          <tbody>
            {s.tasks.map((t) => {
              const winPhase = t.status === "Open";
              const cd = winPhase ? t.biddingEnds - now : t.status === "Assigned" ? t.executionDeadline - now : 0;
              const cdMax = winPhase ? 20 : 150;
              return (
                <tr key={String(t.id)}>
                  <td className="mut">{String(t.id)}</td>
                  <td>
                    <span style={{ maxWidth: 280, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>{t.spec}</span>
                    {cd > 0 && (
                      <div className="progress" style={{ maxWidth: 280 }}>
                        <div style={{ width: `${Math.min(100, (cd / cdMax) * 100)}%`, background: winPhase ? "var(--s1)" : "var(--warning)" }} />
                      </div>
                    )}
                  </td>
                  <td className="num ink">{fmt(t.reward)}</td>
                  <td>
                    <span className="statuschip">
                      <span className="dot" style={{ background: STATUS_COLOR[t.status], boxShadow: `0 0 6px ${STATUS_COLOR[t.status]}66` }} />
                      {t.status}{cd > 0 ? ` · ${cd}s` : ""}
                    </span>
                  </td>
                  <td>
                    {t.assignedAgentId > 0n ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <AgentAvatar id={t.assignedAgentId} name={nameOf(t.assignedAgentId)} size={17} />
                        {nameOf(t.assignedAgentId)}
                      </span>
                    ) : <span className="mut">—</span>}
                  </td>
                  <td className="num">{t.winningBid > 0n ? fmt(t.winningBid) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {s.tasks.length === 0 && <div className="emptystate"><span className="big">◆</span>no bounties yet — post the first one above</div>}
      </div>
    </>
  );
}

// ----------------------------------------------------------------- Compute
export function ComputePanel({ s }: { s: AgoraState }) {
  return (
    <div className="card">
      <CardTitle>Raw compute — the DePIN pool agents rent from</CardTitle>
      {s.providers.map((p) => (
        <div key={String(p.id)} style={{
          marginBottom: 14, padding: "12px 14px", borderRadius: 12,
          background: "var(--surface-2)", border: "1px solid var(--border)",
        }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <span className="ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>▣ {p.name}</span>
              {p.region === "localhost" && (
                <span style={{
                  marginLeft: 8, fontSize: 9.5, fontFamily: "var(--font-mono)", letterSpacing: "0.1em",
                  color: "var(--accent)", border: "1px solid rgba(5,150,105,0.35)", background: "var(--accent-dim)",
                  borderRadius: 5, padding: "2px 7px", verticalAlign: "middle",
                }}>REAL HARDWARE</span>
              )}
              <span className="mut"> · {p.gpuModel} · {p.region}</span>
              {!p.active && <span className="err"> · SLASHED OUT</span>}
            </div>
            <div className="mut mono" style={{ fontSize: 11.5 }}>
              {fmt(p.pricePerUnitHour)}/unit-hr · earned <span className="ink">{fmt(p.totalEarned)}</span> · {p.completed} rentals{p.failed > 0 ? ` · ${p.failed} failed` : ""}
            </div>
          </div>
          <Meter fraction={(p.totalUnits - p.availableUnits) / p.totalUnits} label={`${p.totalUnits - p.availableUnits}/${p.totalUnits} units allocated`} />
        </div>
      ))}
      {s.providers.length === 0 && <div className="emptystate"><span className="big">▣</span>no rigs listed yet</div>}
      <div className="mut" style={{ fontSize: 11.5 }}>
        The <span className="ink">REAL HARDWARE</span> rig is this computer: rentals on it execute on actual worker
        threads — cores saturated, RAM held, GPU telemetry sampled — and the swarm console prints the measured burn.
        Providers stake CYCLE; failed allocations are slashed. Production adapters (Akash / io.net / Render) slot into the same interface.
      </div>
    </div>
  );
}

// --------------------------------------------------------------- Speculate
export function SpeculatePanel({ s }: { s: AgoraState }) {
  const { msg, run } = useAction();
  const [sel, setSel] = useState<Record<string, string>>({});
  const now = Math.floor(Date.now() / 1000);

  return (
    <>
      {s.markets.map((m) => {
        const live = !m.resolved && now < m.bettingEnds;
        const winnersSet = new Set(m.winners.map(String));
        const maxPool = m.candidates.reduce((x, c) => (c.pool > x ? c.pool : x), 1n);
        return (
          <div className="card" key={String(m.id)}>
            <CardTitle>
              Market #{String(m.id)} — top earner of epoch {String(m.epoch)}
              <span style={{ marginLeft: "auto", textTransform: "none", letterSpacing: 0 }} className="mono">
                {m.resolved ? (m.voided ? "VOIDED — refunds open" : "RESOLVED") : live ? `betting closes in ${m.bettingEnds - now}s` : "awaiting resolution"}
              </span>
            </CardTitle>
            {m.candidates.map((c) => {
              const w = Number((c.pool * 1000n) / maxPool) / 10;
              const isWinner = winnersSet.has(String(c.agentId));
              const color = agentColor(c.agentId);
              return (
                <div className="race-row" key={String(c.agentId)} style={{ gridTemplateColumns: "26px 130px 1fr 90px 70px" }}>
                  <AgentAvatar id={c.agentId} name={c.name} size={21} />
                  <span className="race-name">{isWinner ? "👑 " : ""}{c.name}</span>
                  <div className="race-track">
                    <div className="race-bar" style={{ width: `${Math.max(c.pool > 0n ? 2 : 0, w)}%`, background: color, boxShadow: `0 0 8px ${color}40` }} />
                  </div>
                  <span className="race-val">{fmt(c.pool)}</span>
                  <span className="race-odds">{c.myBet > 0n ? `you ${fmt(c.myBet)}` : ""}</span>
                </div>
              );
            })}
            <div className="row" style={{ marginTop: 12 }}>
              {live && (
                <>
                  <select value={sel[`c-${m.id}`] ?? "0"} onChange={(e) => setSel({ ...sel, [`c-${m.id}`]: e.target.value })}>
                    {m.candidates.map((c, i) => <option key={String(c.agentId)} value={i}>{c.name}</option>)}
                  </select>
                  <input style={{ width: 84 }} placeholder="50" value={sel[`a-${m.id}`] ?? ""} onChange={(e) => setSel({ ...sel, [`a-${m.id}`]: e.target.value })} />
                  <button
                    className="primary"
                    onClick={() => {
                      const idx = Number(sel[`c-${m.id}`] ?? 0);
                      const amt = Math.max(1, Number(sel[`a-${m.id}`]) || 50);
                      run(() => write.predict.bet(m.id, m.candidates[idx].agentId, E(amt)), "you're in — watch the race");
                    }}
                  >
                    Bet
                  </button>
                </>
              )}
              {!m.resolved && !live && (
                <button className="ghost" onClick={() => run(() => write.predict.resolve(m.id), "resolved from the earnings ledger")}>
                  Resolve on-chain
                </button>
              )}
              {m.resolved && !m.myClaimed && m.candidates.some((c) => c.myBet > 0n) && (
                <button className="primary" onClick={() => run(() => write.predict.claim(m.id), "payout claimed")}>Claim payout</button>
              )}
              <span className="mut" style={{ fontSize: 11.5 }}>
                pool <span className="ink mono">{fmt(m.totalPool)}</span> CYCLE · 3% rake to stakers · resolution reads the registry ledger, no oracle
              </span>
              <Msg m={msg} />
            </div>
          </div>
        );
      })}
      {s.markets.length === 0 && (
        <div className="card"><div className="emptystate"><span className="big">★</span>no open markets — one opens each epoch while the swarm runs</div></div>
      )}
    </>
  );
}

// ------------------------------------------------------------------- Stake
export function StakePanel({ s }: { s: AgoraState }) {
  const { msg, run } = useAction();
  const [amt, setAmt] = useState("1000");
  const share = s.stats.totalStaked > 0n ? Number((s.me.staked * 10000n) / s.stats.totalStaked) / 100 : 0;
  return (
    <div className="card">
      <CardTitle>Staking vault — where every fee in the economy lands</CardTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        <MiniStat label="Total staked" value={fmt(s.stats.totalStaked)} />
        <MiniStat label="Lifetime fees" value={fmt(s.stats.vaultFees, 2)} accent />
        <MiniStat label="Your stake" value={`${fmt(s.me.staked)} (${share}%)`} />
        <MiniStat label="Your claimable" value={fmt(s.me.pending, 4)} accent />
      </div>
      <div className="row">
        <input style={{ width: 110 }} value={amt} onChange={(e) => setAmt(e.target.value)} />
        <button className="primary" onClick={() => run(() => write.vault.stake(E(Math.max(1, Number(amt) || 1))), "staked — fees now stream to you")}>Stake</button>
        <button className="ghost" disabled={s.me.staked === 0n} onClick={() => run(() => write.vault.unstake(E(Math.max(1, Number(amt) || 1))), "unstaked")}>Unstake</button>
        <button className="ghost" disabled={s.me.pending === 0n} onClick={() => run(() => write.vault.claim(), "fees claimed")}>Claim</button>
        <Msg m={msg} />
      </div>
      <div className="mut" style={{ marginTop: 12, fontSize: 11.5, lineHeight: 1.7 }}>
        <span className="ink">Fee sources:</span> 5% of every task payout · 2.5% of compute rent · 2.5% of share trades · 3% prediction rake · 100% of slashed stakes and burned bonds.
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 13px" }}>
      <div className="mut" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 600, color: accent ? "var(--accent)" : "var(--ink)" }}>{value}</div>
    </div>
  );
}
