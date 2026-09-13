import { test, expect } from "@playwright/test";

test.describe("catalog", () => {
  test("home lists services and links into the catalog", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/justhairs/i);
    // At least one "See all" / service link should route into /services or /book.
    const links = page.locator('a[href^="/services"], a[href^="/book"]');
    await expect(links.first()).toBeVisible();
  });

  test("services list -> a service detail page", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();

    const firstService = page.locator('a[href^="/services/"]').first();
    await expect(firstService).toBeVisible();
    await firstService.click();

    await expect(page).toHaveURL(/\/services\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    // Price + duration + "Book" CTA are the load-bearing bits of this page.
    await expect(page.getByText(/€\d/).first()).toBeVisible();
  });

  test("masters page lists the team", async ({ page }) => {
    await page.goto("/masters");
    await expect(page.getByRole("heading", { name: "Our team" })).toBeVisible();
  });
});
