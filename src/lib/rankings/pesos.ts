import { d, gananciaConTope, teaEfectivaConTope } from "@/lib/calculos";
import type { OpcionPesos, TipoOpcionPesos } from "@/lib/data/types";

/**
 * "¿Dónde rinde más tu plata?": ranking de opciones en pesos para un monto y un plazo.
 * REGLA DE NEUTRALIDAD: ordena solo por ganancia en pesos. No conoce a los afiliados.
 */

export type PlazoWidget = 0 | 30 | 60 | 90 | 180;

export type ConsultaRinde = {
  monto: number;
  /** 0 = "hoy": la plata tiene que estar disponible en cualquier momento. */
  plazo: PlazoWidget;
  /** Solo opciones con liquidez inmediata. */
  soloLiquidez: boolean;
};

export type ResultadoRinde = {
  opcion: OpcionPesos;
  /** Días sobre los que se calcula la ganancia (30 cuando el plazo es "hoy"). */
  dias: number;
  /** Ganancia en pesos en esos días. */
  ganancia: number;
  /** TEA efectiva sobre todo el monto (baja si el monto supera el tope). */
  teaEfectiva: number;
  superaTope: boolean;
  /** Proporción contra la mejor opción (0 a 1), para la barra. */
  proporcion: number;
};

/** Días que se usan para mostrar la ganancia. "Hoy" se muestra por mes: es la cuenta que la gente hace. */
export function diasDeCalculo(plazo: PlazoWidget): number {
  return plazo === 0 ? 30 : plazo;
}

/**
 * ¿La opción sirve para este plazo?
 *  - Liquidez inmediata: sirve siempre.
 *  - Plazo fijo y caución: su plazo no puede superar el elegido (se renueva si es más corto).
 *  - LECAP: vence dentro del plazo elegido o hasta 15 días después (lo más parecido a "calzar" el plazo).
 */
export function sirveParaPlazo(opcion: OpcionPesos, consulta: ConsultaRinde): boolean {
  if (opcion.condicionEspecial) return false;
  if (opcion.liquidez === "inmediata") return true;
  if (consulta.soloLiquidez || consulta.plazo === 0) return false;
  if (opcion.plazoDias === null) return true;
  if (opcion.tipo === "lecap") return opcion.plazoDias >= consulta.plazo * 0.5 && opcion.plazoDias <= consulta.plazo + 15;
  return opcion.plazoDias <= consulta.plazo;
}

/** Máximo de resultados por tipo, para que el top no sean cinco variantes de lo mismo. */
const MAXIMO_POR_TIPO: Record<TipoOpcionPesos, number> = { billetera: 2, cuenta: 2, fci: 2, plazo_fijo: 2, caucion: 1, lecap: 1 };

export function dondeRindeMas(opciones: OpcionPesos[], consulta: ConsultaRinde, cantidad = 5): ResultadoRinde[] {
  const dias = diasDeCalculo(consulta.plazo);
  const candidatas = opciones
    .filter((o) => sirveParaPlazo(o, consulta))
    .map((opcion) => {
      const ganancia = gananciaConTope(consulta.monto, opcion.tea, dias, opcion.tope).toNumber();
      const superaTope = opcion.tope !== null && opcion.tope > 0 && consulta.monto > opcion.tope;
      return { opcion, dias, ganancia, superaTope, teaEfectiva: teaEfectivaConTope(consulta.monto, opcion.tea, opcion.tope).toNumber() };
    })
    .filter((r) => Number.isFinite(r.ganancia) && r.ganancia > 0)
    // Orden: más ganancia primero. Desempates neutrales: sin tope antes, luego por nombre.
    .sort((a, b) => b.ganancia - a.ganancia || Number(a.superaTope) - Number(b.superaTope) || a.opcion.nombre.localeCompare(b.opcion.nombre, "es"));

  const porTipo = new Map<TipoOpcionPesos, number>();
  const porProveedor = new Set<string>();
  const elegidas: typeof candidatas = [];
  for (const c of candidatas) {
    const usados = porTipo.get(c.opcion.tipo) ?? 0;
    const claveProveedor = `${c.opcion.tipo}:${c.opcion.proveedorId}`;
    if (usados >= MAXIMO_POR_TIPO[c.opcion.tipo] || porProveedor.has(claveProveedor)) continue;
    porTipo.set(c.opcion.tipo, usados + 1);
    porProveedor.add(claveProveedor);
    elegidas.push(c);
    if (elegidas.length >= cantidad) break;
  }
  const mejor = elegidas[0]?.ganancia ?? 0;
  return elegidas.map((e) => ({ ...e, proporcion: mejor > 0 ? d(e.ganancia).div(mejor).toNumber() : 0 }));
}

export type CriterioPesos = "tea" | "nombre" | "tipo";

/** Comparador unificado: siempre por TEA (peras con peras). */
export function ordenarOpciones(opciones: OpcionPesos[], criterio: CriterioPesos = "tea", descendente = true): OpcionPesos[] {
  const signo = descendente ? -1 : 1;
  return [...opciones].sort((a, b) => {
    if (criterio === "nombre") return signo * -1 * a.nombre.localeCompare(b.nombre, "es");
    if (criterio === "tipo") return a.tipo.localeCompare(b.tipo) || b.tea - a.tea;
    return signo * (a.tea - b.tea) || a.nombre.localeCompare(b.nombre, "es");
  });
}

/**
 * La mejor opción comparable de cada tipo (billetera, cuenta, fondo, plazo fijo a 30 días, caución, LECAP),
 * ordenadas por TEA. Es el ranking de la historia de la home. Neutral: solo lee la tasa.
 */
export function mejorDeCadaTipo(opciones: OpcionPesos[]): OpcionPesos[] {
  const mejor = new Map<OpcionPesos["tipo"], OpcionPesos>();
  for (const o of opciones) {
    if (o.condicionEspecial) continue;
    if (o.tipo === "plazo_fijo" && o.plazoDias !== 30) continue;
    const actual = mejor.get(o.tipo);
    if (!actual || o.tea > actual.tea || (o.tea === actual.tea && o.nombre.localeCompare(actual.nombre, "es") < 0)) mejor.set(o.tipo, o);
  }
  return ordenarOpciones([...mejor.values()]);
}

/** Mejor opción con liquidez inmediata y mejor opción a ~30 días (para "La foto de hoy" y el pulso). */
export function mejoresDelDia(opciones: OpcionPesos[]): { liquida: OpcionPesos | null; a30: OpcionPesos | null } {
  const comparables = opciones.filter((o) => !o.condicionEspecial);
  const mejor = (lista: OpcionPesos[]) => lista.reduce<OpcionPesos | null>((m, o) => (!m || o.tea > m.tea ? o : m), null);
  return {
    liquida: mejor(comparables.filter((o) => o.liquidez === "inmediata" && (o.tope === null || o.tope >= 1_000_000))),
    a30: mejor(comparables.filter((o) => o.liquidez !== "inmediata" && o.plazoDias !== null && o.plazoDias >= 20 && o.plazoDias <= 45)),
  };
}
