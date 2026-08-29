import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const port = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Local-mode E2E tests share one persisted data file; serialize workers so
  // concurrent authentication mutations cannot overwrite one another.
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      OTOPASS_DATA_MODE: "local",
      OTOPASS_ENABLE_LOCAL_AUTH: "true",
      OTOPASS_E2E_SEED_AUTH: "true",
      OTOPASS_LOCAL_DATA_DIR: resolve(process.cwd(), "test-results", "e2e-local-data"),
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
    },
  },
});
