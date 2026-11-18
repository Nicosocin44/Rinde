import { expect, test } from "@playwright/test";

const RUTAS = ["/", "/dolar", "/dolar/comprar", "/pesos", "/pesos/lecaps", "/calculadoras/interes-compuesto", "/bonos", "/mercados", "/mercados/opciones", "/mercados/opciones/tasas", "/mercados/opciones/estrategias", "/noticias", "/metodologia", "/activo/AAPL", "/activo/GGAL", "/activo/AL30", "/activo/BTC", "/activo/USDT", "/calculadoras/que-hubiera-pasado", "/pesos/plazo-fijo"];

for (const ruta of RUTAS) {
  test(`smoke ${ruta}: carga sin errores y con las fuentes en el pie`, async ({ page }) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.message));
    page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
    const r = await page.goto(ruta);
    expect(r?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    // Las fuentes no se escriben en cada pantalla (18/11/2026): están en el pie, con link a la metodología.
    await expect(page.locator("footer").getByText(/Datos de/)).toBeVisible();
    await expect(page.locator("main").getByText(/^Fuente:/)).toHaveCount(0);
    // Nunca notación científica ni NaN en pantalla.
    const texto = await page.locator("main").innerText();
    expect(texto).not.toMatch(/NaN|Infinity|\de[+-]\d/);
    expect(errores.filter((e) => !/favicon|ResizeObserver/.test(e))).toEqual([]);
  });
}

test("404 con el marco del sitio", async ({ page }) => {
  const r = await page.goto("/esto-no-existe");
  expect(r?.status()).toBe(404);
  await expect(page.getByText("Esta página no rinde.")).toBeVisible();
});
