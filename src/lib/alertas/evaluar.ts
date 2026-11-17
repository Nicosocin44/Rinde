import { pesos, porcentaje } from "@/lib/format";
import type { TipoDolar } from "@/lib/data/types";

/**
 * Alertas v1: se evalúan en el navegador contra una foto del mercado (/api/alertas/mercado).
 * v2: evaluación en el servidor (cron) y envío por push, email y Telegram (ver ROADMAP, fase 2).
 */

export type Alerta =
  | { id: string; tipo: "precio"; dolar: TipoDolar; condicion: "mayor" | "menor"; valor: number; creada: string; activa: boolean; ultimaVez?: string }
  | { id: string; tipo: "tasa"; condicion: "mayor"; valor: number; creada: string; activa: boolean; ultimaVez?: string }
  | { id: string; tipo: "comparacion"; creada: string; activa: boolean; ultimaVez?: string }
  | { id: string; tipo: "vencimiento"; dias: number; creada: string; activa: boolean; ultimaVez?: string }
  | { id: string; tipo: "spread"; activo: "USD" | "USDT"; condicion: "menor"; valor: number; creada: string; activa: boolean; ultimaVez?: string };

export type FotoMercado = {
  dolares: Partial<Record<TipoDolar, number>>;
  /** Mejor TNA sin plazo y quién la paga. */
  mejorTasa: { tna: number; nombre: string } | null;
  /** Mejor LECAP de 20 a 75 días contra el mejor plazo fijo a 30 días, en TEA. */
  lecapVsPlazoFijo: { lecap: { nombre: string; tea: number }; plazoFijo: { nombre: string; tea: number } } | null;
  /** Precio más barato para comprar USD y USDT. */
  mejorCompra: { USD: { precio: number; nombre: string } | null; USDT: { precio: number; nombre: string } | null };
  /** Vencimientos de la cartera (los arma el navegador con la cartera local). */
  vencimientos?: { nombre: string; fecha: string; dias: number }[];
  asOf: string;
};

export type Resultado = { cumplida: boolean; actual: string; mensaje: string };

const NOMBRE_DOLAR: Record<TipoDolar, string> = { oficial: "oficial", mep: "MEP", ccl: "CCL", blue: "blue", cripto: "cripto", tarjeta: "tarjeta", mayorista: "mayorista" };

export function describir(a: Alerta): string {
  switch (a.tipo) {
    case "precio":
      return `Dólar ${NOMBRE_DOLAR[a.dolar]} ${a.condicion === "mayor" ? "por encima de" : "por debajo de"} ${pesos(a.valor, 0)}`;
    case "tasa":
      return `Alguna billetera o cuenta paga más de ${porcentaje(a.valor, 1)} TNA`;
    case "comparacion":
      return "Una LECAP rinde más que el mejor plazo fijo a plazo parecido";
    case "vencimiento":
      return `Algo de mi cartera vence en ${a.dias} ${a.dias === 1 ? "día" : "días"} o menos`;
    case "spread":
      return `Comprar ${a.activo} cuesta menos de ${pesos(a.valor, 0)}`;
  }
}

export function evaluar(a: Alerta, f: FotoMercado): Resultado {
  switch (a.tipo) {
    case "precio": {
      const v = f.dolares[a.dolar];
      if (v === undefined) return { cumplida: false, actual: "Sin dato", mensaje: "" };
      const cumplida = a.condicion === "mayor" ? v > a.valor : v < a.valor;
      return { cumplida, actual: pesos(v, 2), mensaje: `El dólar ${NOMBRE_DOLAR[a.dolar]} está en ${pesos(v, 2)}.` };
    }
    case "tasa": {
      if (!f.mejorTasa) return { cumplida: false, actual: "Sin dato", mensaje: "" };
      return {
        cumplida: f.mejorTasa.tna > a.valor,
        actual: `${porcentaje(f.mejorTasa.tna, 1)} en ${f.mejorTasa.nombre}`,
        mensaje: `${f.mejorTasa.nombre} paga ${porcentaje(f.mejorTasa.tna, 1)} TNA.`,
      };
    }
    case "comparacion": {
      const c = f.lecapVsPlazoFijo;
      if (!c) return { cumplida: false, actual: "Sin dato", mensaje: "" };
      return {
        cumplida: c.lecap.tea > c.plazoFijo.tea,
        actual: `${porcentaje(c.lecap.tea, 1)} contra ${porcentaje(c.plazoFijo.tea, 1)} TEA`,
        mensaje: `La ${c.lecap.nombre} rinde ${porcentaje(c.lecap.tea, 1)} TEA y el mejor plazo fijo, ${porcentaje(c.plazoFijo.tea, 1)}.`,
      };
    }
    case "vencimiento": {
      const prox = (f.vencimientos ?? []).filter((v) => v.dias >= 0 && v.dias <= a.dias).sort((x, y) => x.dias - y.dias)[0];
      if (!f.vencimientos?.length) return { cumplida: false, actual: "Tu cartera no tiene vencimientos", mensaje: "" };
      return prox
        ? { cumplida: true, actual: `${prox.nombre} en ${prox.dias} días`, mensaje: `${prox.nombre} vence en ${prox.dias} ${prox.dias === 1 ? "día" : "días"}.` }
        : { cumplida: false, actual: "Nada vence pronto", mensaje: "" };
    }
    case "spread": {
      const m = f.mejorCompra[a.activo];
      if (!m) return { cumplida: false, actual: "Sin dato", mensaje: "" };
      return { cumplida: m.precio < a.valor, actual: `${pesos(m.precio, 2)} en ${m.nombre}`, mensaje: `En ${m.nombre}, ${a.activo} cuesta ${pesos(m.precio, 2)}.` };
    }
  }
}

/** Límite del plan gratuito (PRODUCTO.md §9). El plan Pro lo levanta; en el MVP no se cobra. */
export const LIMITE_GRATIS = 3;
