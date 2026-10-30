// Shared helpers for the dev scripts (shots.mjs, flow-check.mjs). Not a test.
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

/** `--name value` / `--flag` parsing, no dependency. */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[a.slice(2)] = true;
    else {
      out[a.slice(2)] = next;
      i++;
    }
  }
  return out;
}

/** --base, then PLAYWRIGHT_BASE_URL, then the dev server on :3000. */
export function baseUrl(args) {
  return String(args.base || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

/** Click, then wait for `until`; retry because a click right after goto() can
 *  land before React hydrates and is silently swallowed (see tests/support/slots.ts). */
export async function clickUntil(locator, until, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    await locator.click();
    try {
      await until.waitFor({ state: "visible", timeout: 2500 });
      return;
    } catch {
      if (i === attempts - 1) throw new Error("click had no visible effect after retries");
    }
  }
}
