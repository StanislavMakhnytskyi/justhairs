import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Click `target`, then wait for `until` to appear. Retries the click a few
 * times if it doesn't: a click right after page.goto() can land before React
 * finishes hydrating and attaches the handler, so the very first tap on a
 * freshly-loaded page is silently swallowed. Every other click in the flow is
 * on an already-hydrated page and would only ever need one attempt.
 */
async function clickUntil(target: Locator, until: Locator, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    await target.click();
    try {
      await expect(until).toBeVisible({ timeout: 2_000 });
      return;
    } catch {
      if (i === attempts - 1) throw new Error("click had no visible effect after retries");
    }
  }
}

/**
 * Drive the booking flow from /book through to the Review step, picking the
 * first listed service, "Any specialist" (or the only stylist), and the
 * earliest open time — using whichever open day/time the live catalog
 * actually has, never a hardcoded slot. Falls back to a "Next available"
 * chip if the first day tried turns out fully booked (reuses the app's own
 * empty-day feature instead of guessing).
 */
export async function bookFirstAvailableService(page: Page) {
  await page.goto("/book");

  // Step 0 — service. Rows show a EUR price ("€25"), which nothing else on
  // this step does, so it's a reliable way to pick "the first service" without
  // depending on styling hooks. Landing screen after this is either the
  // specialist step or (single-stylist services) straight to date & time.
  const firstService = page.getByRole("button", { name: /€\d/ }).first();
  await clickUntil(
    firstService,
    page
      .getByRole("button", { name: "Any specialist" })
      .or(page.getByRole("radiogroup", { name: "Choose a date" })),
  );

  // Step 1 — specialist (skipped automatically if only one stylist offers the
  // service, in which case we're already on step 2).
  const anySpecialist = page.getByRole("button", { name: "Any specialist" });
  const dateStrip = page.getByRole("radiogroup", { name: "Choose a date" });
  if (await anySpecialist.isVisible().catch(() => false)) {
    await clickUntil(anySpecialist, dateStrip);
  }

  // Step 2 — date. Pick the first enabled day in the strip.
  await expect(dateStrip).toBeVisible();
  const enabledDay = dateStrip.getByRole("radio", { disabled: false }).first();
  const fullyBooked = page.getByText(/Fully booked on/i);
  const slotGrid = page.getByRole("radiogroup", { name: "Choose a time" });
  await clickUntil(enabledDay, fullyBooked.or(slotGrid));

  if (await fullyBooked.isVisible().catch(() => false)) {
    // That day was full — jump straight to Review via a "next available" chip.
    const chip = page.getByRole("group", { name: "Next available" }).getByRole("button").first();
    await clickUntil(chip, page.getByRole("button", { name: "Confirm booking" }));
  } else {
    await expect(slotGrid).toBeVisible();
    const enabledSlot = slotGrid.getByRole("radio", { disabled: false }).first();
    await clickUntil(enabledSlot, page.getByRole("button", { name: "Confirm booking" }));
  }

  // Step 3 — review.
  await expect(page.getByRole("button", { name: "Confirm booking" })).toBeVisible();
}

/** Read the appointment id out of a /book/pay/[id] or /book/confirmation/[id] URL. */
export function appointmentIdFromUrl(url: string): string | null {
  const match = url.match(/\/book\/(?:pay|confirmation)\/([0-9a-f-]{36})/i);
  return match?.[1] ?? null;
}
