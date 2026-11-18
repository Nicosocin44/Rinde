/**
 * pnpm shots — capturas de todas las rutas a 375 / 768 / 1440 px, en dark y light → ./.shots/<fecha-hora>/
 *
 * Opciones (variables de entorno):
 *   BASE_URL   por defecto http://localhost:3000 (el sitio tiene que estar levantado)
 *   RUTAS      lista separada por comas para capturar solo algunas (ej. "/,/dolar")
 *   ANCHOS     ej. "375,1440"
 *   TEMAS      ej. "dark"
 *   SALIDA     carpeta de salida (ej. ".shots/final")
 *   PANTALLA   "1" para capturar solo lo visible (sin página completa)
 *
 * Para estados especiales se puede agregar ?estado=carga|vacio|error a una ruta: "/cartera?estado=vacio".
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const RUTAS_POR_DEFECTO = [
  "/",
  "/dolar",
  "/dolar/comprar",
  "/dolar/historico",
  "/dolar/conversor",
  "/pesos",
  "/pesos/plazo-fijo",
  "/pesos/billeteras",
  "/pesos/fci",
  "/pesos/caucion",
  "/pesos/lecaps",
  "/pesos/simulador",
  "/calculadoras",
  "/calculadoras/interes-compuesto",
  "/calculadoras/jubilacion",
  "/calculadoras/plazo-fijo",
  "/calculadoras/tasas",
  "/calculadoras/inflacion",
  "/cartera",
  "/mercados/bonos",
  "/mercados",
  "/mercados/acciones",
  "/mercados/cripto",
  "/mercados/opciones",
  "/mercados/opciones/tasas",
  "/mercados/opciones/estrategias",
  "/alertas",
  "/metodologia",
  "/aprender",
  "/legal",
  "/sistema",
  "/no-existe",
];

const rutas = process.env.RUTAS ? process.env.RUTAS.split(",") : RUTAS_POR_DEFECTO;
const anchos = (process.env.ANCHOS ?? "375,768,1440").split(",").map(Number);
const temas = (process.env.TEMAS ?? "dark,light").split(",");
const sello = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const salida = process.env.SALIDA ?? join(".shots", sello);
const soloPantalla = process.env.PANTALLA === "1";
mkdirSync(salida, { recursive: true });

const nombre = (ruta) => (ruta === "/" ? "inicio" : ruta.replace(/^\//, "").replace(/[/?=&]+/g, "_"));

const navegador = await chromium.launch();
let total = 0;
for (const tema of temas) {
  for (const ancho of anchos) {
    const contexto = await navegador.newContext({
      viewport: { width: ancho, height: ancho < 768 ? 812 : ancho < 1200 ? 1024 : 900 },
      deviceScaleFactor: ancho < 768 ? 2 : 1,
      colorScheme: tema,
      reducedMotion: "reduce",
      locale: "es-AR",
      timezoneId: "America/Argentina/Buenos_Aires",
    });
    const pagina = await contexto.newPage();
    for (const ruta of rutas) {
      const url = `${BASE}${ruta}${ruta.includes("?") ? "&" : "?"}tema=${tema}`;
      try {
        await pagina.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
        // Recorre la página para disparar los revelados al scrollear y la carga diferida.
        await pagina.evaluate(async () => {
          const paso = window.innerHeight * 0.8;
          for (let y = 0; y < document.body.scrollHeight; y += paso) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
          document.querySelectorAll(".revelar").forEach((el) => (el.dataset.visible = "true"));
        });
        // En página completa, las barras fijas se dibujarían en el medio: las anclamos al final.
        // content-visibility no pinta lo que está fuera de pantalla: en la captura de página completa, sí.
        await pagina.addStyleTag({ content: "body{position:relative} nav.fixed{position:absolute!important} .escena{content-visibility:visible!important}" });
        await pagina.waitForTimeout(400);
        const archivo = join(salida, `${nombre(ruta)}__${ancho}__${tema}.png`);
        if (process.env.TROZOS === "1" && !soloPantalla) {
          // Tramos de 1,5 pantallas: más fáciles de revisar que una tira larguísima.
          const altoTotal = await pagina.evaluate(() => document.documentElement.scrollHeight);
          const altoTramo = Math.round(pagina.viewportSize().height * 1.5);
          for (let y = 0, n = 1; y < altoTotal; y += altoTramo, n++) {
            const ruta = archivo.replace(".png", `__${n}.png`);
            await pagina.screenshot({ path: ruta, fullPage: true, clip: { x: 0, y, width: ancho, height: Math.min(altoTramo, altoTotal - y) } });
          }
        } else {
          await pagina.screenshot({ path: archivo, fullPage: !soloPantalla });
        }
        total++;
        console.log("✓", archivo);
      } catch (error) {
        console.log("✗", ruta, ancho, tema, error.message.split("\n")[0]);
      }
    }
    await contexto.close();
  }
}
await navegador.close();
console.log(`\n${total} capturas en ${salida}`);
