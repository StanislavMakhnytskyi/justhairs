import { test, expect } from "@playwright/test";
import { bookFirstAvailableService } from "../support/slots";

// Regression cover for the clickable-StepTabs + deterministic-goBack work.
// Neither test reaches "Confirm booking", so nothing is written to the DB —
// no cleanup needed.
test.describe("booking flow — step navigation", () => {
  test("clicking a completed step tab jumps back and clears later choices", async ({
    page,
  }) => {
    await bookFirstAvailableService(page);
    await expect(page).toHaveURL(/step=review/);

    await page.getByRole("button", { name: "Back to Service" }).click();

    await expect(page).toHaveURL(/step=service/);
    await expect(page).not.toHaveURL(/[?&]time=/);
    await expect(page.getByRole("button", { name: "Confirm booking" })).not.toBeVisible();
  });

  test("the back button walks the flow to home, one step at a time", async ({
    page,
  }) => {
    await bookFirstAvailableService(page);
    await expect(page).toHaveURL(/step=review/);

    const back = page.getByRole("button", { name: "Back", exact: true });

    await back.click();
    await expect(page).not.toHaveURL(/step=review/);
    // Confirms this genuinely stepped back rather than jumping straight home.
    expect(new URL(page.url()).pathname).toBe("/book");

    // Keep stepping back until home, waiting for each URL change to actually
    // land before clicking again — clicking back-to-back with no wait can
    // fire the second click while the first navigation is still in flight.
    for (let i = 0; i < 5 && new URL(page.url()).pathname !== "/"; i++) {
      const before = page.url();
      if (!(await back.isVisible().catch(() => false))) break;
      await back.click();
      await expect(page).not.toHaveURL(before);
    }

    await expect(page).toHaveURL(/\/$/);
  });
});
