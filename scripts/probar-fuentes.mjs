/** Prueba si cada fuente de Google Fonts tiene cifras tabulares (todas del mismo ancho). */
import { chromium } from "@playwright/test";
const fuentes = (process.env.FUENTES ?? "Poppins,Instrument Sans,DM Sans,Bricolage Grotesque,Hanken Grotesk,Onest,Figtree,Plus Jakarta Sans,Schibsted Grotesk,Familjen Grotesk,Archivo,Space Grotesk,Unbounded,Sora,Outfit,Red Hat Display").split(",");
const nav = await chromium.launch();
const p = await nav.newPage();
const familias = fuentes.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;600;800`).join("&");
await p.setContent(`<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${familias}&display=block"></head><body>${fuentes.map((f) => `<div style="font-family:'${f}';font-size:40px;font-variant-numeric:tabular-nums"><span class="a">1111111</span><span class="b">8888888</span></div>`).join("")}</body></html>`);
await p.waitForTimeout(4000);
await p.evaluate(() => document.fonts.ready);
const r = await p.evaluate((fs) => [...document.querySelectorAll("div")].map((d, i) => { const a = d.querySelector(".a").getBoundingClientRect().width; const b = d.querySelector(".b").getBoundingClientRect().width; return `${fs[i].padEnd(22)} tabular: ${Math.abs(a - b) < 0.5 ? "SÍ" : "no"}  (${a.toFixed(1)} vs ${b.toFixed(1)})`; }), fuentes);
console.log(r.join("\n"));
await nav.close();
