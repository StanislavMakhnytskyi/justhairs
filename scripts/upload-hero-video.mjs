// Uploads the optimised hero background video to the public Supabase Storage
// "assets" bucket as hero.mp4 and hero.webm (the paths src/lib/assets.ts expects).
//
//   node --env-file=.env.local scripts/upload-hero-video.mjs <hero.mp4> <hero.webm>
//
// Needs SUPABASE_SERVICE_ROLE_KEY. Publishing is public and CDN-cached, so check
// the files first. Then set NEXT_PUBLIC_HERO_VIDEO=1 to switch the hero over.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const MAX_BYTES = 2 * 1024 * 1024;
const TARGETS = {
  ".mp4": { path: "hero.mp4", contentType: "video/mp4" },
  ".webm": { path: "hero.webm", contentType: "video/webm" },
};

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: upload-hero-video.mjs <hero.mp4> <hero.webm>");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

for (const file of files) {
  const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
  const target = TARGETS[ext];
  if (!target) {
    console.error(`${basename(file)}: only .mp4 and .webm are supported.`);
    process.exit(1);
  }
  const { size } = statSync(file);
  if (size > MAX_BYTES) {
    console.error(`${basename(file)}: ${(size / 1024 / 1024).toFixed(2)} MB is over the 2 MB budget.`);
    process.exit(1);
  }

  const { error } = await supabase.storage
    .from("assets")
    .upload(target.path, readFileSync(file), {
      contentType: target.contentType,
      cacheControl: "31536000",
      upsert: true,
    });
  if (error) {
    console.error(`${target.path}: ${error.message}`);
    process.exit(1);
  }
  console.log(`Uploaded ${target.path} (${(size / 1024).toFixed(0)} KB)`);
}
