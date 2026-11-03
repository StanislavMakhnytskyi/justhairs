import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { execFileSync } from "node:child_process";

// CODE_REVIEW.md #23 (partly fixed): this is the browser coverage only. The
// booking engine and schema are tested offline by `npm run test:db`, and pure
// logic by `npm run test:unit`; this suite needs a live deployment.
//
// Regression tests target a real deployed site (prod by default, a Vercel
// preview when PW_TARGET=preview) — never localhost, so there's nothing to
// build/serve here. TEST_PROD_URL / TEST_PREVIEW_URL live in .env.local
// (gitignored, same as every other secret in this repo).
loadEnv({ path: ".env.local" });

// CI sets PLAYWRIGHT_BASE_URL directly to the URL of the deployment that just
// went live (see .github/workflows/regression.yml) — that always wins. Local
// runs pick TEST_PROD_URL / TEST_PREVIEW_URL from .env.local via PW_TARGET.
const target = process.env.PW_TARGET === "preview" ? "TEST_PREVIEW_URL" : "TEST_PROD_URL";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env[target];

if (!baseURL) {
  throw new Error(
    `Set ${target} in .env.local before running the regression tests (see .env.example).`,
  );
}

// Vercel Authentication ("Protection Bypass for Automation"). When
// VERCEL_AUTOMATION_BYPASS_SECRET is set we trade it, once, for the `_vercel_jwt`
// bypass cookie and hand that to every browser context/request fixture as
// storageState. `use.extraHTTPHeaders` is deliberately NOT used: it is attached to
// every request a page makes, so the secret would also be sent to Stripe, map
// tiles and any other third-party origin. A cookie is host-scoped by the browser,
// so it only ever goes to the preview's own host. The fetch runs in a child
// process because this config is loaded synchronously (CommonJS, no top-level await).
function vercelBypassStorageState(url: string) {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return undefined;
  const origin = new URL(url);
  const script = `
    (async () => {
      const res = await fetch(process.env.PW_BYPASS_URL, {
        redirect: "manual",
        headers: {
          "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          "x-vercel-set-bypass-cookie": "true",
        },
      });
      process.stdout.write(JSON.stringify(res.headers.getSetCookie()));
    })().catch((e) => { process.stderr.write(String(e && e.message)); process.exit(1); });
  `;
  let setCookies: string[] = [];
  try {
    setCookies = JSON.parse(
      execFileSync(process.execPath, ["-e", script], {
        env: { ...process.env, PW_BYPASS_URL: origin.origin + "/" },
        encoding: "utf8",
        timeout: 60_000,
      }),
    );
  } catch {
    throw new Error("Could not request the Vercel protection-bypass cookie from the preview.");
  }
  const jwt = setCookies.find((c) => c.startsWith("_vercel_jwt="));
  if (!jwt) {
    // Wrong secret, or the deployment is not protected: carry on without a cookie.
    return undefined;
  }
  return {
    cookies: [
      {
        name: "_vercel_jwt",
        value: jwt.split(";")[0].slice("_vercel_jwt=".length),
        domain: origin.hostname,
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: origin.protocol === "https:",
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
}

const bypassState = vercelBypassStorageState(baseURL);

export default defineConfig({
  testDir: "./tests",
  // tests/db are node:test files that run against an in-memory Postgres (npm run test:db).
  testIgnore: "**/db/**",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // One worker in CI: parallel tests hammer a cold preview + shared Supabase.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    // A stalled click or navigation fails loudly instead of eating the whole
    // 60s test budget.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ...(bypassState ? { storageState: bypassState } : {}),
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Phone emulation (390px wide) for the read-only smoke suite only. tests/e2e
    // (live bookings) stays on the desktop project above.
    {
      name: "mobile",
      testMatch: "**/smoke/**/*.spec.ts",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
