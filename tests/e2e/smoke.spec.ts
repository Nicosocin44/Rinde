import { expect, test } from "@playwright/test";

const RUTAS = ["/", "/dolar", "/dolar/comprar", "/pesos", "/pesos/lecaps", "/calculadoras/interes-compuesto", "/bonos", "/mercados", "/metodologia"];

for (const ruta of RUTAS) {
  test(`smoke ${ruta}: carga sin errores y con fuente visible`, async ({ page }) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.message));
    page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
    const r = await page.goto(ruta);
    expect(r?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    if (ruta !== "/metodologia") await expect(page.getByText(/Fuente:/).first()).toBeVisible();
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
