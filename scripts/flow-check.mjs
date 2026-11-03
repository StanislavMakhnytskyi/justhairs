// Read-only walk through the booking flow that reports runtime errors.
// It NEVER clicks "Confirm booking" or anything payment-related, so it creates
// no appointment and is safe against the shared live database.
//
//   npm run check:flow -- --base http://localhost:3001
//
// Fails (exit 1) on any uncaught page error, console error, or the error
// boundary's headings ("Something went wrong" / "That didn't go through").
import { chromium } from "@playwright/test";
import { baseUrl, bypassStorageState, clickUntil, parseArgs } from "./_pw.mjs";

const base = baseUrl(parseArgs());
const FORBIDDEN = /confirm booking|pay |pay$|complete payment/i;
const storageState = await bypassStorageState(base);
const browser = await chromium.launch();
const results = [];

async function scenario(name, fn) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ...(storageState ? { storageState } : {}),
  });
  // A cold dev server compiles each route on first hit; don't call that a failure.
  ctx.setDefaultTimeout(45_000);
  const page = await ctx.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on("console", (m) => {
    // next.config.ts ships a Report-Only CSP that includes upgrade-insecure-requests;
    // Chromium logs that this directive is ignored in report-only mode. Benign, and
    // present on every page, so it must not fail the check. Real CSP violations
    // ("[Report Only] Refused to ...") are still reported.
    if (/upgrade-insecure-requests.*ignored when delivered in a report-only/i.test(m.text())) return;
    if (m.type() === "error") problems.push(`console: ${m.text().slice(0, 200)}`);
  });
  try {
    await fn(page);
    const boundary = await page
      .getByRole("heading", { name: /Something went wrong|That didn.t go through/ })
      .count();
    if (boundary) problems.push("error boundary is showing");
  } catch (e) {
    problems.push(`step failed: ${String(e.message).split("\n")[0]}`);
  }
  results.push({ name, problems, url: page.url().replace(base, "") });
  await ctx.close();
}

/** Click anything except the buttons that would write to the database. */
async function safeClick(locator, until) {
  const text = await locator.innerText().catch(() => "");
  const aria = (await locator.getAttribute("aria-label").catch(() => "")) ?? "";
  if (FORBIDDEN.test(`${text} ${aria}`)) throw new Error(`refusing to click "${text.trim()}"`);
  if (until) await clickUntil(locator, until);
  else await locator.click();
}

const firstService = (p) => p.getByRole("button", { name: /€\d/ }).first();
const anySpecialist = (p) => p.getByRole("button", { name: "Any specialist" });
const dateStrip = (p) => p.getByRole("radiogroup", { name: "Choose a date" });
const timeGrid = (p) => p.getByRole("radiogroup", { name: "Choose a time" });

async function toDateStep(p, named) {
  await p.goto(`${base}/book`, { waitUntil: "networkidle" });
  await safeClick(firstService(p), anySpecialist(p).or(dateStrip(p)));
  if (await anySpecialist(p).isVisible().catch(() => false)) {
    const target = named ? anySpecialist(p).locator("xpath=following::button[1]") : anySpecialist(p);
    await safeClick(target, dateStrip(p));
  }
  await dateStrip(p).waitFor({ state: "visible", timeout: 5000 });
}

async function toReview(p, named) {
  await toDateStep(p, named);
  await dateStrip(p).getByRole("radio", { disabled: false }).first().click();
  await timeGrid(p).or(p.getByText(/Fully booked on/i)).waitFor({ state: "visible", timeout: 8000 });
  if (await timeGrid(p).isVisible()) {
    await timeGrid(p).getByRole("radio", { disabled: false }).first().click();
    // Reaching the button is the check; it is deliberately never clicked.
    await p.getByRole("button", { name: "Confirm booking" }).waitFor({ state: "visible", timeout: 5000 });
  }
}

await scenario("any specialist → review", (p) => toReview(p, false));
await scenario("named specialist → review", (p) => toReview(p, true));
await scenario("review → back through every step", async (p) => {
  await toReview(p, false);
  for (let i = 0; i < 3; i++) {
    await p.getByRole("button", { name: "Back", exact: true }).click();
    await p.waitForTimeout(700);
  }
});
await scenario("services → detail → stylist → date step", async (p) => {
  await p.goto(`${base}/services`, { waitUntil: "networkidle" });
  await safeClick(p.locator("a[href^='/services/']").first(), p.locator("a[href*='step=date']").first());
  await safeClick(p.locator("a[href*='step=date']").first(), dateStrip(p));
});
await scenario("unknown ?step= falls back", async (p) => {
  await p.goto(`${base}/book?step=banana`, { waitUntil: "networkidle" });
  await firstService(p).waitFor({ state: "visible", timeout: 5000 });
});

await browser.close();
let failed = 0;
for (const r of results) {
  const ok = r.problems.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${r.name}${ok ? "" : `  (${r.url})`}`);
  for (const p of r.problems) console.log(`        - ${p}`);
}
console.log(failed ? `\n${failed} scenario(s) failed against ${base}` : `\nAll scenarios passed against ${base}`);
process.exit(failed ? 1 : 0);
