import { diferenciaMensual, habilesEntre, teaCapitalizacionDiaria } from "@/lib/calculos";
import type { PosicionValuada } from "@/lib/calculos";
import type { OpcionPesos } from "@/lib/data/types";
import { diaCercano, pesos, porcentaje, puntos } from "@/lib/format";

/**
 * Motor de ideas: "¿dónde rendiría más mi plata?". Reglas deterministas, testeadas y explicables
 * (PRODUCTO.md §8). Cada idea trae la cuenta a la vista y el disclaimer. Nunca dice "comprá" ni "vendé".
 * REGLA DE NEUTRALIDAD: no conoce el registro de afiliados.
 */

export type Idea = {
  id: string;
  regla: "liquidez" | "vencimiento" | "curva" | "perdida_real" | "concentracion" | "moneda";
  titulo: string;
  /** La cuenta, en una o dos líneas. */
  cuenta: string;
  /** Impacto en pesos por mes, si aplica (para ordenar). */
  impactoMensual?: number;
  enlace?: { etiqueta: string; href: string };
};

export const DISCLAIMER_IDEAS = "Es una comparación, no una recomendación.";

export type EntradaIdeas = {
  posiciones: PosicionValuada[];
  total: number;
  hoy: string;
  feriados: ReadonlySet<string>;
  mejorLiquida: OpcionPesos | null;
  mejorPlazoFijo30: OpcionPesos | null;
  lecaps: OpcionPesos[];
  /** Rendimiento de la cartera en pesos desde el inicio (TWR) y la inflación del mismo período. */
  rendimientoArs: number | null;
  inflacionPeriodo: number | null;
  mesesPeriodo: number;
  /** Objetivo de pesos en la cartera (0 a 1), si la persona lo fijó. */
  objetivoPesos: number | null;
};

export function generarIdeas(e: EntradaIdeas): Idea[] {
  const ideas: Idea[] = [];

  // 1. Liquidez mejorable: saldo en billetera o cuenta con TNA ≥ 2 pp por debajo de la mejor con liquidez inmediata.
  if (e.mejorLiquida) {
    for (const p of e.posiciones) {
      if (p.activo.tipo !== "billetera" || !p.activo.tna) continue;
      const brecha = e.mejorLiquida.tna - p.activo.tna;
      if (brecha < 0.02) continue;
      const monto = p.valorArs.toNumber();
      const teaActual = teaCapitalizacionDiaria(p.activo.tna).toNumber();
      const extra = diferenciaMensual(Math.min(monto, e.mejorLiquida.tope ?? Infinity), teaActual, e.mejorLiquida.tea).toNumber();
      if (extra < 500) continue;
      ideas.push({
        id: `liquidez-${p.activoId}`,
        regla: "liquidez",
        titulo: `Tus ${pesos(monto)} en ${p.activo.nombre} podrían rendir más`,
        cuenta: `Rinden ${porcentaje(p.activo.tna, 1)} TNA; en ${e.mejorLiquida.nombre} rendirían ${porcentaje(e.mejorLiquida.tna, 1)}, también disponibles al instante: son ≈ ${pesos(extra, 0)} más por mes.`,
        impactoMensual: extra,
        enlace: { etiqueta: "Ver todas las opciones", href: "/pesos/billeteras" },
      });
    }
  }

  // 2. Vencimiento próximo: plazo fijo o LECAP que vence en ≤ 3 días hábiles.
  for (const p of e.posiciones) {
    const v = p.activo.vencimiento;
    if (!v || (p.activo.tipo !== "plazo_fijo" && p.activo.tipo !== "lecap") || v < e.hoy) continue;
    const habiles = habilesEntre(e.hoy, v, e.feriados);
    if (habiles > 3) continue;
    const mejor = e.mejorPlazoFijo30;
    ideas.push({
      id: `vencimiento-${p.activoId}`,
      regla: "vencimiento",
      titulo: `Tu ${p.activo.tipo === "plazo_fijo" ? "plazo fijo" : p.activo.nombre} vence ${diaCercano(v, e.hoy)}`,
      cuenta: mejor
        ? `Cobrás ${pesos(p.valorArs.toNumber())}. Hoy la mejor tasa a 30 días es ${porcentaje(mejor.tna, 1)} TNA en ${mejor.nombre}${p.activo.tna ? ` (la tuya era ${porcentaje(p.activo.tna, 1)})` : ""}.`
        : `Cobrás ${pesos(p.valorArs.toNumber())}.`,
      enlace: { etiqueta: "Comparar tasas a 30 días", href: "/pesos/plazo-fijo" },
    });
  }

  // 3. Curva contra plazo fijo: una LECAP rinde ≥ 1,5 pp más que el mejor plazo fijo a plazo parecido (informativa).
  const tienePlazoFijo = e.posiciones.some((p) => p.activo.tipo === "plazo_fijo");
  if (tienePlazoFijo && e.mejorPlazoFijo30) {
    const lecap = e.lecaps.filter((l) => l.plazoDias !== null && l.plazoDias >= 20 && l.plazoDias <= 75).sort((a, b) => b.tea - a.tea)[0];
    if (lecap && lecap.tea - e.mejorPlazoFijo30.tea >= 0.015) {
      ideas.push({
        id: `curva-${lecap.id}`,
        regla: "curva",
        titulo: `A ${lecap.plazoDias} días, una letra rinde más que el plazo fijo`,
        cuenta: `La ${lecap.nombre} rinde ${porcentaje(lecap.tea, 1)} TEA contra ${porcentaje(e.mejorPlazoFijo30.tea, 1)} del mejor plazo fijo a 30 días. Requiere cuenta en un broker y no tiene garantía de depósitos.`,
        enlace: { etiqueta: "Ver la curva de LECAPs", href: "/pesos/lecaps" },
      });
    }
  }

  // 4. Pérdida real: el rendimiento en pesos del período quedó por debajo de la inflación.
  if (e.rendimientoArs !== null && e.inflacionPeriodo !== null && e.mesesPeriodo >= 3 && e.rendimientoArs < e.inflacionPeriodo) {
    ideas.push({
      id: "perdida-real",
      regla: "perdida_real",
      titulo: "Tu cartera rindió menos que la inflación",
      cuenta: `En los últimos ${e.mesesPeriodo} meses rindió ${porcentaje(e.rendimientoArs, 1)} en pesos y la inflación fue ${porcentaje(e.inflacionPeriodo, 1)}.`,
      enlace: { etiqueta: "Ver dónde rinde más", href: "/pesos" },
    });
  }

  // 5. Concentración: un instrumento por encima del 40 % (informativa, sin juicio).
  if (e.total > 0) {
    for (const p of e.posiciones) {
      const f = p.valorArs.toNumber() / e.total;
      if (f > 0.4 && e.posiciones.length > 1) {
        ideas.push({ id: `concentracion-${p.activoId}`, regla: "concentracion", titulo: `El ${porcentaje(f, 0)} de tu cartera está en un solo activo`, cuenta: `${p.activo.nombre} pesa ${porcentaje(f, 1)} del total.` });
      }
    }
  }

  // 6. Moneda: exposición en pesos lejos del objetivo que fijó la persona (± 10 pp).
  if (e.objetivoPesos !== null && e.total > 0) {
    const enPesos = e.posiciones.filter((p) => p.activo.moneda === "ARS").reduce((s, p) => s + p.valorArs.toNumber(), 0) / e.total;
    if (Math.abs(enPesos - e.objetivoPesos) >= 0.1) {
      ideas.push({
        id: "moneda",
        regla: "moneda",
        titulo: `Tu objetivo era ${porcentaje(e.objetivoPesos, 0)} en pesos y hoy estás en ${porcentaje(enPesos, 0)}`,
        cuenta: `Es una diferencia de ${puntos(enPesos - e.objetivoPesos, 0)} contra tu objetivo de ${porcentaje(e.objetivoPesos, 0)} en pesos y ${porcentaje(1 - e.objetivoPesos, 0)} en dólares.`,
      });
    }
  }

  const prioridad: Record<Idea["regla"], number> = { vencimiento: 0, liquidez: 1, perdida_real: 2, curva: 3, moneda: 4, concentracion: 5 };
  return ideas.sort((a, b) => prioridad[a.regla] - prioridad[b.regla] || (b.impactoMensual ?? 0) - (a.impactoMensual ?? 0));
}
