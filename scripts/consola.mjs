/** Recorre las rutas y lista errores y advertencias de la consola del navegador (útil para hidratación). */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const rutas = (process.env.RUTAS ?? "/").split(",");
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: Number(process.env.ANCHO ?? 1440), height: 900 } });
let actual = "";
pagina.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") console.log(`[${actual}] ${m.type()}: ${m.text().slice(0, Number(process.env.LARGO ?? 600))}`);
});
pagina.on("pageerror", (e) => console.log(`[${actual}] pageerror: ${e.message.slice(0, Number(process.env.LARGO ?? 600))}`));
for (const r of rutas) {
  actual = r;
  await pagina.goto(BASE + r, { waitUntil: "networkidle", timeout: 90_000 });
  await pagina.waitForTimeout(800);
}
await navegador.close();
console.log("listo");
