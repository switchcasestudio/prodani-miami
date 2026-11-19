// One PNG per composition per format at its key frame (motion-tokens.json scenes.*.keyFrame)
// -> out/stills/<Comp>-<format>.png. Usage: npm run stills [-- Comp[@frame] ...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(fs.readFileSync(path.join(root, "src/motion-tokens.json"), "utf8"));
const COMPS = { Transition: "transition", LogoSting: "logoSting", CakeI: "cakeI", HeatAndEat: "heatAndEat" };
const FORMATS = ["9x16", "1x1", "16x9"];

// Optional filter, e.g. `HeatAndEat@130` renders that frame (all formats) to out/stills/test/.
const args = process.argv.slice(2);
const jobs = [];
for (const [comp, key] of Object.entries(COMPS)) {
  const hit = args.length ? args.find((a) => a.split("@")[0] === comp) : comp;
  if (!hit) continue;
  const at = hit.includes("@") ? Number(hit.split("@")[1]) : null;
  for (const fmt of FORMATS) jobs.push({ id: `${comp}-${fmt}`, frame: at ?? tokens.scenes[key].keyFrame, test: at !== null });
}

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
fs.mkdirSync(path.join(root, "out/stills/test"), { recursive: true });
for (const job of jobs) {
  const composition = await selectComposition({ serveUrl, id: job.id });
  const output = path.join(root, "out/stills", job.test ? `test/${job.id}@${job.frame}.png` : `${job.id}.png`);
  await renderStill({ composition, serveUrl, output, frame: job.frame });
  console.log(`${job.id} @${job.frame} -> ${output}`);
}
