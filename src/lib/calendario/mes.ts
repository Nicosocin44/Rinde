import { esFinDeSemana, sumarDias, sumarMeses, type FechaISO } from "@/lib/calculos/fechas";
import { diasHabiles, lunesDe, type DiaCalendario, type EventoCalendario, type PaisEvento, type SemanaCalendario, type TipoEvento } from "./semana";

/**
 * El calendario del mes de Mercados (punto 26): las semanas que lo cubren, de lunes a viernes, armadas con los mismos
 * datos que la semana. Puro: recibe las semanas y devuelve el mes; los filtros se aplican en el navegador.
 */

/** Un mes: "2026-11". */
export type MesISO = string;

/** Un día de la grilla del mes; los de los bordes (otro mes) se ven apagados. */
export type DiaMes = DiaCalendario & { enMes: boolean };
export type MesCalendario = { mes: MesISO; semanas: DiaMes[][] };

const FORMATO_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export const sumarMesesISO = (mes: MesISO, n: number): MesISO => sumarMeses(`${mes}-01`, n).slice(0, 7);

/** El mes que se muestra al abrir: el de hoy; el fin de semana, el del lunes que viene (así el último sábado ya muestra el siguiente). */
export function mesInicial(hoy: FechaISO): MesISO {
  return (esFinDeSemana(hoy) ? lunesDe(sumarDias(hoy, 2)) : hoy).slice(0, 7);
}

/** Hasta dónde se puede ir: el mes pasado, este y los dos que vienen. Más adelante las fuentes casi no publican nada. */
export function mesPermitido(mes: string, hoy: FechaISO): boolean {
  if (!FORMATO_MES.test(mes)) return false;
  const base = mesInicial(hoy);
  return mes >= sumarMesesISO(base, -1) && mes <= sumarMesesISO(base, 2);
}

/** Los lunes de las semanas que tienen al menos un día hábil del mes, en orden. */
export function lunesDelMes(mes: MesISO): FechaISO[] {
  const ultimo = sumarDias(sumarMeses(`${mes}-01`, 1), -1);
  const lunes: FechaISO[] = [];
  for (let l = lunesDe(`${mes}-01`); l <= ultimo; l = sumarDias(l, 7)) if (diasHabiles(l).some((d) => d.startsWith(mes))) lunes.push(l);
  return lunes;
}

/** Junta las semanas en el mes. */
export function armarMes(mes: MesISO, semanas: SemanaCalendario[]): MesCalendario {
  return { mes, semanas: semanas.map((s) => s.dias.map((d) => ({ ...d, enMes: d.fecha.startsWith(mes) }))) };
}

// ───────────────────────── Filtros ─────────────────────────

export type FiltroTipo = "todo" | "dato" | "tasa" | "empresa" | "bonos" | "opciones";
export type FiltroPais = "todos" | PaisEvento;

/** Qué tipos entran en cada filtro: "Bonos y letras" junta los pagos de bonos y los vencimientos de LECAPs. */
const TIPOS_DEL_FILTRO: Record<Exclude<FiltroTipo, "todo">, TipoEvento[]> = { dato: ["dato"], tasa: ["tasa"], empresa: ["empresa"], bonos: ["bonos", "lecap"], opciones: ["opciones"] };

/** Los feriados se ven con cualquier tipo (explican por qué ese día no hay nada), pero respetan el país. */
export function pasaFiltro(e: EventoCalendario, tipo: FiltroTipo, pais: FiltroPais): boolean {
  if (pais !== "todos" && e.pais !== pais) return false;
  return e.tipo === "feriado" || tipo === "todo" || TIPOS_DEL_FILTRO[tipo].includes(e.tipo);
}

/** El día con los filtros aplicados. Las empresas de más ("+N") no se sabe de qué país son: solo se cuentan sin filtro de país. */
export function filtrarDia(d: DiaMes, tipo: FiltroTipo, pais: FiltroPais): DiaMes {
  const conEmpresas = tipo === "todo" || tipo === "empresa";
  return {
    ...d,
    eventos: d.eventos.filter((e) => pasaFiltro(e, tipo, pais)),
    empresas: d.empresas.filter((e) => pasaFiltro(e, tipo, pais)),
    masEmpresas: conEmpresas && pais === "todos" ? d.masEmpresas : 0,
  };
}
