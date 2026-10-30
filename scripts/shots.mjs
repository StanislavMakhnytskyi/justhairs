// Screenshot matrix for design review: routes x widths x themes (+ optional
// reduced motion). Read-only — it only loads pages, never submits anything.
//
//   npm run shots -- --base http://localhost:3001
//   npm run shots -- --routes "home book services/mens-beard" --widths 390,1440 --themes light
//     (routes may omit the leading slash; "home" = "/". Git Bash rewrites a bare "/" argument.)
//   npm run shots -- --reduced          (emulate prefers-reduced-motion)
//
// Output: .shots/<theme>/<width>/<route>.png  (gitignored). Prints the paths.
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { baseUrl, parseArgs } from "./_pw.mjs";

const args = parseArgs();
const base = baseUrl(args);
const widths = String(args.widths || "390,768,1024,1440,1920").split(",").map(Number);
const themes = String(args.themes || "light,dark").split(",");
const out = path.resolve(String(args.out || ".shots"));
const heightFor = (w) => (w < 768 ? 844 : 900);

const browser = await chromium.launch();

// Derive a real service slug so the detail/booking routes work on any catalog.
const probe = await browser.newPage();
await probe.goto(`${base}/services`, { waitUntil: "networkidle" });
const href = await probe.locator("a[href^='/services/']").first().getAttribute("href");
await probe.close();
const slug = href?.split("/").pop()?.split("?")[0] ?? "mens-beard";
const future = new Date(Date.now() + 3 * 864e5);
future.setUTCHours(10, 0, 0, 0);
const day = future.toISOString().slice(0, 10);

const routes = args.routes
  ? String(args.routes)
      .split(/[ ,]+/)
      .filter(Boolean)
      .map((r) => (r === "home" || r === "/" ? "/" : r.startsWith("/") ? r : `/${r}`))
  : [
      "/",
      "/services",
      `/services/${slug}`,
      "/book",
      `/book?service=${slug}&step=specialist`,
      `/book?service=${slug}&staff=any&step=date`,
      // Review renders from the URL alone — no booking is created.
      `/book?service=${slug}&staff=any&date=${day}&time=${encodeURIComponent(future.toISOString())}&step=review`,
    ];

/** Scroll through the page so scroll-reveal content is shown, then back to top. */
async function settle(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = page.viewportSize().height;
  for (let y = 0; y < h; y += vh * 0.8) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);
}

await rm(out, { recursive: true, force: true });
const written = [];
for (const theme of themes) {
  for (const width of widths) {
    const ctx = await browser.newContext({
      viewport: { width, height: heightFor(width) },
      colorScheme: theme,
      reducedMotion: args.reduced ? "reduce" : "no-preference",
    });
    const page = await ctx.newPage();
    for (const route of routes) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      await settle(page);
      const name = route === "/" ? "home" : route.replace(/[/?=&%:]+/g, "_").replace(/^_/, "");
      const file = path.join(out, theme, String(width), `${name}.png`);
      await mkdir(path.dirname(file), { recursive: true });
      await page.screenshot({ path: file, fullPage: true });
      written.push(file);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(written.join("\n"));
console.log(`\n${written.length} screenshots in ${out}`);
