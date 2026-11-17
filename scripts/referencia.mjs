// Capturas de una web de referencia: página completa, varias posiciones de scroll y datos de estilo.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const url = process.argv[2];
const salida = process.argv[3];
mkdirSync(salida, { recursive: true });
const nav = await chromium.launch();
for (const [nombre, vp] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const p = await nav.newPage({ viewport: vp, deviceScaleFactor: 1 });
  await p.goto(url, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${salida}/${nombre}-0.png` });
  const alto = await p.evaluate(() => document.documentElement.scrollHeight);
  let i = 1;
  for (let y = vp.height; y < alto && i <= 8; y += vp.height, i++) {
    await p.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), y);
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${salida}/${nombre}-${i}.png` });
  }
  if (nombre === "desktop") {
    const info = await p.evaluate(() => {
      const fuentes = new Set();
      const colores = new Map();
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el);
        fuentes.add(cs.fontFamily.split(",")[0]);
        for (const c of [cs.color, cs.backgroundColor]) if (c && c !== "rgba(0, 0, 0, 0)") colores.set(c, (colores.get(c) ?? 0) + 1);
      }
      const anims = [...document.getAnimations()].length;
      const scripts = [...document.scripts].map((s) => s.src).filter(Boolean).map((s) => s.split("/").pop()).slice(0, 25);
      return { titulo: document.title, fuentes: [...fuentes].slice(0, 12), colores: [...colores].sort((a, b) => b[1] - a[1]).slice(0, 14), anims, alto: document.documentElement.scrollHeight, scripts };
    });
    console.log(JSON.stringify(info, null, 1));
  }
  await p.close();
}
await nav.close();
