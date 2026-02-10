import React, { useState } from "react";
import { AgoraState, act } from "../lib/useAgora";
import { agentColor, fmt, E, write } from "../lib/agora";

/** Deterministic agent identicon: series color, monogram, subtle depth. */
export function AgentAvatar({ id, name, size = 24 }: { id: bigint; name: string; size?: number }) {
  const color = agentColor(id);
  const letter = (name.replace(/[^a-zA-Z0-9]/g, "")[0] ?? "?").toUpperCase();
  return (
    <span
      className="avatar"
      style={{
        width: size, height: size, fontSize: size * 0.5,
        background: color,
        boxShadow: `0 2px ${size / 3}px ${color}55`,
        color: "#ffffff",
      }}
      title={name}
    >
      {letter}
    </span>
  );
}

/** SVG countdown ring for the current epoch. */
export function EpochRing({ epoch, endsAt, duration }: { epoch: bigint; endsAt: number; duration: number }) {
  const now = Math.floor(Date.now() / 1000);
  const left = Math.max(0, endsAt - now);
  const frac = Math.min(1, Math.max(0, left / duration));
  const R = 56, C = 2 * Math.PI * R;
  const mm = Math.floor(left / 60), ss = left % 60;
  return (
    <div className="ringwrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(22,21,29,0.09)" strokeWidth="6" />
        <circle
          cx="70" cy="70" r={R} fill="none"
          stroke="#059669" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 950ms linear", filter: "drop-shadow(0 1px 4px rgba(5,150,105,0.35))" }}
        />
        <text x="70" y="64" textAnchor="middle" fill="#16151d" fontSize="22" fontWeight="600" fontFamily="IBM Plex Mono, monospace">
          {mm}:{String(ss).padStart(2, "0")}
        </text>
        <text x="70" y="84" textAnchor="middle" fill="#8b8797" fontSize="10" letterSpacing="2" fontFamily="Space Grotesk, sans-serif">
          EPOCH {String(epoch)}
        </text>
      </svg>
      <span className="ringlabel">race resets</span>
    </div>
  );
}

/**
 * The earnings race: live positions this epoch, with parimutuel odds pulled
 * from the open prediction market. Direct labels everywhere (name + value)
 * per the dataviz relief rule for multi-hue bars.
 */
export function RaceBoard({ s, onBet }: { s: AgoraState; onBet: () => void }) {
  const [pick, setPick] = useState<string>("");
  const [amt, setAmt] = useState("50");
  const [msg, setMsg] = useState<string | null>(null);
  const race = [...s.agents]
    .sort((a, b) => (b.epochEarnings > a.epochEarnings ? 1 : b.epochEarnings === a.epochEarnings ? 0 : -1))
    .slice(0, 6);
  const max = race.reduce((m, a) => (a.epochEarnings > m ? a.epochEarnings : m), 0n);

  const liveMarket = s.markets.find((m) => m.epoch === s.epoch.number && !m.resolved);
  const oddsFor = (agentId: bigint): string => {
    if (!liveMarket || liveMarket.totalPool === 0n) return "";
    const pool = liveMarket.candidates.find((c) => c.agentId === agentId)?.pool ?? 0n;
    if (pool === 0n) return "";
    const mult = Number((liveMarket.totalPool * 100n) / pool) / 100;
    return `x${mult.toFixed(2)}`;
  };

  async function quickBet() {
    if (!liveMarket) return;
    const cand = liveMarket.candidates.find((c) => String(c.agentId) === (pick || String(liveMarket.candidates[0]?.agentId)));
    if (!cand) return;
    setMsg("signing…");
    const err = await act(() => write.predict.bet(liveMarket.id, cand.agentId, E(Math.max(1, Number(amt) || 50))));
    setMsg(err ?? `bet placed on ${cand.name} - odds shift as money moves`);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <div>
          <h2>Epoch {String(s.epoch.number)} earnings race</h2>
          <span className="sub">
            top earner takes the prediction pool
            {liveMarket ? ` · ${fmt(liveMarket.totalPool)} CYCLE riding` : ""}
            {" · bets in CYCLE (demo token — not live yet)"}
          </span>
        </div>
        <div className="spacer" />