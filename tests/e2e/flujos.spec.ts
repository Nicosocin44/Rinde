import { expect, test } from "@playwright/test";

test.describe("flujos clave", () => {
  test("¿Dónde rinde más?: calcular con otro monto y plazo", async ({ page }) => {
    await page.goto("/");
    const widget = page.getByTestId("donde-rinde");
    await expect(widget).toBeVisible();
    const filas = widget.locator("ol > li");
    await expect(filas.first()).toBeVisible();
    const textoInicial = await widget.locator("p[aria-live]").innerText();

    const monto = page.locator("#monto-rinde");
    await monto.fill("5M");
    await monto.blur();
    await widget.getByRole("radio", { name: "90 días" }).click();
    await expect(widget.locator("p[aria-live]")).not.toHaveText(textoInicial);
    await expect(widget.locator("p[aria-live]")).toContainText("5.000.000");
    await expect(widget.locator("p[aria-live]")).toContainText("a 90 días");
    expect(await filas.count()).toBeGreaterThan(0);
    expect(await filas.count()).toBeLessThanOrEqual(5);

    // Solo liquidez: todas las opciones tienen que ser "al instante".
    await widget.getByRole("switch").click();
    await expect(filas.first()).toContainText(/al instante/i);

    // La cuenta a la vista.
    await widget.getByRole("button", { name: /De dónde sale/ }).click();
    await expect(page.getByText("Ganancia = monto × ((1 + TEA)^(días / 365) − 1)")).toBeVisible();
  });

  test("Dólar: cambiar USD/USDT en el ranking y reordenar", async ({ page }) => {
    await page.goto("/dolar/comprar");
    const ranking = page.getByTestId("ranking-dolar");
    await expect(ranking.locator("table tbody tr").first()).toBeVisible();
    await expect(ranking).toContainText(/USD 1\.000 te cuestan/);

    await ranking.getByRole("radio", { name: "USDT" }).click();
    await expect(page).toHaveURL(/activo=USDT/);
    await expect(ranking).toContainText(/USDT 1\.000 te cuestan/);

    // "Para vender": la primera fila es la que más paga.
    await ranking.getByRole("radio", { name: "Para vender" }).click();
    await expect(ranking).toContainText(/Te conviene vender en/);
    const precios = await ranking.locator("table tbody tr td:nth-child(4)").allInnerTexts();
    const numeros = precios.map((t) => Number(t.replace(/[^\d,]/g, "").replace(",", ".")));
    for (let i = 1; i < numeros.length; i++) expect(numeros[i - 1]!).toBeGreaterThanOrEqual(numeros[i]!);
  });

  test("Alertas: crear una alerta", async ({ page }) => {
    await page.goto("/alertas");
    await page.evaluate(() => indexedDB.deleteDatabase("rinde-alertas"));
    await page.reload();
    await page.getByTestId("nueva-alerta").click();
    const form = page.getByTestId("form-alerta");
    await expect(form).toBeVisible();
    await form.getByRole("button", { name: /Precio del dólar/ }).click();
    await form.getByTestId("crear-alerta").click();
    const lista = page.getByTestId("lista-alertas");
    await expect(lista).toContainText("Dólar MEP por encima de");
    await expect(lista).toContainText(/Se cumple ahora|Todavía no/);
  });

  test("Buscador: en el Inicio la ruedita mueve la lista del buscador, no la página de atrás", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500); // el scroll suave se carga cuando el navegador queda libre
    await page.getByRole("button", { name: "Buscar" }).first().click();
    const lista = page.locator("#resultados-busqueda");
    await expect(lista).toBeVisible();
    const caja = (await lista.boundingBox())!;
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(600);
    expect(await lista.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});
