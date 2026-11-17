/** Muestra de tipografías candidatas con titulares y cifras reales de Rinde. */
import { chromium } from "@playwright/test";
const cand = [
  ["Bricolage Grotesque", 800, ""],
  ["Unbounded", 700, ""],
  ["Archivo", 800, "font-stretch:125%;"],
  ["Sora", 700, ""],
  ["Outfit", 800, ""],
  ["Onest", 800, ""],
  ["Familjen Grotesk", 700, ""],
  ["Schibsted Grotesk", 800, ""],
];
const fam = cand.map(([f]) => `family=${f.replace(/ /g, "+")}:${f === "Archivo" ? "wdth,wght@125,800" : "wght@400;700;800"}`).join("&");
const filas = cand.map(([f, w, extra]) => `<section><small>${f}</small><h1 style="font-family:'${f}';font-weight:${w};${extra}">¿Dónde rinde más tu plata?</h1><p class="n" style="font-family:'${f}';font-weight:${w};${extra}">$ 1.588,90 <em>▲ 0,51 %</em></p></section>`).join("");
const nav = await chromium.launch();
const p = await nav.newPage({ viewport: { width: 1400, height: 1800 } });
await p.setContent(`<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fam}&display=block"><style>body{margin:0;background:#0d0d0d;color:#f4f3ef;font-family:sans-serif;display:grid;grid-template-columns:1fr 1fr;gap:0}section{padding:28px 36px;border-bottom:1px solid #222;border-right:1px solid #222}small{color:#888;font-size:13px;letter-spacing:.08em;text-transform:uppercase}h1{font-size:46px;line-height:1;letter-spacing:-0.035em;margin:12px 0 10px}.n{font-size:64px;line-height:1;letter-spacing:-0.04em;margin:0;font-variant-numeric:tabular-nums}.n em{font-style:normal;font-size:22px;color:#3ccb7f;letter-spacing:0;vertical-align:middle}</style></head><body>${filas}</body></html>`);
await p.waitForTimeout(4500);
await p.screenshot({ path: process.argv[2], fullPage: true });
await nav.close();
