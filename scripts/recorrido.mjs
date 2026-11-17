/**
 * node scripts/recorrido.mjs — revisa una escena de la home mientras se scrollea.
 *
 * Por cada tema × ancho:
 *   1. Cuadros: recorre la escena en N pasos y saca una captura de la pantalla en cada uno.
 *   2. Video: graba el recorrido completo de la escena con la rueda del mouse (.webm).
 *   3. Rendimiento (solo en 375): repite el recorrido con la CPU 4× más lenta (celular medio)
 *      y mide la duración de cada cuadro y los saltos de layout (CLS).
 *
 * Variables de entorno:
 *   ESCENA   el aria-label de la sección (ej. "El problema"). Obligatoria.
 *   ANCHOS   por defecto "375,1440"
 *   TEMAS    por defecto "dark,light"
 *   PASOS    cuadros por escena (por defecto 7)
 *   SALIDA   por defecto .shots/narrativa
 *   VIDEO    "0" para no grabar
 */
import { chromium } from "@playwright/test";
import { mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ESCENA = process.env.ESCENA;
if (!ESCENA) throw new Error("Falta ESCENA (aria-label de la sección)");
const anchos = (process.env.ANCHOS ?? "375,1440").split(",").map(Number);
const temas = (process.env.TEMAS ?? "dark,light").split(",");
const pasos = Number(process.env.PASOS ?? 7);
const salida = process.env.SALIDA ?? join(".shots", "narrativa");
const slug = ESCENA.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
mkdirSync(salida, { recursive: true });

const navegador = await chromium.launch();

async function abrir(ancho, tema, video) {
  const viewport = { width: ancho, height: ancho < 768 ? 812 : 900 };
  const contexto = await navegador.newContext({
    viewport,
    deviceScaleFactor: ancho < 768 ? 2 : 1,
    colorScheme: tema,
    reducedMotion: "no-preference",
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    hasTouch: false,
    ...(video ? { recordVideo: { dir: join(salida, "_video"), size: viewport } } : {}),
  });
  const pagina = await contexto.newPage();
  await pagina.goto(`${BASE}/?tema=${tema}`, { waitUntil: "networkidle", timeout: 120_000 });
  await pagina.waitForTimeout(1200);
  return { contexto, pagina };
}

/** Rango de scroll de la escena: desde que su borde superior entra hasta que termina de salir el interior. */
async function rango(pagina) {
  return pagina.evaluate((etiqueta) => {
    const el = document.querySelector(`section[aria-label="${etiqueta}"]`);
    if (!el) return null;
    const top = el.getBoundingClientRect().top + window.scrollY;
    return { desde: Math.max(0, top - window.innerHeight * 0.9), hasta: top + el.offsetHeight - window.innerHeight };
  }, ESCENA);
}

for (const tema of temas) {
  for (const ancho of anchos) {
    // 1 · Cuadros
    const { contexto, pagina } = await abrir(ancho, tema, false);
    const r = await rango(pagina);
    if (!r) {
      console.log(`✗ No encontré la escena "${ESCENA}"`);
      await contexto.close();
      continue;
    }
    for (let i = 0; i < pasos; i++) {
      const y = r.desde + ((r.hasta - r.desde) * i) / (pasos - 1);
      await pagina.evaluate((y) => window.scrollTo(0, y), y);
      await pagina.waitForTimeout(900);
      const archivo = join(salida, `${slug}__${ancho}__${tema}__${String(i + 1).padStart(2, "0")}.png`);
      await pagina.screenshot({ path: archivo });
    }
    console.log(`✓ cuadros ${ancho} ${tema}`);
    await contexto.close();

    // 2 · Video (uno por ancho, en el primer tema)
    if (process.env.VIDEO !== "0" && tema === temas[0]) {
      const { contexto: cv, pagina: pv } = await abrir(ancho, tema, true);
      const rv = await rango(pv);
      await pv.evaluate((y) => window.scrollTo(0, y), rv.desde);
      await pv.waitForTimeout(600);
      await pv.mouse.move(ancho / 2, 400);
      const total = rv.hasta - rv.desde + 200;
      for (let s = 0; s < total; s += 40) {
        await pv.mouse.wheel(0, 40);
        await pv.waitForTimeout(28);
      }
      await pv.waitForTimeout(1200);
      const ruta = await pv.video().path();
      await cv.close();
      renameSync(ruta, join(salida, `${slug}__${ancho}__${tema}.webm`));
      console.log(`✓ video ${ancho} ${tema}`);
    }

    // 3 · Rendimiento en celular medio
    if (ancho < 768 && tema === temas[0]) {
      const { contexto: cp, pagina: pp } = await abrir(ancho, tema, false);
      const cdp = await cp.newCDPSession(pp);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const rp = await rango(pp);
      await pp.evaluate((y) => window.scrollTo(0, y), rp.desde);
      await pp.waitForTimeout(500);
      await pp.evaluate(() => {
        window.__cuadros = [];
        window.__cls = 0;
        let previo = performance.now();
        const medir = (t) => {
          window.__cuadros.push(t - previo);
          previo = t;
          window.__raf = requestAnimationFrame(medir);
        };
        window.__raf = requestAnimationFrame(medir);
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
        }).observe({ type: "layout-shift", buffered: false });
      });
      await pp.mouse.move(ancho / 2, 400);
      const total = rp.hasta - rp.desde + 200;
      for (let s = 0; s < total; s += 50) {
        await pp.mouse.wheel(0, 50);
        await pp.waitForTimeout(16);
      }
      await pp.waitForTimeout(800);
      const m = await pp.evaluate(() => {
        cancelAnimationFrame(window.__raf);
        const c = window.__cuadros.slice(2).sort((a, b) => a - b);
        const p = (q) => c[Math.min(c.length - 1, Math.floor(c.length * q))];
        return { cuadros: c.length, mediana: p(0.5), p95: p(0.95), largos: c.filter((x) => x > 33.4).length, cls: window.__cls };
      });
      console.log(
        `⏱  ${ancho} CPU×4: ${m.cuadros} cuadros · mediana ${m.mediana.toFixed(1)} ms (${(1000 / m.mediana).toFixed(0)} fps) · p95 ${m.p95.toFixed(1)} ms · ${m.largos} cuadros > 33 ms · CLS ${m.cls.toFixed(4)}`,
      );
      await cp.close();
    }
  }
}
await navegador.close();
