/**
 * Fechas como string ISO "AAAA-MM-DD" (sin hora, sin zona): evita corrimientos por huso.
 * Todas las cuentas de días usan UTC.
 */

export type FechaISO = string;

const MS_DIA = 86_400_000;

export function aUTC(fecha: FechaISO): number {
  const [y, m, dd] = fecha.slice(0, 10).split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, dd ?? 1);
}

export function desdeUTC(ms: number): FechaISO {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Días corridos entre dos fechas (hasta − desde). */
export function diasEntre(desde: FechaISO, hasta: FechaISO): number {
  return Math.round((aUTC(hasta) - aUTC(desde)) / MS_DIA);
}

export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  return desdeUTC(aUTC(fecha) + dias * MS_DIA);
}

export function sumarMeses(fecha: FechaISO, meses: number): FechaISO {
  const [y, m, dd] = fecha.slice(0, 10).split("-").map(Number);
  const base = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(dd ?? 1, ultimo));
  return base.toISOString().slice(0, 10);
}

export function esFinDeSemana(fecha: FechaISO): boolean {
  const dia = new Date(aUTC(fecha)).getUTCDay();
  return dia === 0 || dia === 6;
}

export function esHabil(fecha: FechaISO, feriados: ReadonlySet<FechaISO>): boolean {
  return !esFinDeSemana(fecha) && !feriados.has(fecha);
}

/** Suma `n` días hábiles (n ≥ 0). Con n = 0 devuelve la misma fecha si es hábil, o el próximo hábil. */
export function sumarHabiles(fecha: FechaISO, n: number, feriados: ReadonlySet<FechaISO>): FechaISO {
  let actual = fecha;
  while (!esHabil(actual, feriados)) actual = sumarDias(actual, 1);
  let restantes = n;
  while (restantes > 0) {
    actual = sumarDias(actual, 1);
    if (esHabil(actual, feriados)) restantes--;
  }
  return actual;
}

/** Días hábiles entre dos fechas (excluye `desde`, incluye `hasta`). */
export function habilesEntre(desde: FechaISO, hasta: FechaISO, feriados: ReadonlySet<FechaISO>): number {
  let n = 0;
  let actual = desde;
  const fin = aUTC(hasta);
  while (aUTC(actual) < fin) {
    actual = sumarDias(actual, 1);
    if (esHabil(actual, feriados)) n++;
  }
  return n;
}

/** Fecha de liquidación: CI = T+0, 24 hs = T+1 hábil. */
export function fechaLiquidacion(hoy: FechaISO, plazo: "ci" | "24hs", feriados: ReadonlySet<FechaISO>): FechaISO {
  return sumarHabiles(hoy, plazo === "ci" ? 0 : 1, feriados);
}

/** Fecha de hoy en Argentina (UTC−3), sin depender del huso del servidor. */
export function hoyAR(ahora: Date = new Date()): FechaISO {
  return new Date(ahora.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}
