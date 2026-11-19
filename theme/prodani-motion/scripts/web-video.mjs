#!/usr/bin/env node
// Web versions of one composition for the theme: MP4 (H.264, faststart) + a poster
// still as WebP and JPG, all at SIZE px, written to theme/prodani/assets/<name>.*
// usage: node scripts/web-video.mjs <CompositionId> <posterFrame> <name> [size=720]
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [id, frameArg, name, sizeArg] = process.argv.slice(2);
if (!id || !frameArg || !name) { console.error("usage: web-video.mjs <CompositionId> <posterFrame> <name> [size]"); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.resolve(root, "../prodani/assets");
const tmp = path.join(root, "out/web");
fs.mkdirSync(tmp, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id });
const scale = Number(sizeArg || 720) / composition.width;

const out = (ext) => path.join(assets, `${name}.${ext}`);
// MP4 only: Shopify's CDN serves .webm as audio/webm (nosniff), which browsers may refuse as video.
const rawMp4 = path.join(tmp, `${name}.raw.mp4`);
await renderMedia({ composition, serveUrl, codec: "h264", crf: 26, scale, outputLocation: rawMp4, muted: true, x264Preset: "slow" });
// moov atom first, so the browser can start playing before the whole file arrives
execFileSync("npx", ["remotion", "ffmpeg", "-v", "error", "-y", "-i", rawMp4, "-c", "copy", "-movflags", "+faststart", out("mp4")], { cwd: root });
await renderStill({ composition, serveUrl, frame: Number(frameArg), scale, imageFormat: "webp", output: out("webp") });
await renderStill({ composition, serveUrl, frame: Number(frameArg), scale, imageFormat: "jpeg", jpegQuality: 82, output: out("jpg") });

for (const ext of ["mp4", "webp", "jpg"]) console.log(`${name}.${ext}  ${(fs.statSync(out(ext)).size / 1024).toFixed(0)} KB`);
