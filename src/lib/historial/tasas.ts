import type { FotoTasas } from "@data/historico/tasas/tipos";
import { d } from "@/lib/calculos";

/**
 * Historial de tasas que guardamos cada día hábil (scripts/guardar-tasas.mjs): series por banco o por cuenta y cuánto
 * cambiaron desde que empezamos. Puro: recibe el historial y devuelve números.
 */

export type PuntoTasa = { fecha: string; tna: number };

/** Serie de una tasa a lo largo de los días guardados (se saltean los días en que no informó). */
export function serieDe(historial: Record<string, FotoTasas>, elegir: (f: FotoTasas) => number | null | undefined): PuntoTasa[] {
  return Object.keys(historial)
    .sort()
    .map((fecha) => ({ fecha, tna: elegir(historial[fecha]!) }))
    .filter((p): p is PuntoTasa => typeof p.tna === "number" && p.tna > 0);
}

export type CambioTasa = {
  entidad: string;
  serie: PuntoTasa[];
  actual: number;
  /** Diferencia en puntos (fracción: 0,01 = 1 punto) entre la última tasa y la primera guardada. */
  cambio: number;
  desde: string;
};

/** La tasa a 30 días de cada banco (para clientes) y cuánto cambió, ordenados por tasa actual. */
export function cambiosPlazoFijo(historial: Record<string, FotoTasas>): CambioTasa[] {
  const entidades = new Set(Object.values(historial).flatMap((f) => Object.keys(f.plazoFijo)));
  const salida: CambioTasa[] = [];
  for (const entidad of entidades) {
    const serie = serieDe(historial, (f) => f.plazoFijo[entidad]?.tna ?? f.plazoFijo[entidad]?.tnaNoClientes);
    const primera = serie[0];
    const ultima = serie.at(-1);
    if (!primera || !ultima) continue;
    salida.push({ entidad, serie, actual: ultima.tna, cambio: d(ultima.tna).minus(primera.tna).toNumber(), desde: primera.fecha });
  }
  return salida.sort((a, b) => b.actual - a.actual || a.entidad.localeCompare(b.entidad, "es"));
}

/** Primer y último día guardados, y cuántos días hay. */
export function rangoHistorial(historial: Record<string, FotoTasas>): { desde: string; hasta: string; dias: number } | null {
  const fechas = Object.keys(historial).sort();
  if (fechas.length === 0) return null;
  return { desde: fechas[0]!, hasta: fechas.at(-1)!, dias: fechas.length };
}
