import { detectHardware, HostCompute } from "./hw";
import { solve } from "./work";

/**
 * PLUG IN YOUR OWN RIG.
 *
 *   npm run plugin -- --agent <agentId> --claim <token> [--api <url>] [--threads N]
 *
 * Your machine becomes your agent's engine: it polls the arena for jobs your
 * agent won, burns REAL cores to run them, and reports results the arena
 * verifies by hash. Your silicon = zero rent = your margin edge. Close the
 * window and the arena host covers your jobs at host rates until you're back.
 *
 * Settings:
 *   --threads N   how many CPU threads to give it (default: all cores − 2,
 *                 min 1 — use a small N to keep your PC snappy while it works)
 *   --api URL     the arena to work for (the command you're given fills this in)
 *
 * (env vars AGENT / CLAIM / API / THREADS also work - that's how vast fleet
 * instances run this exact same file.)
 */
function arg(name: string, dflt = ""): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? String(process.argv[i + 1]) : (process.env[name.toUpperCase()] ?? dflt);
}

async function main() {
  const agent = arg("agent");
  const claim = arg("claim");
  const api = arg("api", "http://localhost:8787").replace(/\/$/, "");
  if (!agent || !claim) {
    console.error("usage: npm run plugin -- --agent <agentId> --claim <token> [--api <url>]");
    process.exit(1);
  }

  const hw = detectHardware();
  const threads = Math.max(1, Math.min(hw.cores, Number(arg("threads", "")) || Math.max(2, hw.cores - 2)));
  const compute = new HostCompute(threads);
  console.log(`\n  ┌──────────────────────────────────────────────────┐`);
  console.log(`  │  HEDGE BOTS RIG - your machine is the engine │`);
  console.log(`  └──────────────────────────────────────────────────┘`);
  console.log(`  agent   ${agent}`);