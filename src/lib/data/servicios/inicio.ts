import { LECAPS } from "@data/ar/lecaps";
import { BONOS_USD } from "@data/ar/bonos-usd";
import { cronograma, diasEntre, hoyAR } from "@/lib/calculos";
import { delta, porcentaje } from "@/lib/format";
import { mejoresDelDia } from "@/lib/rankings/pesos";
import { mercadoAbierto } from "../freshness";
import type { CotizacionDolar, CurvaLecaps, Macro, OpcionPesos, Pulso } from "../types";

/** Barra de pulso: cuatro valores quietos que se actualizan. */
export function armarPulso(cotizaciones: CotizacionDolar[] | null, macro: Macro | null, opciones: OpcionPesos[] | null): Pulso {
  const mep = cotizaciones?.find((c) => c.id === "mep");
  const oficial = cotizaciones?.find((c) => c.id === "oficial");
  const mejor = opciones ? mejoresDelDia(opciones).liquida : null;
  return {
    mep: mep ? { valor: mep.venta, variacion: mep.variacion } : null,
    oficial: oficial ? { valor: oficial.venta, variacion: oficial.variacion } : null,
    riesgoPais: macro?.riesgoPais ? { valor: macro.riesgoPais.valor, variacion: macro.riesgoPais.variacion } : null,
    mejorTasa: mejor ? { tna: mejor.tna, tea: mejor.tea, nombre: mejor.nombre, tipo: mejor.tipo } : null,
    mercadoAbierto: mercadoAbierto(),
  };
}

/**
 * "¿Qué pasó hoy?" en dos líneas, armado con reglas (v1). Solo dice lo que los datos muestran.
 * Más adelante lo redacta una IA a partir de los mismos datos, citando fuentes.
 */
export function resumenDelDia(cotizaciones: CotizacionDolar[] | null, macro: Macro | null, curva: CurvaLecaps | null): string[] {
  const frases: string[] = [];
  const mep = cotizaciones?.find((c) => c.id === "mep");
  const oficial = cotizaciones?.find((c) => c.id === "oficial");
  if (mep?.variacion !== null && mep?.variacion !== undefined) {
    const v = mep.variacion;
    const verbo = Math.abs(v) < 0.001 ? "quedó estable" : v > 0 ? `subió ${delta(v).replace("+", "")}` : `bajó ${delta(v).replace("−", "")}`;
    const brecha = mep.brecha !== null ? ` y la brecha con el oficial es de ${porcentaje(mep.brecha, 1)}` : "";
    frases.push(`El MEP ${verbo}${brecha}.`);
  } else if (oficial) {
    frases.push(`El oficial cotiza a $ ${Math.round(oficial.venta)}.`);
  }
  const enCurva = curva?.letras.filter((l) => l.enCurva) ?? [];
  if (enCurva.length >= 2) {
    const min = Math.min(...enCurva.map((l) => l.tea));
    const max = Math.max(...enCurva.map((l) => l.tea));
    frases.push(`Las LECAPs rinden entre ${porcentaje(min, 1)} y ${porcentaje(max, 1)} TEA.`);
  }
  if (macro?.riesgoPais?.variacion !== null && macro?.riesgoPais?.variacion !== undefined) {
    const v = macro.riesgoPais.variacion;
    const puntos = Math.round(Math.abs(macro.riesgoPais.valor - macro.riesgoPais.valor / (1 + v)));
    frases.push(
      puntos === 0
        ? `El riesgo país sigue en ${macro.riesgoPais.valor} puntos.`
        : `El riesgo país ${v > 0 ? "subió" : "bajó"} ${puntos} ${puntos === 1 ? "punto" : "puntos"}, a ${macro.riesgoPais.valor}.`,
    );
  }
  return frases.slice(0, 3);
}

export type Evento = { fecha: string; titulo: string; tipo: "vencimiento" | "pago" | "feriado" | "dato" };

/** Próximos eventos derivados de datos ciertos: vencimientos de letras, pagos de bonos y feriados. */
export function proximosEventos(feriados: ReadonlySet<string>, hoy = hoyAR(), cantidad = 5): Evento[] {
  const eventos: Evento[] = [];
  for (const l of LECAPS) eventos.push({ fecha: l.vencimiento, titulo: `Vence ${l.tipo} ${l.ticker}`, tipo: "vencimiento" });
  const pagosBonos = new Set<string>();
  for (const b of BONOS_USD) for (const f of cronograma(b)) pagosBonos.add(f.fecha);
  for (const f of pagosBonos) eventos.push({ fecha: f, titulo: "Pagan los Bonares y Globales", tipo: "pago" });
  for (const f of feriados) eventos.push({ fecha: f, titulo: "Feriado: no hay mercado", tipo: "feriado" });
  return eventos
    .filter((e) => diasEntre(hoy, e.fecha) >= 0 && diasEntre(hoy, e.fecha) <= 120)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, cantidad);
}
