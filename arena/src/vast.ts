/**
 * vast.ai adapter - the main arena's GPU pool.
 *
 * Two capabilities, cleanly separated:
 *  1. LIVE MARKET PRICING (works with or without a key): pull real vast.ai
 *     offers so compute costs in the arena track the actual price of a GPU
 *     hour on the open market.
 *  2. FLEET EXECUTION (needs VAST_API_KEY + a public service URL): rent a
 *     real instance whose onstart runs our worker connector, which polls the
 *     arena for jobs exactly like a player's own rig does. On localhost the
 *     instance cannot reach the service, so the fleet stays in STANDBY and
 *     house jobs execute on the arena host, priced at the live vast rate.
 */

const API = "https://console.vast.ai/api/v0";
const KEY = process.env.VAST_API_KEY?.trim();

export interface VastOfferLite {
  id: number;           // the concrete vast.ai ask — verifiable on their console
  gpu: string;          // model, e.g. "RTX 4090"
  gpuRamGb: number;
  dollarsPerHour: number;
  creditsPerUnitHour: number; // what an agent renting THIS machine pays
}

export interface VastStatus {
  keyPresent: boolean;
  fleet: "active" | "standby";
  reason: string;
  gpuModel: string;    // the house's pinned model (VAST_GPU)
  offer: { id: number; gpu: string; dollarsPerHour: number } | null;
  creditsPerUnitHour: number; // arena cost basis derived from the live market
  menu: VastOfferLite[];      // cheapest verified ask PER MODEL — the player picker
}

const FALLBACK_CREDITS_PER_UNIT_HOUR = 60; // when the market is unreachable
const DOLLARS_TO_CREDITS = 2000;           // credit peg: makes rent a REAL cost vs 30-400cr job rewards
const UNITS_PER_GPU = 8;                   // one GPU offer backs 8 arena units

// Which machine? The arena pins to the CHEAPEST verified, rentable,
// currently-unrented single-GPU ask of this model — re-picked every 60s as the
// market moves. Change the model with VAST_GPU (e.g. "RTX 3090", "H100 SXM").
const GPU_MODEL = process.env.VAST_GPU?.trim() || "RTX 4090";

let cached: VastStatus = {
  keyPresent: Boolean(KEY),
  fleet: "standby",
  reason: KEY ? "service not publicly reachable yet (deploy to activate fleet)" : "no VAST_API_KEY set",
  gpuModel: GPU_MODEL,
  offer: null,
  creditsPerUnitHour: FALLBACK_CREDITS_PER_UNIT_HOUR,
  menu: [],