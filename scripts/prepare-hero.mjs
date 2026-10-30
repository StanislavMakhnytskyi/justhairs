// Turns a stock clip into the hero's three assets, all from the SAME frames so
// the still shown while the video loads is exactly the video's first frame
// (no flash when the video takes over):
//
//   hero-<v>.mp4          H.264, silent, 720p            (<= 2 MB)
//   hero-<v>.webm         VP9,   silent, 720p            (<= 2 MB)
//   hero-<v>-poster.webp  frame 0 of the encoded mp4     (<= 150 KB)
//
//   node scripts/prepare-hero.mjs <clip.mp4> --start 0 --duration 7 --version 2 [--loop pingpong|none]
//
// --loop pingpong (default) plays the segment forward then in reverse, so a
// one-way camera move (slider, pan) loops with no visible seam. Use `none` for
// footage that already loops.
//
// ffmpeg: $FFMPEG, else the `ffmpeg-static` package if resolvable, else PATH.
// Output goes to --out (default .hero-build/, gitignored). Upload afterwards
// with scripts/upload-hero-video.mjs.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "./_pw.mjs";

const args = parseArgs();
const input = process.argv.slice(2).find((a) => !a.startsWith("--") && a.endsWith(".mp4") && a !== args.out);
if (!input) {
  console.error("Usage: prepare-hero.mjs <clip.mp4> --start S --duration D --version N [--loop pingpong|none] [--out dir]");
  process.exit(1);
}
const start = Number(args.start ?? 0);
const duration = Number(args.duration ?? 7);
const version = String(args.version ?? 2);
const loop = String(args.loop ?? "pingpong");
const fps = Number(args.fps ?? 24);
const width = Number(args.width ?? 1280);
const out = path.resolve(String(args.out ?? ".hero-build"));
const MAX_VIDEO = 2 * 1024 * 1024;
const MAX_POSTER = 150 * 1024;

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    return createRequire(import.meta.url)("ffmpeg-static");
  } catch {
    return "ffmpeg";
  }
}
const ffmpeg = findFfmpeg();

function run(label, argv) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...argv], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`${label} failed:\n${r.stderr || r.error}`);
    process.exit(1);
  }
}

const n = Math.round(duration * fps);
// One filter graph feeds both encoders, so mp4, webm and poster share frames.
const base =
  `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS,fps=${fps},` +
  `scale=${width}:-2:flags=lanczos,format=yuv420p,trim=end_frame=${n},setpts=PTS-STARTPTS`;
const graph =
  loop === "pingpong"
    ? // Drop the duplicated turning frames so there is no hitch at either end.
      `${base},split[f][g];[g]reverse,trim=start_frame=1:end_frame=${n - 1},setpts=PTS-STARTPTS[r];` +
      `[f][r]concat=n=2:v=1:a=0[v]`
    : `${base}[v]`;

mkdirSync(out, { recursive: true });
const mp4 = path.join(out, `hero-${version}.mp4`);
const webm = path.join(out, `hero-${version}.webm`);
const poster = path.join(out, `hero-${version}-poster.webp`);
const tags = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"];

run("mp4", [
  "-i", input, "-filter_complex", graph, "-map", "[v]", "-an",
  "-c:v", "libx264", "-preset", "slow", "-crf", String(args.crf ?? 23), "-pix_fmt", "yuv420p", ...tags,
  "-movflags", "+faststart", mp4,
]);
run("webm", [
  "-i", input, "-filter_complex", graph, "-map", "[v]", "-an",
  "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(args.vp9crf ?? 32), "-row-mt", "1", "-pix_fmt", "yuv420p", ...tags,
  webm,
]);
// The poster is decoded from the ENCODED mp4, so it matches what the browser will show.
run("poster", ["-i", mp4, "-frames:v", "1", "-c:v", "libwebp", "-quality", String(args.q ?? 85), poster]);

let failed = false;
for (const [file, max] of [[mp4, MAX_VIDEO], [webm, MAX_VIDEO], [poster, MAX_POSTER]]) {
  const { size } = statSync(file);
  const ok = size <= max;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "OVER"} ${path.basename(file)}  ${(size / 1024).toFixed(0)} KB (limit ${(max / 1024).toFixed(0)} KB)`);
}
console.log(`${Math.round(duration * fps * (loop === "pingpong" ? 2 : 1))} frames, ${loop} loop, ${path.relative(process.cwd(), out)}/`);
if (failed) {
  console.error("A file is over budget: raise --crf / --vp9crf, shorten --duration, or lower --width.");
  process.exit(1);
}
