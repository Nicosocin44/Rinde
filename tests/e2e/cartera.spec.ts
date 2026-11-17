import { expect, test } from "@playwright/test";

test("Cartera: cargar una posición", async ({ page }) => {
  await page.goto("/cartera");
  await page.evaluate(() => indexedDB.deleteDatabase("rinde-cartera"));
  await page.reload();

  // Primero se ve la cartera de ejemplo, rotulada.
  await expect(page.getByText("Datos de ejemplo").first()).toBeVisible();
  await expect(page.getByTestId("total-cartera")).toBeVisible();

  await page.getByTestId("abrir-cargar").click();
  const form = page.getByTestId("form-movimiento");
  await expect(form).toBeVisible();
  await form.getByRole("button", { name: "CEDEAR", exact: true }).click();
  await form.getByTestId("input-ticker").fill("AAPL");
  await form.getByLabel("Cantidad").fill("5");
  await form.getByLabel(/Precio por unidad/).fill("30000");
  await form.getByTestId("guardar-movimiento").click();

  // Al guardar, empieza la cartera propia: sin rótulo de ejemplo y con la posición cargada.
  await expect(page.getByTestId("posiciones")).toContainText("Apple");
  await expect(page.getByText("Datos de ejemplo")).toHaveCount(0);
  await expect(page.getByTestId("total-cartera")).toContainText(/\d/);
});
