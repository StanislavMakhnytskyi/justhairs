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
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(page).toHaveURL(/\/book\/pay\/[0-9a-f-]{36}/);
    appointmentId = appointmentIdFromUrl(page.url());
    expect(appointmentId).not.toBeNull();

    const stamp = Date.now();
    await page.getByLabel("Full name").fill("E2E Regression Test");
    await page.getByLabel("Email").fill(`e2e+${stamp}@justhairs.test`);
    await page.getByLabel("Phone").fill("+353 1 000 9999");

    await page.getByRole("button", { name: /pay after the service/i }).click();

    await expect(page).toHaveURL(/\/book\/confirmation\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { name: /you.re booked/i })).toBeVisible();
    await expect(page.getByText(/Confirmation code/i)).toBeVisible();
    await expect(page.getByText(/Pay after your visit/i)).toBeVisible();
  });
});
