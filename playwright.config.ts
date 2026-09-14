import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// KNOWN ISSUE (CODE_REVIEW.md #23): this is the ONLY test coverage in the
// repo — no unit/integration tests exist anywhere. The booking engine's
// actual business rules (slot generation, the double-booking check, Zod
// validation edges) have no test that runs without a live deployment and a
// live Supabase project.
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
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  timeout: 45_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
