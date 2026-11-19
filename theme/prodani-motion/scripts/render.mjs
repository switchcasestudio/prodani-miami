// MP4s for every composition in every format -> out/<Comp>-<format>.mp4. Run only after the stills are approved.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ids = ["Transition", "LogoSting", "CakeI", "HeatAndEat"].flatMap((c) => ["9x16", "1x1", "16x9"].map((f) => `${c}-${f}`));
const only = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
for (const id of ids.filter((i) => !only.length || only.some((o) => i.startsWith(o)))) {
  const composition = await selectComposition({ serveUrl, id });
  const outputLocation = path.join(root, "out", `${id}.mp4`);
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation });
  console.log(`${id} -> ${outputLocation}`);
}
