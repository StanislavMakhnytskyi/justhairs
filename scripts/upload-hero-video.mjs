// Publishes the hero media built by scripts/prepare-hero.mjs to the public
// Supabase Storage "assets" bucket, under VERSIONED names:
//
//   hero-<v>.mp4   hero-<v>.webm   hero-<v>-poster.webp
//
//   node --env-file=.env.local scripts/upload-hero-video.mjs --version 2 [--dir .hero-build] [--dry-run]
//
// The bucket is public and CDN-cached for a year, so existing objects are never
// overwritten (upsert is off): a new clip means a new version number, plus
// HERO_VERSION in src/lib/assets.ts. Uploading changes nothing on the live site
// until code that references the new version is deployed. Needs
// SUPABASE_SERVICE_ROLE_KEY. Then run scripts/gen-blur.mjs so the poster has its
// blur placeholder, and set NEXT_PUBLIC_HERO_VIDEO=1 to play the video.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "./_pw.mjs";

const args = parseArgs();
const version = args.version;
if (!version || version === true) {
  console.error("Usage: upload-hero-video.mjs --version N [--dir .hero-build] [--dry-run]");
  process.exit(1);
}
const dir = path.resolve(String(args.dir ?? ".hero-build"));
const dryRun = Boolean(args["dry-run"]);

const MB = 1024 * 1024;
const FILES = [
  { name: `hero-${version}.mp4`, contentType: "video/mp4", max: 2 * MB },
  { name: `hero-${version}.webm`, contentType: "video/webm", max: 2 * MB },
  { name: `hero-${version}-poster.webp`, contentType: "image/webp", max: 150 * 1024 },
];

for (const f of FILES) {
  let size;
  try {
    size = statSync(path.join(dir, f.name)).size;
  } catch {
    console.error(`${f.name}: not found in ${dir} (run scripts/prepare-hero.mjs first).`);
    process.exit(1);
  }
  if (size > f.max) {
    console.error(`${f.name}: ${(size / 1024).toFixed(0)} KB is over the ${(f.max / 1024).toFixed(0)} KB budget.`);
    process.exit(1);
  }
  f.size = size;
}

if (dryRun) {
  for (const f of FILES) console.log(`would upload ${f.name}  ${(f.size / 1024).toFixed(0)} KB  (${f.contentType})`);
  console.log("dry run: nothing was uploaded.");
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

for (const f of FILES) {
  const { error } = await supabase.storage.from("assets").upload(f.name, readFileSync(path.join(dir, f.name)), {
    contentType: f.contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error(`${f.name}: ${error.message}${/exists/i.test(error.message) ? " — bump --version instead of overwriting." : ""}`);
    process.exit(1);
  }
  console.log(`Uploaded ${f.name} (${(f.size / 1024).toFixed(0)} KB)`);
}
