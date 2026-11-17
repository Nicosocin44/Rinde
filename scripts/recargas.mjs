/** Diagnóstico: cuenta recargas completas de una ruta durante unos segundos y muestra mensajes de HMR. */
import { chromium } from "@playwright/test";

const url = `${process.env.BASE_URL ?? "http://localhost:3000"}${process.env.RUTA ?? "/"}`;
const navegador = await chromium.launch();
const pagina = await navegador.newPage();
let cargas = 0;
pagina.on("load", () => cargas++);
pagina.on("console", (m) => {
  const t = m.text();
  if (/hmr|reload|refresh|fast/i.test(t)) console.log("consola:", t.slice(0, 300));
});
pagina.on("websocket", (ws) => {
  ws.on("framereceived", (f) => {
    const s = String(f.payload);
    if (!/"type":"(ping|turbopack-connected)"/.test(s) && s.length < 2000) console.log("ws:", s.slice(0, 300));
  });
});
await pagina.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
await pagina.waitForTimeout(Number(process.env.ESPERA ?? 15000));
console.log("recargas:", cargas);
await navegador.close();
