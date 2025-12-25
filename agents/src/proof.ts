import { execSync } from "node:child_process";
import { detectHardware, sampleGpu, HostCompute } from "./lib/hardware";

/**
 * PROOF that the compute is real. Samples Windows' own CPU load counter
 * before and during a burn, so the numbers come from the OS - not from us.
 *   npx tsx src/proof.ts
 * (Watch Task Manager > Performance > CPU at the same time.)
 */
function systemCpuLoad(): number {
  try {
    const out = execSync(
      'powershell -NoProfile -Command "(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average"',
      { timeout: 8000 }
    ).toString().trim();
    return Math.round(Number(out));
  } catch {
    return -1;
  }
}

async function main() {
  const hw = detectHardware();
  console.log("\n=== AGORA compute proof ===");
  console.log(`machine   ${hw.hostname}`);
  console.log(`cpu       ${hw.cpuModel} (${hw.cores} threads)`);
  console.log(`gpu       ${hw.gpuName}${hw.hasNvidiaSmi ? " [nvidia-smi live]" : ""}`);
  console.log(`ram       ${hw.ramGB} GB\n`);

  const before = systemCpuLoad();
  const gpuBefore = sampleGpu();
  console.log(`OS-reported CPU load BEFORE burn: ${before}%`);
  if (gpuBefore) console.log(`GPU before: ${gpuBefore.utilPct}% util, ${gpuBefore.memMB}MB VRAM in use`);

  const host = new HostCompute(Math.max(2, hw.cores - 2));
  console.log(`\nburning: ${host.maxThreads} worker threads, 8 seconds of dense matmul, 32MB RAM each...`);

  // sample the OS counter WHILE the burn runs
  const midSamples: number[] = [];
  const sampler = setInterval(() => {
    const v = systemCpuLoad();
    if (v >= 0) { midSamples.push(v); console.log(`  OS-reported CPU load DURING burn: ${v}%`); }
  }, 2500);

  const report = await host.burn(host.maxThreads, 8000);
  clearInterval(sampler);

  const after = systemCpuLoad();
  console.log(`\nOS-reported CPU load AFTER burn: ${after}%`);
  console.log("\n=== measured by the workers themselves ===");
  console.log(`threads        ${report.threads}`);
  console.log(`wall time      ${(report.wallMs / 1000).toFixed(1)}s`);
  console.log(`CPU-seconds    ${report.cpuSecondsTotal.toFixed(1)}`);
  console.log(`work done      ${report.gflopsTotal.toFixed(1)} GFLOP (real float math, checksummed)`);
  console.log(`RAM held       ${report.ramMBHeld}MB (pages touched)`);
  const peak = Math.max(before, ...midSamples);
  console.log(`\nverdict: OS counter went ${before}% -> ${peak}% while the burn ran.`);
  console.log("what this is NOT: the GPU computing. It is detected + telemetered (real name, real VRAM),");
  console.log("but kernels need CUDA/vast.ai - that is the NEXT step and it does need your key.\n");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
