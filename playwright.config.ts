import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for Vanguard VDP.
 *
 * By default runs against the local Next.js dev server (localhost:3000).
 * Set BASE_URL to run against a remote environment, e.g.:
 *   BASE_URL=https://vanguard.laet4x.com npx playwright test
 *
 * @see https://playwright.dev/docs/test-configuration
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const isRemote = BASE_URL.startsWith("https://") || BASE_URL.startsWith("http://") && !BASE_URL.includes("localhost");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Only spin up the local dev server when not targeting a remote URL */
  ...(isRemote
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});
