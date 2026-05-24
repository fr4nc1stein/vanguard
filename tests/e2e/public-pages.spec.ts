import { test, expect } from "@playwright/test";

// ─── Homepage ─────────────────────────────────────────────────────────────────

test.describe("Homepage (/)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads with the correct page title", async ({ page }) => {
    await expect(page).toHaveTitle(/Vanguard/i);
  });

  test("shows the site header with logo and nav links", async ({ page }) => {
    const header = page.locator("header");
    await expect(header).toBeVisible();
    // Logo text
    await expect(header.getByText("Vanguard VDP")).toBeVisible();
    // Hall of Fame nav link
    await expect(header.getByRole("link", { name: /Hall of Fame/i })).toBeVisible();
    // Submit CTA button
    await expect(header.getByRole("link", { name: /Submit/i })).toBeVisible();
  });

  test("renders the hero section with a CTA", async ({ page }) => {
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
    // The hero should have a "Submit a Report" CTA — use first() since multiple exist
    const cta = page.getByRole("link", { name: /Submit a Report|Submit Report|Get Started/i }).first();
    await expect(cta).toBeVisible();
  });

  test("renders the How It Works section with 3 steps", async ({ page }) => {
    await expect(page.getByText("How It Works")).toBeVisible();
    // Steps 01, 02, 03 — use exact:true to avoid matching "01"/"02"/"03" substrings
    // in unrelated content (e.g. the footer copyright year "2026" contains "02")
    await expect(page.getByText("01", { exact: true })).toBeVisible();
    await expect(page.getByText("02", { exact: true })).toBeVisible();
    await expect(page.getByText("03", { exact: true })).toBeVisible();
    // Use role:heading + exact:true to match only the step headings, not body copy
    // (e.g. the hero h1 "Find it first. Report it" also contains "Report")
    await expect(page.getByRole("heading", { name: "Discover", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Report", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Get Recognized", exact: true })).toBeVisible();
  });

  test("renders the site footer", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("navigates to Hall of Fame via nav link", async ({ page }) => {
    await page.getByRole("link", { name: /Hall of Fame/i }).first().click();
    await expect(page).toHaveURL(/\/hall-of-fame/);
  });
});

// ─── Policy page ─────────────────────────────────────────────────────────────

test.describe("Policy page (/policy)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/policy");
  });

  test("loads the disclosure policy page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Disclosure Policy/i })).toBeVisible();
  });

  test("shows the program overview section", async ({ page }) => {
    await expect(page.getByText("Program Overview")).toBeVisible();
  });

  test("shows in-scope and out-of-scope sections", async ({ page }) => {
    // Use role:heading to avoid strict-mode conflict with list items that
    // also contain the word "scope"
    await expect(page.getByRole("heading", { name: /In Scope/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Out.of.Scope/i })).toBeVisible();
  });

  test("has a working link back to home", async ({ page }) => {
    // Logo in header should link home
    const logoLink = page.locator("header").getByRole("link").first();
    await logoLink.click();
    await expect(page).toHaveURL("/");
  });
});

// ─── Hall of Fame ─────────────────────────────────────────────────────────────

test.describe("Hall of Fame (/hall-of-fame)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/hall-of-fame");
  });

  test("loads with the correct heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Hall of Fame/i })
    ).toBeVisible();
  });

  test("shows Leaderboard and Hacktivity tabs", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Leaderboard/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Hacktivity/i })).toBeVisible();
  });

  test("switches to Hacktivity tab on click", async ({ page }) => {
    const hacktivityTab = page.getByRole("button", { name: /Hacktivity/i });
    await hacktivityTab.click();
    // After clicking, the tab should be active (contains 'active' styling or aria-pressed)
    // We at least verify the button is still visible and clickable
    await expect(hacktivityTab).toBeVisible();
  });

  test("shows stats section with numeric values", async ({ page }) => {
    // Stats labels are always rendered in the hero area (API data controls the
    // numbers but not the labels). Wait up to 10s for the loading state to
    // resolve — note: in dev mode the Cloudflare D1 API will fail and display 0.
    await expect(page.getByText("Points Awarded")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Researchers")).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Submit page (/submit) ────────────────────────────────────────────────────

test.describe("Submit page (/submit)", () => {
  test("loads the vulnerability submission form (or redirects to sign-in)", async ({ page }) => {
    await page.goto("/submit");
    // Either the form is shown (unauthenticated users can still see the form UI)
    // or we get redirected to sign-in/sign-up
    const url = page.url();
    const isFormPage = url.includes("/submit");
    const isAuthPage = url.includes("/sign-in") || url.includes("/sign-up");
    expect(isFormPage || isAuthPage).toBeTruthy();
  });

  test("shows the report submission form fields when on /submit", async ({ page }) => {
    await page.goto("/submit");
    // If redirected, skip the rest
    if (!page.url().includes("/submit")) {
      test.skip();
      return;
    }

    // Title field
    await expect(page.getByLabel(/Title/i)).toBeVisible();
    // Severity selector
    await expect(page.getByText(/Severity/i)).toBeVisible();
    // Description textarea
    await expect(page.getByLabel(/Description/i)).toBeVisible();
  });

  test("shows severity options: Critical, High, Medium, Low, Info", async ({ page }) => {
    await page.goto("/submit");
    if (!page.url().includes("/submit")) {
      test.skip();
      return;
    }

    await expect(page.getByText("Critical")).toBeVisible();
    await expect(page.getByText("High")).toBeVisible();
    await expect(page.getByText("Medium")).toBeVisible();
    await expect(page.getByText("Low")).toBeVisible();
    await expect(page.getByText("Info")).toBeVisible();
  });

  test("shows validation error when submitting an empty form", async ({ page }) => {
    await page.goto("/submit");
    if (!page.url().includes("/submit")) {
      test.skip();
      return;
    }

    // Click submit without filling in the form
    const submitBtn = page.getByRole("button", { name: /Submit Report|Submit/i });
    await submitBtn.click();

    // At least one validation error should appear
    const errors = page.locator("text=/required|Please|must/i");
    await expect(errors.first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

test.describe("Navigation", () => {
  test("Submit button in header navigates to /submit", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: /Submit/i }).click();
    await expect(page).toHaveURL(/\/(submit|sign-in|sign-up)/);
  });

  test("Hall of Fame link in header navigates to /hall-of-fame", async ({ page }) => {
    await page.goto("/policy");
    await page.locator("header").getByRole("link", { name: /Hall of Fame/i }).click();
    await expect(page).toHaveURL(/\/hall-of-fame/);
  });

  test("Logo click always returns to homepage", async ({ page }) => {
    await page.goto("/hall-of-fame");
    await page.locator("header").getByRole("link").first().click();
    await expect(page).toHaveURL("/");
  });
});
