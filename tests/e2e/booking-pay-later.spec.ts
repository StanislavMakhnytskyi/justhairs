import { test, expect } from "@playwright/test";
import { bookFirstAvailableService, appointmentIdFromUrl } from "../support/slots";
import { deleteTestAppointment } from "../support/cleanup";

test.describe("guest booking — pay after the service", () => {
  let appointmentId: string | null = null;

  test.afterEach(async () => {
    await deleteTestAppointment(appointmentId);
    appointmentId = null;
  });

  test("confirm -> guest details -> pay later -> confirmation", async ({ page }) => {
    await bookFirstAvailableService(page);
    // Confirm creates the appointment, so it is clicked once: the review step
    // was reached by client navigation, so the page is already hydrated.
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(page).toHaveURL(/\/book\/pay\/[0-9a-f-]{36}/, { timeout: 30_000 });
    appointmentId = appointmentIdFromUrl(page.url());
    expect(appointmentId).not.toBeNull();

    // The form prefills from sessionStorage in a post-hydration effect that
    // can overwrite an early fill, so fill and re-check until the value holds.
    const stamp = Date.now();
    const fields: [string, string][] = [
      ["Full name", "E2E Regression Test"],
      ["Email", `e2e+${stamp}@justhairs.test`],
      ["Phone", "+353 1 000 9999"],
    ];
    for (const [label, value] of fields) {
      const field = page.getByLabel(label);
      await expect(async () => {
        await field.fill(value);
        await expect(field).toHaveValue(value, { timeout: 1_000 });
      }).toPass({ timeout: 10_000 });
    }

    // Three chained server actions follow (guest, method, confirmation); give
    // them a real budget rather than the whole test timeout. The pay page was
    // reached by client navigation (already hydrated), and the fields above
    // only held a value once its handlers were live, so one click suffices.
    await page.getByRole("button", { name: /pay after the service/i }).click();

    await expect(page).toHaveURL(/\/book\/confirmation\/[0-9a-f-]{36}/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /you.re booked/i })).toBeVisible();
    await expect(page.getByText("Confirmation code", { exact: true })).toBeVisible();
    await expect(page.getByText(/Pay after your visit/i)).toBeVisible();
  });
});
