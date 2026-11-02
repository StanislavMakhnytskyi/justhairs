import { test, expect } from "@playwright/test";
import { getAnyServiceSlug } from "../support/catalog";

// Fast, mostly no-browser checks: every public route responds with the right
// content, and the dynamic booking routes fail cleanly on a made-up id.
//
// /book renders its flow behind a useSearchParams()-driven <Suspense>, so it
// uses a real browser page; everything else stays request-only and fast.
test.describe("routes", () => {
  const staticPages: { path: string; text: RegExp }[] = [
    { path: "/", text: /justhairs/i },
    { path: "/masters", text: /Our team/ },
    { path: "/privacy", text: /Privacy Policy/ },
    { path: "/terms", text: /justhairs/i },
  ];

  for (const { path, text } of staticPages) {
    test(`GET ${path} -> 200`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status(), `${path} should respond 200`).toBe(200);
      expect(await res.text()).toMatch(text);
    });
  }

  test("a real service detail page responds", async ({ request }) => {
    const slug = await getAnyServiceSlug();
    const res = await request.get(`/services/${slug}`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/€\d/);
  });

  test("/services lists services in the server HTML", async ({ request }) => {
    const res = await request.get("/services");
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/€\d/);
  });

  test("/services renders its catalog after hydration", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByText(/€\d/).first()).toBeVisible();
  });

  test("/book renders the booking flow after hydration", async ({ page }) => {
    await page.goto("/book");
    await expect(page.getByRole("heading", { name: "Book appointment" })).toBeVisible();
  });

  // The pay/confirmation routes live in the (secure) route group, outside every
  // loading.tsx boundary, so the lookup resolves before streaming starts and
  // notFound() produces a real 404.
  test("an unknown appointment id is a real 404", async ({
    request,
  }) => {
    const bogus = "00000000-0000-0000-0000-000000000000";
    for (const path of [`/book/pay/${bogus}`, `/book/confirmation/${bogus}`]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(404);
      // The (secure) not-found copy. (Not asserting the absence of "Page not
      // found": the RSC payload of this document also carries the global
      // not-found tree as an unused boundary prop.)
      expect(await res.text(), path).toMatch(/no longer held/i);
    }
  });

  test("robots, sitemap and health respond", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toMatch(/Disallow: \/book\/pay/);
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("/services");
    const health = await request.get("/api/health");
    expect(health.headers()["cache-control"]).toContain("no-store");
    expect([200, 503]).toContain(health.status());
  });

  test("manifest and OG image respond", async ({ request }) => {
    for (const path of ["/manifest.webmanifest", "/opengraph-image"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
    }
  });
});
