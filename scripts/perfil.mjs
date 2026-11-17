/** Perfil de CPU de la carga de una ruta (CPU 4× más lenta), agrupado por función. Diagnóstico de rendimiento. */
import { chromium } from "@playwright/test";

const url = `${process.env.BASE_URL ?? "http://localhost:3001"}${process.env.RUTA ?? "/"}`;
const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 2, isMobile: true });
const pagina = await ctx.newPage();
const cdp = await ctx.newCDPSession(pagina);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
await cdp.send("Profiler.start");
await pagina.goto(url, { waitUntil: "load" });
await pagina.waitForTimeout(4000);
const { profile } = await cdp.send("Profiler.stop");
await navegador.close();

const porId = new Map(profile.nodes.map((n) => [n.id, n]));
const propio = new Map();
const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => {
  const n = porId.get(id);
  const f = n.callFrame;
  const clave = `${f.functionName || "(anónima)"} @ ${f.url.split("/").pop()}:${f.lineNumber}`;
  propio.set(clave, (propio.get(clave) ?? 0) + (dt[i] ?? 0) / 1000);
});
const top = [...propio].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.TOP ?? 30));
for (const [k, ms] of top) console.log(String(Math.round(ms)).padStart(6), "ms ", k);
