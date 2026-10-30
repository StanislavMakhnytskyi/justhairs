// SessionStart: a few lines of orientation. Whatever this prints is added to
// Claude's context.
import { spawnSync } from "node:child_process";
import net from "node:net";

const git = (...a) => spawnSync("git", a, { encoding: "utf8" }).stdout?.trim() ?? "";
const branch = git("rev-parse", "--abbrev-ref", "HEAD");
const dirty = git("status", "--porcelain").split("\n").filter(Boolean).length;

const port3000Busy = await new Promise((resolve) => {
  const s = net.connect({ port: 3000, host: "127.0.0.1" });
  s.once("connect", () => (s.destroy(), resolve(true)));
  s.once("error", () => resolve(false));
  s.setTimeout(500, () => (s.destroy(), resolve(false)));
});

console.log(
  [
    `justhairs · branch ${branch} · ${dirty} uncommitted file(s)`,
    port3000Busy
      ? "Port 3000 is in use (probably the user's dev server): start previews on the port preview_start reports and pass it to scripts via --base / PLAYWRIGHT_BASE_URL."
      : "Port 3000 is free.",
    "The Supabase project is SHARED/LIVE: never click 'Confirm booking', run test:e2e, seed-demo, sync-catalog or apply migrations without asking. See CLAUDE.md.",
  ].join("\n"),
);
