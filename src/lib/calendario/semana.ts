import { esFinDeSemana, sumarDias, type FechaISO } from "@/lib/calculos/fechas";

/**
 * Calendario semanal de Mercados (punto 15): lo que pasa cada día hábil de la semana, en dos o tres palabras.
 * Puro: recibe lo que trajeron las fuentes y devuelve la semana armada.
 */

export type PaisEvento = "AR" | "US";
export type TipoEvento = "dato" | "tasa" | "empresa" | "bonos" | "lecap" | "opciones" | "feriado";

export type EventoCalendario = {
  id: string;
  fecha: FechaISO;
  tipo: TipoEvento;
  pais: PaisEvento;
  /** Lo que se ve en el calendario: una o dos palabras ("IPC", "Tasa Fed", "Pago bonos"). */
  etiqueta: string;
  /** Lo que se ve al tocarlo: una línea. */
  detalle: string;
  /** Hora argentina ("16:00"), si se sabe. */
  hora?: string;
  /** Empresas: ticker local, para el logo y el link a la ficha. */
  ticker?: string;
  href?: string;
};

export type DiaCalendario = { fecha: FechaISO; eventos: EventoCalendario[]; empresas: EventoCalendario[]; masEmpresas: number };
export type SemanaCalendario = { lunes: FechaISO; dias: DiaCalendario[] };

// ───────────────────────── Semanas ─────────────────────────

/** El lunes de la semana de `fecha`. */
export function lunesDe(fecha: FechaISO): FechaISO {
  const dia = new Date(`${fecha.slice(0, 10)}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, dia === 0 ? -6 : 1 - dia);
}

/** La semana que se muestra al entrar: la actual; el sábado y el domingo, la que viene. */
export function semanaInicial(hoy: FechaISO): FechaISO {
  return esFinDeSemana(hoy) ? lunesDe(sumarDias(hoy, 2)) : lunesDe(hoy);
}

export const diasHabiles = (lunes: FechaISO): FechaISO[] => [0, 1, 2, 3, 4].map((k) => sumarDias(lunes, k));

/** Hasta dónde se puede navegar: una semana para atrás y cuatro para adelante. */
export function semanaPermitida(lunes: FechaISO, hoy: FechaISO): boolean {
  if (lunesDe(lunes) !== lunes) return false;
  const base = semanaInicial(hoy);
  return lunes >= sumarDias(base, -7) && lunes <= sumarDias(base, 28);
}

// ───────────────────────── INDEC ─────────────────────────

/** "… Noviembre de 2026" → "noviembre"; "… Tercer trimestre de 2026" → "tercer trimestre". */
function periodo(titulo: string): string | null {
  const m = /\.\s*([A-Za-zÁÉÍÓÚáéíóúñ ]+?) de (\d{4})\s*$/.exec(titulo);
  return m ? m[1]!.trim().toLowerCase() : null;
}

const INDEC: { patron: RegExp; etiqueta: string; detalle: (p: string | null) => string }[] = [
  { patron: /^Índice de precios al consumidor \(IPC\)/i, etiqueta: "IPC", detalle: (p) => `Inflación${p ? ` de ${p}` : ""}` },
  { patron: /^Estimador mensual de actividad económica/i, etiqueta: "EMAE", detalle: (p) => `Actividad económica${p ? ` de ${p}` : ""}` },
  { patron: /^Informe de avance del nivel de actividad/i, etiqueta: "PBI", detalle: (p) => `PBI${p ? ` del ${p}` : ""}` },
  { patron: /^Intercambio comercial argentino/i, etiqueta: "Balanza", detalle: (p) => `Comercio exterior${p ? ` de ${p}` : ""}` },
  { patron: /^Mercado de trabajo\. Tasas e indicadores/i, etiqueta: "Desempleo", detalle: (p) => `Desempleo${p ? ` del ${p}` : ""}` },
  { patron: /pobreza/i, etiqueta: "Pobreza", detalle: (p) => `Pobreza${p ? ` del ${p}` : ""}` },
  { patron: /^Índice de salarios/i, etiqueta: "Salarios", detalle: (p) => `Salarios${p ? ` de ${p}` : ""}` },
];

/** Un informe del INDEC → evento, solo si es de los que mueven el mercado. */
export function eventoIndec(informe: { fecha: string; hora: string; titulo: string }): EventoCalendario | null {
  const regla = INDEC.find((r) => r.patron.test(informe.titulo));
  if (!regla) return null;
  return { id: `indec-${regla.etiqueta}-${informe.fecha}`, fecha: informe.fecha, tipo: "dato", pais: "AR", etiqueta: regla.etiqueta, detalle: `${regla.detalle(periodo(informe.titulo))} · INDEC`, hora: informe.hora };
}

// ───────────────────────── EE.UU. ─────────────────────────

/** Horas de Nueva York → hora argentina (UTC−3), con el horario de verano de EE.UU. según la fecha. */
export function horaArgentina(fecha: FechaISO, horaNY: string): string {
  const [h, mi] = horaNY.split(":").map(Number);
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "shortOffset" }).formatToParts(new Date(`${fecha}T12:00:00Z`));
  const desfase = Number(/GMT([+-]\d+)/.exec(partes.find((p) => p.type === "timeZoneName")?.value ?? "")?.[1] ?? -5);
  const minutos = ((((h ?? 0) - desfase - 3) * 60 + (mi ?? 0)) % 1440 + 1440) % 1440;
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

const EEUU: Record<string, { etiqueta: string; detalle: string }> = {
  CPI: { etiqueta: "Inflación", detalle: "Inflación de EE.UU., mensual" },
  "Nonfarm Payrolls": { etiqueta: "Empleo", detalle: "Empleos creados en EE.UU." },
  "PCE price index": { etiqueta: "PCE", detalle: "Inflación PCE (la que mira la Fed), mensual" },
  GDP: { etiqueta: "PBI", detalle: "PBI de EE.UU., anualizado" },
};

/** Un dato de EE.UU. (Nasdaq) → evento, solo los que mueven el mercado. */
export function eventoEEUU(e: { fecha: string; horaNY: string | null; nombre: string; anterior: string | null; esperado: string | null; real: string | null }): EventoCalendario | null {
  const regla = EEUU[e.nombre];
  if (!regla) return null;
  const numeros = [e.real && `dio ${e.real}`, e.esperado && `esperado ${e.esperado}`, e.anterior && `anterior ${e.anterior}`].filter(Boolean).join(" · ");
  return {
    id: `us-${regla.etiqueta}-${e.fecha}`,
    fecha: e.fecha,
    tipo: "dato",
    pais: "US",
    etiqueta: regla.etiqueta,
    detalle: numeros ? `${regla.detalle} · ${numeros}` : regla.detalle,
    hora: e.horaNY ? horaArgentina(e.fecha, e.horaNY) : undefined,
  };
}

/** Decisión de tasa de la Fed: 14 h de Nueva York. */
export const eventoFed = (fecha: FechaISO): EventoCalendario => ({ id: `fed-${fecha}`, fecha, tipo: "tasa", pais: "US", etiqueta: "Tasa Fed", detalle: "Decisión de tasa de la Reserva Federal", hora: horaArgentina(fecha, "14:00") });

// ───────────────────────── Empresas ─────────────────────────

/** ADRs argentinos en Nueva York → ticker local (para el logo y la ficha). */
export const ADRS: Record<string, string> = {
  GGAL: "GGAL", YPF: "YPFD", BMA: "BMA", PAM: "PAMP", TGS: "TGSU2", CEPU: "CEPU", EDN: "EDN", LOMA: "LOMA", SUPV: "SUPV", BBAR: "BBAR", TEO: "TECO2", IRS: "IRSA", CRESY: "CRES", VIST: "VIST",
};

/** Cuántas empresas se ven por día; el resto queda en "+N". */
export const EMPRESAS_POR_DIA = 4;

/**
 * Empresas del día que importan acá: las argentinas (ADRs) y las que tienen CEDEAR. Primero las argentinas, después
 * por tamaño (capitalización). Así el calendario no se llena de empresas que nadie opera desde Argentina.
 */
export function empresasDelDia(fecha: FechaISO, filas: { simbolo: string; nombre: string; momento: "antes" | "despues" | null; capitalizacion: number }[], cedears: ReadonlySet<string>) {
  const relevantes = filas
    .filter((f) => ADRS[f.simbolo] || cedears.has(f.simbolo))
    .sort((a, b) => Number(!!ADRS[b.simbolo]) - Number(!!ADRS[a.simbolo]) || b.capitalizacion - a.capitalizacion);
  const unicas = [...new Map(relevantes.map((f) => [f.simbolo, f])).values()];
  const eventos = unicas.map((f): EventoCalendario => {
    const local = ADRS[f.simbolo] ?? f.simbolo;
    const cuando = f.momento === "antes" ? " · antes de la apertura en Nueva York" : f.momento === "despues" ? " · después del cierre en Nueva York" : "";
    return { id: `emp-${f.simbolo}-${fecha}`, fecha, tipo: "empresa", pais: ADRS[f.simbolo] ? "AR" : "US", etiqueta: f.simbolo, detalle: `${f.nombre} presenta resultados${cuando}`, ticker: local, href: `/activo/${local}` };
  });
  return { empresas: eventos.slice(0, EMPRESAS_POR_DIA), masEmpresas: Math.max(0, eventos.length - EMPRESAS_POR_DIA) };
}

// ───────────────────────── La semana ─────────────────────────

const ORDEN: Record<TipoEvento, number> = { feriado: 0, tasa: 1, dato: 2, opciones: 3, bonos: 4, lecap: 5, empresa: 6 };

/** Junta todo en los cinco días hábiles, sin repetidos y en un orden fijo (feriado, tasas, datos, vencimientos). */
export function armarSemana(lunes: FechaISO, eventos: EventoCalendario[], empresasPorDia: Record<string, { empresas: EventoCalendario[]; masEmpresas: number }>): SemanaCalendario {
  const unicos = [...new Map(eventos.map((e) => [e.id, e])).values()];
  return {
    lunes,
    dias: diasHabiles(lunes).map((fecha) => ({
      fecha,
      eventos: unicos.filter((e) => e.fecha === fecha && e.tipo !== "empresa").sort((a, b) => ORDEN[a.tipo] - ORDEN[b.tipo] || (a.hora ?? "").localeCompare(b.hora ?? "")),
      empresas: empresasPorDia[fecha]?.empresas ?? [],
      masEmpresas: empresasPorDia[fecha]?.masEmpresas ?? 0,
    })),
  };
}

