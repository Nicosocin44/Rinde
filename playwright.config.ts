import { defineConfig, devices } from "@playwright/test";

/**
 * e2e de los flujos clave. Usa el servidor que ya esté corriendo en :3000 o levanta `pnpm dev`.
 * Los datos son reales: los tests verifican comportamiento, no cifras puntuales.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000", locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /smoke|cartera/ },
  ],
  webServer: { command: "pnpm dev", url: "http://localhost:3000/api/buscar", reuseExistingServer: true, timeout: 180_000 },
});
