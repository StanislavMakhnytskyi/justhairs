import { test, expect } from "@playwright/test";
import { bookFirstAvailableService, appointmentIdFromUrl } from "../support/slots";
import { deleteTestAppointment } from "../support/cleanup";

// This is the one test in the suite most likely to need updating if Stripe
// changes their hosted Checkout page markup — everything before and after it
// is our own UI. Accessible *names* (role + name) are used throughout rather
// than placeholders, which are just formatting hints ("1234 1234 1234 1234")
// and did change once already while writing this test.
test.describe("guest booking — pay now via Stripe test mode", () => {
  test.slow();
  let appointmentId: string | null = null;

  test.afterEach(async () => {
    await deleteTestAppointment(appointmentId);
    appointmentId = null;
  });

  test("confirm -> guest details -> Stripe Checkout (test card) -> paid", async ({
    page,
  }) => {
    await bookFirstAvailableService(page);
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(page).toHaveURL(/\/book\/pay\/[0-9a-f-]{36}/);
    appointmentId = appointmentIdFromUrl(page.url());
    expect(appointmentId).not.toBeNull();

    const stamp = Date.now();
    await page.getByLabel("Full name").fill("E2E Regression Test");
    await page.getByLabel("Email").fill(`e2e+${stamp}@justhairs.test`);
    await page.getByLabel("Phone").fill("+353 1 000 9999");

    const payNow = page.getByRole("button", { name: /Pay .* now/i });
    if (!(await payNow.isVisible().catch(() => false))) {
      test.skip(true, "STRIPE_SECRET_KEY isn't set on this deployment — nothing to test.");
    }
    await payNow.click();

    // Full navigation to Stripe's hosted Checkout page.
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });

    // Adaptive Pricing can show a currency picker based on geo-IP — pin it to
    // EUR so the amount/flow is the same regardless of where this runs from.
    const eurOption = page.getByRole("button", { name: /€/ }).first();
    const eurClickable =
      (await eurOption.isVisible().catch(() => false)) &&
      (await eurOption.isEnabled().catch(() => false));
    if (eurClickable) {
      await eurOption.click();
    }

    // The very first interaction with Stripe's freshly-loaded page — under
    // load this can land before its JS has finished mounting the field, so a
    // fill() silently no-ops. Verify it actually took and retry if not.
    const email = page.getByRole("textbox", { name: "Email" });
    if (await email.isVisible().catch(() => false)) {
      for (let i = 0; i < 3; i++) {
        await email.fill(`e2e+${stamp}@justhairs.test`);
        if ((await email.inputValue().catch(() => "")).includes("justhairs.test")) break;
        await page.waitForTimeout(500);
      }
    }

    await page.getByRole("textbox", { name: "Card number" }).fill("4242424242424242");
    await page.getByRole("textbox", { name: "Expiration" }).fill("12 / 34");
    await page.getByRole("textbox", { name: /CVC/ }).fill("123");
    const cardholderName = page.getByRole("textbox", { name: "Cardholder name" });
    if (await cardholderName.isVisible().catch(() => false)) {
      await cardholderName.fill("E2E Regression Test");
    }

    // Billing address — geo-IP can default to a country needing a state/
    // oblast field (Ukraine, seen while writing this test, needs one; Ireland
    // needs no address at all). Pin the country to Ireland, then fill
    // whichever address fields that leaves behind, if any.
    const country = page.getByRole("combobox", { name: "Country or region" });
    if (await country.isVisible().catch(() => false)) {
      await country.selectOption({ label: "Ireland" });
    }
    const addressLine1 = page.getByRole("textbox", { name: "Address line 1" });
    if (await addressLine1.isVisible().catch(() => false)) {
      await addressLine1.fill("14 Parnell Street");
      await page.getByRole("textbox", { name: "City" }).fill("Dublin");
      const postal = page.getByRole("textbox", { name: "Postal code" });
      if (await postal.isVisible().catch(() => false)) {
        await postal.fill("D01X2N0");
      }
    }

    await page.getByRole("button", { name: "Pay", exact: true }).click();

    await page.waitForURL(/\/book\/confirmation\/[0-9a-f-]{36}/, { timeout: 30_000 });

    // reconcileCheckout asks Stripe whether the session is paid the instant
    // the browser lands back here — occasionally that's a beat ahead of
    // Stripe's own backend committing the session as paid. A reload re-runs
    // the check; a real customer hitting this would just see it resolve on
    // their next look at the page too.
    if (!(await page.getByText(/Paid in full/i).isVisible().catch(() => false))) {
      await page.reload();
    }
    await expect(page.getByText(/Paid in full/i)).toBeVisible({ timeout: 15_000 });
  });
});
