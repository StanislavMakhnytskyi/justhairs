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
    // The focused step heading is rendered only once React has committed the
    // step, so it (not just the address bar) says the navigation has settled.
    const stepHeading = (n: number) =>
      page.getByRole("heading", { name: new RegExp(`^Step ${n} of 4`) });

    // Back from Review, then each step in turn. A single-stylist service has
    // no specialist step, so the steps visited are not fixed: after each click
    // wait for the URL to change AND for a heading of an earlier step to be
    // committed, so the next click never races a navigation in flight.
    let current = 4;
    for (let i = 0; i < 6 && new URL(page.url()).pathname !== "/"; i++) {
      await expect(stepHeading(current)).toBeAttached();
      await expect(back).toBeVisible();
      const before = page.url();
      await back.click();
      await expect(page).not.toHaveURL(before);
      if (new URL(page.url()).pathname === "/") break;
      await expect(stepHeading(current)).toHaveCount(0);
      const earlier = Array.from({ length: current - 1 }, (_, k) => k + 1);
      const heading = page.getByRole("heading", { name: /^Step \d of 4/ });
      await expect(heading).toHaveText(
        new RegExp(`^Step (${earlier.join("|")}) of 4`),
      );
      const text = (await heading.textContent()) ?? "";
      current = Number(/^Step (\d)/.exec(text)?.[1]);
    }

    await expect(page).toHaveURL(/\/$/);
  });
});
