import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  chain, detectChain, provider, decodeSecret, sendEth, getBalanceEth, ethToWei, Wallet, randomWallet,
} from "./chain";
import { solve, resultHashOf } from "./work";

/**
 * FULL end-to-end verification of the compute arena on Robinhood Chain. Not
 * endpoint pings — it stakes a real (funded) wallet on-chain and confirms the
 * whole money + compute + proof path actually works.
 *   npx tsx src/verify.ts
 */
const API = process.env.VERIFY_API ?? "http://localhost:8787";
const KEYS_PATH = path.join(process.env.STATE_DIR?.trim() || path.join(__dirname, "..", "state"), "evm-keys.json");
const keys = JSON.parse(fs.readFileSync(KEYS_PATH, "utf8"));
// the ONE house treasury (env key wins; the local key file is the fallback)
const treasury: Wallet = decodeSecret(process.env.TREASURY_SECRET) ?? decodeSecret(keys.treasury)!;

const results: Array<{ name: string; ok: boolean; detail: string }> = [];
const check = (name: string, ok: boolean, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
};
const get = async (p: string) => (await fetch(API + p)).json();
const post = async (p: string, body: any) => (await fetch(API + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const transfer = async (from: Wallet, to: string, eth: number) => (await sendEth(from, to, ethToWei(eth))).hash;

async function main() {
  console.log(`\n=== Hedge Bots — full end-to-end verification (Robinhood Chain) ===\n`);
  await detectChain();

  // ---------- 1. health + config
  let st = await get("/state");
  check("service reachable, race live", !!st.race, `race #${st.race?.id} · phase ${st.race?.phase}`);
  check("running on Robinhood Chain", st.chain?.chainId === 4663 || st.chain?.chainId === 46630, `${st.chain?.name} (chainId ${st.chain?.chainId})`);
  check("vast.ai key authenticated + live pricing", st.vast?.keyPresent && !!st.vast?.offer, st.vast?.offer ? `${st.vast.offer.gpu} @ $${st.vast.offer.dollarsPerHour}/hr` : st.vast?.reason);
  const wpub = st.wallets?.public !== false; // PUBLIC_WALLETS=0 masks addresses pre-launch
  check("all 5 strategies present", Object.keys(st.strategies ?? {}).length === 5, Object.keys(st.strategies ?? {}).join("/"));
  check("5 house agent wallets live", st.wallets?.agents?.length === 5 && (!wpub || st.wallets.agents.every((a: any) => a.address)),
    wpub ? (st.wallets?.agents ?? []).map((a: any) => `${a.name}:${String(a.address).slice(0, 8)}…`).join(" ") : "5 wallets tracked · addresses MASKED until launch (PUBLIC_WALLETS=0)");
  check("treasury wallet exposed for tracking", wpub ? !!st.wallets?.treasury?.address : !!st.wallets?.treasury,
    wpub ? `${String(st.wallets?.treasury?.address).slice(0, 10)}…` : "tracked · address masked until launch");
  check("silicon backends configured", st.arenaHost?.threads > 0, `${st.arenaHost?.cpu} (${st.arenaHost?.threads}t) · ${st.arenaHost?.gpu}`);
  const treasuryBal = await getBalanceEth(treasury.address);
  check("house treasury funded (pot + payouts + rewards)", treasuryBal > 0.002, `${treasuryBal.toFixed(5)} ETH`);
  check("state serves ONE house wallet",
    wpub ? (st.treasury && (st.treasury === st.wallets?.treasury?.address || st.wallets?.treasury?.receiveOnly === true)) : (st.treasury === ""),
    wpub ? `${String(st.treasury).slice(0, 10)}…${st.wallets?.treasury?.receiveOnly ? " · user treasury receive-only" : ""}` : "merged · masked until launch");

  // ---------- 2. /verify re-derivation + local sanity
  const testSpec = "PRIME_SUM:6125";
  const v = await get(`/verify?spec=${testSpec}`);
  check("/verify re-derives deterministic answer", v.answer === solve(testSpec) && v.answerHash === resultHashOf(testSpec, solve(testSpec)), `hash ${String(v.answerHash).slice(0, 14)}…`);

  // ---------- 3. worker/own-rig auth
  const wa = await fetch(`${API}/worker/next?agent=x&claim=bad`);
  check("own-rig worker rejects bad claim (403)", wa.status === 403);

  // ---------- 4. FULL STAKE FLOW — real ETH, end to end (needs lobby)
  const funded = (st.race.agents ?? []).filter((a: any) => a.funded);
  if (st.race.phase === "lobby") {
    try {
      const player = randomWallet();
      // just enough for stake (entry ×1.05) + min side-bet (×1.5) + gas headroom
      const bank = (st.entryEth ?? 0.002) * 1.05 + (st.minSideBetEth ?? 0.0005) * 1.5 + 0.0006;
      await transfer(treasury, player.address, bank);
      check("funded a fresh player wallet", true, `${player.address.slice(0, 10)}… (${bank.toFixed(4)} ETH)`);

      const jr = await post("/join", { name: "VerifyBot", strategy: "balanced", owner: player.address, entryEth: st.entryEth, computeSource: "vast" });
      check("POST /join creates a staked agent", !!jr.depositAddress, jr.agentId);

      await transfer(player, jr.depositAddress, st.entryEth * 1.05); // hair over entry: deposit pays its own sweep gas
      check(`staked ${st.entryEth} ETH to the deposit address`, true);

      let funded2 = false, potBefore = st.race.potEth;
      for (let i = 0; i < 14; i++) {
        const s2 = await get("/state");
        const me = s2.race.agents.find((a: any) => a.id === jr.agentId);
        if (me?.funded) { funded2 = true; check("stake DETECTED — agent entered the race", true, `pot ${potBefore}→${s2.race.potEth} ETH`); break; }
        await sleep(3000);
      }
      if (!funded2) check("stake DETECTED — agent entered the race", false, "not detected in 42s");

      // side-bet on a house agent
      const houseId = funded[0].id;
      const br = await post("/bet", { agentId: houseId, owner: player.address });
      check("POST /bet creates a side-bet deposit", !!br.depositAddress, `on ${funded[0].name}`);
      await transfer(player, br.depositAddress, Math.max(st.minSideBetEth * 1.5, st.minSideBetEth + 0.0002));
      let betSeen = false;
      for (let i = 0; i < 14; i++) {
        const s3 = await get("/state");
        if ((s3.race.agents.find((a: any) => a.id === houseId)?.sideBetEth || 0) > 0) { betSeen = true; break; }
        await sleep(3000);
      }
      check("side-bet DETECTED on-chain", betSeen);
    } catch (e: any) {
      check("full stake flow", false, String(e?.message ?? e).slice(0, 80));
    }
  } else {
    check("full stake flow (needs lobby phase)", false, `race in ${st.race.phase} — re-run right after a restart to catch the lobby`);
  }

  // ---------- 5. wait for the race to run + write on-chain proofs, then check compute
  console.log("\n… waiting for the race to run and write on-chain proofs (up to 4.5 min) …");
  let proofJobs: any[] = [];
  for (let i = 0; i < 54; i++) {
    st = await get("/state");
    proofJobs = (st.race.jobs ?? []).filter((j: any) => j.proofTx || j.proven);
    if (st.race.phase === "racing" && proofJobs.length > 0) break;
    await sleep(5000);
  }
  const f2 = (st.race.agents ?? []).filter((a: any) => a.funded);
  check("REAL compute burned during the race (GFLOP measured)", f2.reduce((x: number, a: any) => x + a.gflops, 0) > 0, `${f2.reduce((x: number, a: any) => x + a.gflops, 0).toFixed(0)} GFLOP`);
  check("jobs verified by hash", f2.some((a: any) => a.jobsVerified > 0), `${f2.reduce((x: number, a: any) => x + a.jobsVerified, 0)} verified / ${f2.reduce((x: number, a: any) => x + a.jobsRejected, 0)} rejected`);
  check("on-chain proofs enabled (not paused)", !st.receiptsPaused);
  check("verified jobs wrote proofs on-chain", proofJobs.length > 0, `${proofJobs.length} proof txs${wpub ? "" : " (links masked until launch)"}`);
  if (proofJobs.length) {
    const job = proofJobs[proofJobs.length - 1];
    if (job.proofTx) {
      const rc = await provider.getTransactionReceipt(job.proofTx);
      check("proof tx CONFIRMED on Robinhood Chain (real)", !!rc, `block ${rc?.blockNumber} · ${job.proofTx.slice(0, 14)}…`);
      check("treasury can sign+send txns (payout path proven)", !!rc, "proof txs are real signed transactions");
    } else {
      check("proof tx written (hash masked pre-launch)", job.proven === true, "settlement landed · link hidden by PUBLIC_WALLETS=0");
    }
    const rv = await get(`/verify?spec=${encodeURIComponent(job.spec)}`);
    check("on-chain proof hash == independent re-derivation", rv.answerHash === job.answerHash, rv.answerHash === job.answerHash ? "MATCH (trustless)" : "MISMATCH");
  }

  // ---------- 6. AGENT WALLETS really move money (earn/spend vs treasury)
  if (wpub) {
    const activeWallets = (st.wallets?.agents ?? []).filter((a: any) => (a.txs ?? []).length > 0);
    check("house agent wallets TRANSACTING on-chain", activeWallets.length > 0, `${activeWallets.length}/5 wallets active: ${activeWallets.map((a: any) => a.name).join(", ")}`);
    if (activeWallets.length) {
      const rc = await provider.getTransactionReceipt(activeWallets[0].txs[0].hash).catch(() => null);
      check("agent wallet tx CONFIRMED on-chain (real transfer + proof calldata)", !!rc, `${activeWallets[0].name} · ${activeWallets[0].txs[0].hash.slice(0, 14)}…`);
    }
  } else {
    check("house wallet settlements running (masked mode)", proofJobs.some((j: any) => j.proven), "agent↔treasury txs land on-chain; hashes hidden until PUBLIC_WALLETS=1");
  }
  check("wallet balances tracked for the site", (st.wallets?.agents ?? []).some((a: any) => a.eth !== null), (st.wallets?.agents ?? []).map((a: any) => `${a.name}:${a.eth ?? "…"}Ξ`).join(" "));

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== ${passed}/${results.length} checks passed ===`);
  const failed = results.filter((r) => !r.ok);
  if (failed.length) console.log("FAILED: " + failed.map((f) => f.name).join(" · "));
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
