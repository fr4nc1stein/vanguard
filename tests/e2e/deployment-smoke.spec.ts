import { expect, test } from "@playwright/test";

const expectedHeaders = [
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "content-security-policy",
];

test.describe("Deployment smoke test", () => {
  test("public pages respond without server errors", async ({ request }) => {
    const paths = ["/", "/policy", "/hall-of-fame", "/submit", "/sign-in"];

    for (const path of paths) {
      const response = await request.get(path, { maxRedirects: 0 });

      expect(
        response.status(),
        `${path} should not return a server error`,
      ).toBeLessThan(500);
    }
  });

  test("homepage renders the core public shell", async ({ page }) => {
    await page.goto("/");

    const header = page.locator("header");

    await expect(page).toHaveTitle(/Vanguard/i);
    await expect(header).toBeVisible();
    await expect(header.getByRole("link", { name: /Hall of Fame/i })).toBeVisible();
    await expect(header.getByRole("link", { name: /Submit/i })).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });

  test("security headers are present on page responses", async ({ request }) => {
    const response = await request.get("/");

    expect(response.ok()).toBeTruthy();

    for (const header of expectedHeaders) {
      expect(response.headers()[header], `${header} should be present`).toBeTruthy();
    }

    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("robots.txt disallows protected application routes", async ({ request }) => {
    const response = await request.get("/robots.txt");
    const body = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(body).toContain("User-agent: *");

    for (const path of ["/admin", "/triage", "/dashboard", "/api", "/sign-in", "/sign-up"]) {
      expect(body).toContain(`Disallow: ${path}`);
    }
  });
});
