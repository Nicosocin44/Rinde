import type { AlternativaMeta, InstrumentoMeta } from "@/lib/calculos/metas";
import type { OpcionPesos } from "@/lib/data/types";
import { mejorDeCadaTipo } from "@/lib/rankings/pesos";

/**
 * Dónde puede estar la plata de una meta. En pesos: las opciones reales del comparador (con la TEA de hoy), más
 * "sin invertir" y "otro" con una TEA a mano. En dólares: dólares guardados u otro con su rendimiento.
 */

export const SIN_INVERTIR: InstrumentoMeta = { id: "efectivo", nombre: "Sin invertir (efectivo o cuenta)", tipo: "efectivo", tea: 0 };
export const DOLARES_GUARDADOS: InstrumentoMeta = { id: "dolares", nombre: "Dólares guardados", tipo: "dolares", tea: 0 };

/** Lo mínimo de cada opción del comparador que viaja al navegador para elegir instrumento. */
export type OpcionInstrumento = Pick<OpcionPesos, "id" | "nombre" | "tipo" | "tea" | "plazoDias">;

export const TIPOS_INSTRUMENTO: Record<string, string> = {
  billetera: "Billeteras",
  cuenta: "Cuentas remuneradas",
  fci: "Fondos de dinero",
  plazo_fijo: "Plazos fijos",
  caucion: "Caución",
  lecap: "Letras del Tesoro",
  efectivo: "Sin invertir",
  dolares: "Dólares",
  otro: "Otro",
};

/** Cuántas opciones por tipo se ofrecen (las que más rinden): el selector no tiene que ser un muro de 120 filas. */
const POR_TIPO = 12;

/** Recorta las opciones del comparador para el selector: sin condiciones especiales, las mejores de cada tipo. */
export function opcionesParaMetas(opciones: OpcionPesos[]): OpcionInstrumento[] {
  const porTipo = new Map<string, OpcionInstrumento[]>();
  for (const o of [...opciones].filter((x) => !x.condicionEspecial).sort((a, b) => b.tea - a.tea)) {
    const lista = porTipo.get(o.tipo) ?? [];
    if (lista.length < POR_TIPO) lista.push({ id: o.id, nombre: o.nombre, tipo: o.tipo, tea: o.tea, plazoDias: o.plazoDias });
    porTipo.set(o.tipo, lista);
  }
  return [...porTipo.values()].flat();
}

/** Tipos con vencimiento: la plata queda hasta el plazo (se muestra cuándo vence). */
const CON_VENCIMIENTO = new Set(["plazo_fijo", "lecap", "caucion"]);

export function aInstrumento(o: OpcionInstrumento): InstrumentoMeta {
  const plazo = o.tipo === "plazo_fijo" && o.plazoDias ? ` a ${o.plazoDias} días` : "";
  const plazoDias = CON_VENCIMIENTO.has(o.tipo) && o.plazoDias ? o.plazoDias : null;
  return { id: o.id, nombre: `${o.nombre}${plazo}`, tipo: o.tipo, tea: o.tea, plazoDias };
}

/** Una alternativa para "¿dónde rinde más lo de cada mes?", con su liquidez para que se entienda qué implica. */
export type AlternativaUI = AlternativaMeta & { liquidez: OpcionPesos["liquidez"]; plazoDias: number | null; tope: number | null };

/** La mejor opción comparable de cada tipo (el mismo ranking neutral de la home: solo lee la tasa). */
export function alternativasParaMetas(opciones: OpcionPesos[]): AlternativaUI[] {
  return mejorDeCadaTipo(opciones).map((o) => ({ id: o.id, nombre: aInstrumento(o).nombre, tipo: o.tipo, tea: o.tea, liquidez: o.liquidez, plazoDias: o.plazoDias, tope: o.tope }));
}
