#!/usr/bin/env node
/**
 * Guarda las tasas del día para armar el historial que hoy no publica nadie: plazo fijo por banco, billeteras y
 * cuentas remuneradas, y LECAPs/BONCAPs. Lo corre GitHub Actions cada día hábil (.github/workflows/tasas-diarias.yml)
 * y se puede correr a mano: `node scripts/guardar-tasas.mjs`.
 *
 * Escribe data/historico/tasas/AAAA-MM.json ({ "AAAA-MM-DD": { plazoFijo, cuentas, letras } }) y regenera el índice.
 * Si se corre dos veces el mismo día, reemplaza la foto de ese día. Sin dependencias: solo Node 20+.
 * Fuente: ArgentinaDatos (verificada el 18/11/2026).
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = "https://api.argentinadatos.com/v1";
const CARPETA = join(process.cwd(), "data", "historico", "tasas");

/** Fecha de hoy en Argentina (UTC−3). */
const hoy = new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

async function traer(ruta) {
  const r = await fetch(`${BASE}/${ruta}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`${ruta} respondió ${r.status}`);
  return r.json();
}

const numero = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
/** Tasas plausibles (fracción): descarta ceros, negativos y valores rotos (como la letra dual con TEA −70 %). */
const tasa = (x) => {
  const v = numero(x);
  return v !== null && v > 0 && v < 3 ? Math.round(v * 1e6) / 1e6 : null;
};

async function plazoFijo() {
  const lista = await traer("finanzas/tasas/plazoFijo");
  const salida = {};
  for (const b of lista) {
    const clientes = tasa(b.tnaClientes);
    const noClientes = tasa(b.tnaNoClientes);
    if (b.entidad && (clientes || noClientes)) salida[b.entidad] = { tna: clientes, tnaNoClientes: noClientes };
  }
  return salida;
}

async function cuentas() {
  const lista = await traer("finanzas/fci/otros/ultimo");
  const salida = {};
  for (const c of lista) {
    const tna = tasa(c.tna);
    if (c.fondo && tna) salida[c.fondo] = { tna, tope: numero(c.tope) || null, fecha: c.fecha ?? null };
  }
  return salida;
}

async function letras() {
  const { letras: lista } = await traer("finanzas/letras");
  const salida = {};
  for (const l of lista) {
    const tea = tasa(numero(l.teaPorcentaje) !== null ? l.teaPorcentaje / 100 : null);
    if (l.ticker && tea && numero(l.precioArs)) salida[l.ticker] = { precio: l.precioArs, tea, vencimiento: l.fechaVencimiento ?? null, dias: numero(l.diasAlVencimiento) };
  }
  return salida;
}

async function main() {
  const partes = await Promise.allSettled([plazoFijo(), cuentas(), letras()]);
  const [pf, cu, le] = partes.map((p) => (p.status === "fulfilled" ? p.value : null));
  partes.forEach((p, i) => p.status === "rejected" && console.warn(`No se pudo guardar ${["plazo fijo", "cuentas", "letras"][i]}: ${p.reason?.message}`));
  if (!pf && !cu && !le) throw new Error("Ninguna fuente respondió: no se guarda nada hoy");

  await mkdir(CARPETA, { recursive: true });
  const archivo = join(CARPETA, `${hoy.slice(0, 7)}.json`);
  let mes = {};
  try {
    mes = JSON.parse(await readFile(archivo, "utf8"));
  } catch {
    // Primer día del mes.
  }
  mes[hoy] = { plazoFijo: pf ?? {}, cuentas: cu ?? {}, letras: le ?? {} };
  const ordenado = Object.fromEntries(Object.entries(mes).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(archivo, `${JSON.stringify(ordenado, null, 1)}\n`);

  // Índice: importa cada mes, así la app los incluye en el build sin leer el disco en tiempo de ejecución.
  const meses = (await readdir(CARPETA)).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort();
  const indice = [
    "// Generado por scripts/guardar-tasas.mjs: no editar a mano.",
    'import type { FotoTasas } from "./tipos";',
    ...meses.map((m, i) => `import m${i} from "./${m}";`),
    "",
    "/** Una foto por día hábil de las tasas, desde que empezamos a guardarlas. */",
    `export const HISTORIAL_TASAS: Record<string, FotoTasas> = { ${meses.map((_, i) => `...(m${i} as Record<string, FotoTasas>)`).join(", ")} };`,
    "",
  ].join("\n");
  await writeFile(join(CARPETA, "index.ts"), indice);
  console.log(`Guardadas las tasas del ${hoy}: ${Object.keys(pf ?? {}).length} bancos, ${Object.keys(cu ?? {}).length} cuentas, ${Object.keys(le ?? {}).length} letras.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
