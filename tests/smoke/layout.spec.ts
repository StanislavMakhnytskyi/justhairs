import { test, expect, type Page } from "@playwright/test";
import { getAnyServiceSlug } from "../support/catalog";

// Layout invariants of the booking frame (BookShell): every booking-side page
// shows the same `#main` card width at a given viewport, single-card pages are
// centred from lg up, and nothing scrolls horizontally. Read-only: no clicks
// that write, nothing reaches "Confirm booking".
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];
const LG = 1024; // Tailwind lg breakpoint
const UNKNOWN_APPOINTMENT = "00000000-0000-4000-8000-000000000000";

type Measure = { name: string; width: number; left: number; solo: boolean };

async function measure(
  page: Page,
  name: string,
  solo: boolean,
): Promise<Measure> {
  const card = page.locator("#main");
  await expect(card, `${name}: #main card`).toBeVisible();
  const box = await card.boundingBox();
  if (!box) throw new Error(`${name}: #main has no box`);
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    overflow.scrollWidth,
    `${name}: horizontal overflow`,
  ).toBeLessThanOrEqual(overflow.innerWidth);
  return { name, width: box.width, left: box.x, solo };
}

test.describe("layout invariants", () => {
  for (const vp of VIEWPORTS) {
    test(`booking card is one width and position at ${vp.width}x${vp.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      const slug = await getAnyServiceSlug();
      const dateStrip = page.getByRole("radiogroup", { name: "Choose a date" });
      const results: Measure[] = [];

      await page.goto("/book");
      await expect(
        page.getByRole("button", { name: /€\d/ }).first(),
      ).toBeVisible();
      results.push(await measure(page, "/book", false));

      // The specialist step: a single-stylist service skips it and lands on the
      // date step, which is still a valid booking-card page to measure.
      await page.goto(`/book?service=${slug}&step=specialist`);
      await expect(
        page.getByRole("button", { name: "Any specialist" }).or(dateStrip),
      ).toBeVisible();
      results.push(await measure(page, "specialist step", false));

      await page.goto(`/book?service=${slug}&staff=any&step=date`);
      await expect(dateStrip).toBeVisible();
      results.push(await measure(page, "date step", false));

      await page.goto("/services");
      await expect(page.getByRole("tab", { name: "Women" })).toBeVisible();
      results.push(await measure(page, "/services", true));

      await page.goto(`/book/pay/${UNKNOWN_APPOINTMENT}`);
      results.push(await measure(page, "/book/pay/<unknown>", true));

      const ref = results[0];
      for (const r of results) {
        expect(
          r.width,
          `${r.name} width vs ${ref.name}`,
        ).toBeGreaterThanOrEqual(ref.width - 1);
        expect(r.width, `${r.name} width vs ${ref.name}`).toBeLessThanOrEqual(
          ref.width + 1,
        );
        if (vp.width >= LG && r.solo) {
          expect(r.left, `${r.name} centred`).toBeGreaterThanOrEqual(
            (vp.width - r.width) / 2 - 1,
          );
          expect(r.left, `${r.name} centred`).toBeLessThanOrEqual(
            (vp.width - r.width) / 2 + 1,
          );
        }
      }
    });
  }
});
