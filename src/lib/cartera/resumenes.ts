import type { Activo, Movimiento } from "@/lib/calculos/cartera";
import { costoComision, type ClaseOperacion, type TarifarioBroker } from "@/lib/calculos/comisiones";
import { d } from "@/lib/calculos/decimal";
import { diasEntre } from "@/lib/calculos/fechas";
import { esCuenta } from "./activos";

/**
 * Resúmenes de la cartera para la columna de Mi cartera: las comisiones que pagaste (y cuánto habrías pagado en el
 * broker más barato) y los dividendos y cupones cobrados. Puros: reciben lo que ya tiene la página.
 */

// ───────────────────────── Comisiones ─────────────────────────

/**
 * Derechos de mercado de BYMA con IVA, iguales en todos los brokers (ver la nota de las comisiones): acciones y CEDEARs
 * alrededor de 0,05 % + IVA, letras 0,001 %. Se suman a la comisión del broker más barato para compararla con lo que
 * pagaste, que en los archivos de los brokers ya los incluye.
 */
const DERECHOS: Partial<Record<ClaseOperacion, number>> = { acciones: 0.0005 * 1.21, letras: 0.00001 };

const CLASE: Partial<Record<Activo["tipo"], ClaseOperacion>> = { cedear: "acciones", accion: "acciones", lecap: "letras" };

export type ResumenComisiones = {
  /** Lo pagado en comisiones (con IVA y derechos, como lo cargaste), en pesos. */
  total: number;
  esteAnio: number;
  operaciones: number;
  /** Lo operado en esas operaciones (cantidad × precio), en pesos. */
  operado: number;
  /** Compras y ventas en pesos sin comisión cargada: no cuentan. */
  sinComision: number;
  /** El broker con el que esas mismas operaciones habrían costado menos, con los derechos de mercado. null si no ahorrás. */
  masBarato: { proveedorId: string; total: number } | null;
};

/**
 * Las comisiones de las compras y ventas en pesos (CEDEARs, acciones y letras) que tienen la comisión cargada. Para
 * comparar, cada broker cobra su tarifa (con IVA) más los derechos de mercado; las letras con tarifa anual se prorratean
 * por los días que le quedaban a la letra (sin vencimiento, esa operación no se compara).
 */
export function comisionesPagadas(movimientos: Movimiento[], activos: Activo[], tarifarios: TarifarioBroker[], hoy: string): ResumenComisiones | null {
  const porId = new Map(activos.map((a) => [a.id, a]));
  const operaciones = movimientos.flatMap((m) => {
    const activo = porId.get(m.activoId);
    const clase = activo && CLASE[activo.tipo];
    if (!activo || !clase || activo.moneda !== "ARS" || (m.tipo !== "compra" && m.tipo !== "venta")) return [];
    const divisor = activo.tipo === "lecap" ? 100 : 1;
    const monto = d(m.cantidad).mul(m.precio).div(divisor).toNumber();
    const dias = activo.tipo === "lecap" && activo.vencimiento ? Math.max(0, diasEntre(m.fecha, activo.vencimiento)) : undefined;
    return [{ m, clase, monto, dias, comision: m.comision ? Number(m.comision) : null }];
  });
  const conComision = operaciones.filter((o) => o.comision !== null && o.comision > 0);
  if (!operaciones.length) return null;

  const anio = hoy.slice(0, 4);
  const total = conComision.reduce((s, o) => s + o.comision!, 0);
  const esteAnio = conComision.filter((o) => o.m.fecha.startsWith(anio)).reduce((s, o) => s + o.comision!, 0);
  const operado = conComision.reduce((s, o) => s + o.monto, 0);

  // Lo que habría costado en cada broker (solo los que operan todas las clases, y si se puede calcular cada operación).
  let masBarato: ResumenComisiones["masBarato"] = null;
  for (const t of tarifarios) {
    let costo = 0;
    let completo = true;
    for (const o of conComision) {
      const c = t.comisiones[o.clase];
      if (!c || (c.anual && o.dias === undefined)) {
        completo = false;
        break;
      }
      costo += costoComision(c, o.monto, o.dias) + o.monto * (DERECHOS[o.clase] ?? 0);
    }
    if (completo && conComision.length && (!masBarato || costo < masBarato.total)) masBarato = { proveedorId: t.proveedorId, total: costo };
  }
  if (masBarato && masBarato.total >= total) masBarato = null;

  return { total, esteAnio, operaciones: conComision.length, operado, sinComision: operaciones.length - conComision.length, masBarato };
}

// ───────────────────────── Dividendos y cupones ─────────────────────────

export type CobrosDeActivo = { activoId: string; activo: Activo; monto: number; cobros: number; ultimo: string };
export type ResumenCobros = {
  /** En la moneda de cada activo: los CEDEARs y acciones cobran en pesos; los bonos, en dólares. */
  esteAnio: { ARS: number; USD: number };
  total: { ARS: number; USD: number };
  /** Por activo, de mayor a menor (los de dólares, pasados a pesos al MEP de hoy para ordenar). */
  porActivo: CobrosDeActivo[];
};

/** Los dividendos, cupones e intereses cobrados de instrumentos (las cuentas no: sus intereses se calculan solos). */
export function cobros(movimientos: Movimiento[], activos: Activo[], hoy: string, mep: number): ResumenCobros | null {
  const porId = new Map(activos.map((a) => [a.id, a]));
  const anio = hoy.slice(0, 4);
  const resumen: ResumenCobros = { esteAnio: { ARS: 0, USD: 0 }, total: { ARS: 0, USD: 0 }, porActivo: [] };
  const grupos = new Map<string, CobrosDeActivo>();
  for (const m of movimientos) {
    const activo = porId.get(m.activoId);
    if (!activo || esCuenta(activo.tipo) || (m.tipo !== "dividendo" && m.tipo !== "cupon" && m.tipo !== "interes")) continue;
    const monto = d(m.cantidad).mul(m.precio).toNumber();
    resumen.total[activo.moneda] += monto;
    if (m.fecha.startsWith(anio)) resumen.esteAnio[activo.moneda] += monto;
    const g = grupos.get(activo.id) ?? { activoId: activo.id, activo, monto: 0, cobros: 0, ultimo: m.fecha };
    g.monto += monto;
    g.cobros += 1;
    if (m.fecha > g.ultimo) g.ultimo = m.fecha;
    grupos.set(activo.id, g);
  }
  if (!grupos.size) return null;
  const enPesos = (g: CobrosDeActivo) => (g.activo.moneda === "USD" ? g.monto * mep : g.monto);
  resumen.porActivo = [...grupos.values()].sort((a, b) => enPesos(b) - enPesos(a));
  return resumen;
}
