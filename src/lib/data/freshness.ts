import { pais } from "@/config/countries/ar";
import { esFinDeSemana, hoyAR } from "@/lib/calculos/fechas";
import type { EstadoDato } from "./types";

type ClaseCache = keyof typeof pais.cache;

const feriadosRespaldo: ReadonlySet<string> = new Set(pais.feriadosRespaldo);

/** ¿Está abierto el mercado local? Días hábiles, de 11 a 17 h (configurable en countries/ar.ts). */
export function mercadoAbierto(ahora: Date = new Date(), feriados: ReadonlySet<string> = feriadosRespaldo): boolean {
  const hoy = hoyAR(ahora);
  if (esFinDeSemana(hoy) || feriados.has(hoy)) return false;
  const horaLocal = (ahora.getUTCHours() + 24 + pais.utcOffset) % 24;
  return horaLocal >= pais.mercado.abre && horaLocal < pais.mercado.cierra;
}

/** Segundos de revalidación según el tipo de dato y si el mercado está abierto. */
export function revalidar(clase: ClaseCache, ahora: Date = new Date()): number {
  const [abierto, cerrado] = pais.cache[clase];
  return mercadoAbierto(ahora) ? abierto : cerrado;
}

/**
 * Estado de frescura de un dato "en vivo":
 *  - mercado abierto y dato de hace ≤ 15 min → live; más viejo → delayed
 *  - mercado cerrado y dato del último día hábil → close
 *  - más de un día hábil de atraso → stale
 */
export function estadoEnVivo(asOf: string, ahora: Date = new Date(), siempreAbierto = false): EstadoDato {
  const edadMin = (ahora.getTime() - new Date(asOf).getTime()) / 60_000;
  if (!Number.isFinite(edadMin)) return "stale";
  if (siempreAbierto || mercadoAbierto(ahora)) {
    if (edadMin <= pais.frescura.demoradoMin) return "live";
    if (edadMin <= 24 * 60) return "delayed";
    return "stale";
  }
  // Fuera de horario: vale el cierre del último día hábil (hasta ~4 días por fines de semana largos).
  if (edadMin <= pais.frescura.demoradoMin) return "live";
  return edadMin <= 4 * 24 * 60 ? "close" : "stale";
}

/** Estado para datos diarios o periódicos (tasas, índices): close si están dentro de `maxDias`, si no stale. */
export function estadoPeriodico(asOf: string, maxDias: number, ahora: Date = new Date()): EstadoDato {
  const edadDias = (ahora.getTime() - new Date(asOf).getTime()) / 86_400_000;
  return edadDias <= maxDias ? "close" : "stale";
}

/** El peor estado de un conjunto (para envolver datos combinados). */
export function peorEstado(estados: EstadoDato[]): EstadoDato {
  const orden: EstadoDato[] = ["sample", "stale", "close", "delayed", "live"];
  for (const e of orden) if (estados.includes(e)) return e;
  return "live";
}
