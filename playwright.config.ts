import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

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
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
