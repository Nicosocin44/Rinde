#!/usr/bin/env node
/**
 * Guarda el cierre de las opciones del día para armar el historial de primas, que data912 no publica para las opciones
 * locales. Lo corre GitHub Actions cada día hábil después del cierre (.github/workflows/tasas-diarias.yml) y se puede
 * correr a mano: `node scripts/guardar-opciones.mjs`.
 *
 * Escribe data/historico/opciones/AAAA-MM.json:
 *   { "AAAA-MM-DD": { "GGAL": { "precio": 4715, "series": { "GFGC5400DI": [compra, venta, último, volumen] } } } }
 * y regenera el índice. Si se corre dos veces el mismo día, reemplaza la foto de ese día. Sin dependencias: Node 20+.
 * Fuente: data912 /live/arg_options y /live/arg_stocks (verificadas el 18/11/2026).
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = "https://data912.com";
const CARPETA = join(process.cwd(), "data", "historico", "opciones");
/** Subyacente → prefijo de sus opciones. Igual que data/ar/opciones.ts: si se suma uno ahí, sumarlo acá. */
const SUBYACENTES = { GGAL: "GFG" };

/** Fecha de hoy en Argentina (UTC−3). */
const hoy = new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

async function traer(ruta) {
  const r = await fetch(`${BASE}/${ruta}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`${ruta} respondió ${r.status}`);
  return r.json();
}

/** Precio válido o null, con tres decimales como máximo. */
const precio = (x) => (typeof x === "number" && Number.isFinite(x) && x > 0 ? Math.round(x * 1000) / 1000 : null);

async function main() {
  const dia = new Date(`${hoy}T12:00:00Z`).getUTCDay();
  if (dia === 0 || dia === 6) {
    console.log(`Hoy (${hoy}) no hay rueda: no se guarda nada.`);
    return;
  }
  const [opciones, acciones] = await Promise.all([traer("live/arg_options"), traer("live/arg_stocks")]);
  const foto = {};
  for (const [ticker, prefijo] of Object.entries(SUBYACENTES)) {
    const accion = acciones.find((a) => a.symbol === ticker);
    const series = {};
    for (const o of opciones) {
      if (typeof o.symbol !== "string" || !o.symbol.startsWith(prefijo)) continue;
      const fila = [precio(o.px_bid), precio(o.px_ask), precio(o.c), typeof o.v === "number" && o.v > 0 ? o.v : 0];
      // Solo las que tienen algún precio: las series vacías no aportan.
      if (fila[0] !== null || fila[1] !== null || fila[2] !== null) series[o.symbol] = fila;
    }
    if (Object.keys(series).length > 0) foto[ticker] = { precio: precio(accion?.c), series };
  }
  if (Object.keys(foto).length === 0) throw new Error("La fuente no devolvió opciones: no se guarda nada hoy");
  // Feriado: la fuente repite la rueda anterior, sin volumen. No se guarda (sería un día que no existió).
  const volumen = Object.values(foto).reduce((s, f) => s + Object.values(f.series).reduce((t, x) => t + x[3], 0), 0);
  if (volumen === 0) {
    console.log(`Hoy (${hoy}) no operó ninguna opción: no se guarda nada.`);
    return;
  }

  await mkdir(CARPETA, { recursive: true });
  const archivo = join(CARPETA, `${hoy.slice(0, 7)}.json`);
  let mes = {};
  try {
    mes = JSON.parse(await readFile(archivo, "utf8"));
  } catch {
    // Primer día del mes.
  }
  mes[hoy] = foto;
  const ordenado = Object.fromEntries(Object.entries(mes).sort(([a], [b]) => a.localeCompare(b)));
  // Una línea por día: el archivo queda chico y los cambios de cada día se leen fácil en git.
  const cuerpo = Object.entries(ordenado)
    .map(([fecha, f]) => ` ${JSON.stringify(fecha)}: ${JSON.stringify(f)}`)
    .join(",\n");
  await writeFile(archivo, `{\n${cuerpo}\n}\n`);

  const meses = (await readdir(CARPETA)).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort();
  const indice = [
    "// Generado por scripts/guardar-opciones.mjs: no editar a mano.",
    'import type { FotoOpciones } from "./tipos";',
    ...meses.map((m, i) => `import m${i} from "./${m}";`),
    "",
    "/** Una foto por día hábil de las opciones, desde que empezamos a guardarlas. (JSON → tupla: TypeScript no infiere tuplas de un JSON.) */",
    `export const HISTORIAL_OPCIONES: Record<string, FotoOpciones> = { ${meses.map((_, i) => `...(m${i} as unknown as Record<string, FotoOpciones>)`).join(", ")} };`,
    "",
  ].join("\n");
  await writeFile(join(CARPETA, "index.ts"), indice);
  const total = Object.values(foto).reduce((s, f) => s + Object.keys(f.series).length, 0);
  console.log(`Guardadas las opciones del ${hoy}: ${total} series de ${Object.keys(foto).join(", ")}.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
