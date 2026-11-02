import { test, expect, type Locator } from "@playwright/test";

// Click the first service and wait for the next step. A service click is a
// router.push (dynamic RSC round trip: slow on a cold preview), and the first
// click can land before hydration, so retry — but idempotently: if the next
// step is already showing, never click again.
async function advanceFromServices(firstService: Locator, next: Locator) {
  await expect(async () => {
    if (await next.isVisible()) return;
    await firstService.click({ timeout: 5_000 });
    await expect(next).toBeVisible({ timeout: 8_000 });
  }).toPass({ timeout: 40_000, intervals: [500, 1_000, 2_000] });
}

// Read-only UI smoke checks for the booking-critical paths. Nothing here
// reaches "Confirm booking", so no appointment is created and no cleanup is
// needed — safe to run against production or a PR preview.
test.describe("booking UI", () => {
  test("the flow reaches the date step and picking a day shows a usable time grid", async ({
    page,
  }) => {
    await page.goto("/book");

    const firstService = page.getByRole("button", { name: /€\d/ }).first();
    const anySpecialist = page.getByRole("button", { name: "Any specialist" });
    const dateStrip = page.getByRole("radiogroup", { name: "Choose a date" });

    await advanceFromServices(firstService, anySpecialist.or(dateStrip));

    if (await anySpecialist.isVisible().catch(() => false)) {
      await anySpecialist.click();
    }

    await expect(dateStrip).toBeVisible();
    const enabledDay = dateStrip.getByRole("radio", { disabled: false }).first();
    await expect(enabledDay).toBeVisible();
    await enabledDay.click();

    // Either a grid with at least one bookable slot, or the explicit
    // "Fully booked" hint — never a grid where every slot is disabled.
    const slotGrid = page.getByRole("radiogroup", { name: "Choose a time" });
    const fullyBooked = page.getByText(/Fully booked on/i);
    await expect(slotGrid.or(fullyBooked)).toBeVisible();
    if (await slotGrid.isVisible().catch(() => false)) {
      await expect(slotGrid.getByRole("radio", { disabled: false }).first()).toBeVisible();
    }
  });

  test("choosing a named specialist lands on a working date step, not an error page", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/book");
    const firstService = page.getByRole("button", { name: /€\d/ }).first();
    const specialistList = page.getByRole("heading", { name: "Book appointment" });
    const dateStrip = page.getByRole("radiogroup", { name: "Choose a date" });
    const anySpecialist = page.getByRole("button", { name: "Any specialist" });

    await advanceFromServices(firstService, anySpecialist.or(dateStrip));

    // A single-stylist service skips this step; otherwise pick a named stylist
    // (the row right after "Any specialist").
    if (await anySpecialist.isVisible().catch(() => false)) {
      await anySpecialist.locator("xpath=following::button[1]").click();
    }

    await expect(dateStrip).toBeVisible();
    await expect(page.getByRole("heading", { name: "Something went wrong" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "That didn’t go through" })).toHaveCount(0);
    await expect(specialistList).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("an unknown ?step= falls back to the first step that needs a choice", async ({ page }) => {
    await page.goto("/book?step=banana");
    await expect(page.getByRole("button", { name: /€\d/ }).first()).toBeVisible();
  });

  test("a stylist card opens the services list filtered to that stylist", async ({ page }) => {
    await page.goto("/masters");

    const card = page.locator('a[href^="/services?staff="]').first();
    await expect(card).toBeVisible();
    await card.click();

    await expect(page).toHaveURL(/\/services\?.*staff=/);
    await expect(page.getByText(/Showing services with/i)).toBeVisible();
  });

  test("the Men/Women tab is driven by the URL and survives a reload", async ({ page }) => {
    await page.goto("/services");

    const women = page.getByRole("tab", { name: "Women" });
    await expect(async () => {
      if (/category=women/.test(page.url())) return;
      await women.click({ timeout: 5_000 });
      await expect(page).toHaveURL(/category=women/, { timeout: 8_000 });
    }).toPass({ timeout: 40_000, intervals: [500, 1_000, 2_000] });

    await page.reload();
    await expect(page.getByRole("tab", { name: "Women" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
