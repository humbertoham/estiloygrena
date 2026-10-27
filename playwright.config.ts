import "./scripts/load-env";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.TEST_DATABASE_SCHEMA
    ? {
        command:
          "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: false,
        timeout: 120000,
        env: { NEXT_DIST_DIR: ".next-test" },
      }
    : undefined,
});
