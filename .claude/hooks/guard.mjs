// PreToolUse (Edit|Write): refuse edits the project has decided are off-limits.
// Exit code 2 blocks the tool call and shows the message to Claude.
import { readFileSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const ti = input.tool_input ?? {};
const abs = ti.file_path ?? "";
const rel = path.relative(input.cwd ?? process.cwd(), abs).split(path.sep).join("/");

function block(reason) {
  console.error(`Blocked by .claude/hooks/guard.mjs: ${reason}`);
  process.exit(2);
}

if (/^supabase\/migrations\/000[1-6]_/.test(rel)) {
  block(
    `${rel} is already applied to the live database. Add a new numbered migration instead (see .claude/rules/migrations.md).`,
  );
}
if (rel === "supabase/setup.sql") {
  block("supabase/setup.sql is generated from the migrations + seed — edit those, then run `npm run db:setup`.");
}
if (/(^|\/)\.env(\..+)?$/.test(rel) && !rel.endsWith(".env.example")) {
  block(`${rel} holds secrets. Edit .env.example and ask the user to update their local env.`);
}
if (rel === "src/lib/blur.generated.ts") {
  block("src/lib/blur.generated.ts is generated — run scripts/gen-blur.mjs instead of editing it.");
}
if (rel === "AGENTS.md") {
  block("AGENTS.md is rewritten by `next dev`. Put project guidance in CLAUDE.md instead.");
}

// Type-scale rule: components use the named steps (text-display, text-label, …),
// never a raw pixel size. Only *newly added* occurrences are refused, so the
// one documented exception (Logo's wordmark) keeps working.
if (/^src\/(components|app)\/.*\.tsx$/.test(rel)) {
  const added = ti.new_string ?? ti.content ?? "";
  const before = ti.old_string ?? "";
  const raw = /\btext-\[\d+(\.\d+)?px\]/g;
  const addedHits = added.match(raw) ?? [];
  const beforeHits = before.match(raw) ?? [];
  if (addedHits.length > beforeHits.length && !rel.endsWith("components/ui/Logo.tsx")) {
    block(
      `raw pixel text size (${addedHits[0]}) in ${rel}. Use a named step from the type scale in globals.css (text-hero/display/title/heading/subhead/body/label/caption).`,
    );
  }
}
