import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getAnyServiceSlug } from "../support/catalog";

// Accessibility smoke: axe-core on the public pages and the booking steps, in
// light and dark. Fails on serious/critical violations only. Read-only.
// The app picks its theme from prefers-color-scheme (ThemeScript sets
// <html data-theme>), so emulating the colour scheme exercises both themes.

// KNOWN ISSUES, excluded narrowly (everything else on the page is still scanned
// by every rule). Remove each entry when its cause is fixed; see the report in
// the PR that added this file.
//  - logo link: aria-label "justhairs home" does not contain the visible text,
//    which is "j" (badge) + "justhairs" -> label-content-name-mismatch (WCAG 2.5.3).
//  - #reviews and the menu-sheet price pill: white text at opacity-70/80 and
//    white/10 glass on the brand violet is 2.8-4.1:1 (< 4.5:1) -> color-contrast.
const KNOWN_ISSUES = ['a[aria-label="justhairs home"]'];
const KNOWN_ISSUES_HOME = ["#reviews", "p.backdrop-blur-md"];

async function scan(page: Page, extraExclude: string[] = []) {
  const builder = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
  ]);
  for (const sel of [...KNOWN_ISSUES, ...extraExclude]) builder.exclude(sel);
  const { violations } = await builder.analyze();
  const bad = violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const summary = bad.map(
    (v) =>
      `${v.id} [${v.impact}] ${v.help}\n` +
      v.nodes
        .slice(0, 5)
        .map(
          (n) =>
            `    ${n.target.join(" ")} ${(n.html ?? "").slice(0, 160)}  ${n.failureSummary?.split("\n")[1] ?? ""}`,
        )
        .join("\n"),
  );
  expect(summary, "serious/critical axe violations").toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`a11y (${scheme})`, () => {
    // Reduced motion: no entrance/transition mid-states, so contrast is measured
    // on the settled colours (otherwise a fading element reads as low contrast).
    test.use({ colorScheme: scheme, reducedMotion: "reduce" });

    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    test("home", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("main, #main").first()).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
      await scan(page, KNOWN_ISSUES_HOME);
    });

    test("services", async ({ page }) => {
      await page.goto("/services");
      await expect(page.getByRole("tab", { name: "Women" })).toBeVisible();
      await scan(page);
    });

    test("book: service step", async ({ page }) => {
      await page.goto("/book");
      await expect(
        page.getByRole("button", { name: /€\d/ }).first(),
      ).toBeVisible();
      await scan(page);
    });

    test("book: specialist and date steps", async ({ page }) => {
      const slug = await getAnyServiceSlug();
      const dateStrip = page.getByRole("radiogroup", { name: "Choose a date" });

      await page.goto(`/book?service=${slug}&step=specialist`);
      await expect(
        page.getByRole("button", { name: "Any specialist" }).or(dateStrip),
      ).toBeVisible();
      await scan(page);

      await page.goto(`/book?service=${slug}&staff=any&step=date`);
      await expect(dateStrip).toBeVisible();
      await scan(page);
    });
  });
}
