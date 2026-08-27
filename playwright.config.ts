import { defineConfig, devices } from "@playwright/test";

// E2E contra o app real (React build + Pages Functions + D1 local via wrangler).
// O webServer reseta o D1 local, faz o build e sobe o pages dev na porta 8788.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8788",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: "npm run build && npx wrangler pages dev dist --port 8788 --ip 127.0.0.1",
    url: "http://127.0.0.1:8788/api/standings",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
