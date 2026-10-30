// PostToolUse (Edit|Write): lint the file that was just changed and feed any
// errors back to Claude (exit 2) so they are fixed in the same turn.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const file = input.tool_input?.file_path ?? "";

if (!/\.(ts|tsx|mjs)$/.test(file) || !existsSync(file)) process.exit(0);
if (/[\\/](node_modules|\.next|\.shots)[\\/]/.test(file)) process.exit(0);

const r = spawnSync(`npx eslint --no-warn-ignored "${file}"`, {
  cwd: input.cwd ?? process.cwd(),
  encoding: "utf8",
  shell: true,
  timeout: 90_000,
});
if (r.status !== 0) {
  console.error(`eslint found problems in ${file}:\n${(r.stdout || "") + (r.stderr || "")}`.trim());
  process.exit(2);
}
