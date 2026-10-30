// Stop: if TypeScript files changed, make sure the project still typechecks
// before Claude declares the work done. Blocks stopping once with the errors;
// `stop_hook_active` stops it from looping if the errors can't be fixed.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
if (input.stop_hook_active) process.exit(0);

const cwd = input.cwd ?? process.cwd();
const status = spawnSync("git", ["status", "--porcelain"], { cwd, encoding: "utf8" });
const touchedTs = (status.stdout ?? "")
  .split("\n")
  .some((l) => /\.(ts|tsx)\s*$/.test(l) && !l.includes("next-env.d.ts"));
if (!touchedTs) process.exit(0);

const r = spawnSync("npx tsc --noEmit", { cwd, encoding: "utf8", shell: true, timeout: 180_000 });
if (r.status !== 0) {
  const out = ((r.stdout || "") + (r.stderr || "")).split("\n").slice(0, 40).join("\n");
  console.error(`tsc --noEmit fails — fix before finishing:\n${out}`);
  process.exit(2);
}
