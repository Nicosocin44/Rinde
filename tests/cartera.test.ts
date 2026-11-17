import { describe, expect, it } from "vitest";
import {
  derivarPosiciones,
  flujosParaXirr,
  puntosDeValuacion,
  reexpresar,
  resumenRendimiento,
  twr,
  valuarPosiciones,
  totalArs,
  xirr,
  type Activo,
  type ContextoValuacion,
  type Movimiento,
} from "@/lib/calculos";
import { CARTERA } from "./fixtures/golden";

/** 9. Cartera multi-moneda (ARS + USD MEP + cripto) con compras, venta parcial, un cupón, un interés y un depósito. */

const activos = new Map<string, Activo>(
  (
    [
      { id: "billetera:mp", tipo: "billetera", nombre: "Mercado Pago", moneda: "ARS" },
      { id: "cedear:AAPL", tipo: "cedear", nombre: "Apple", ticker: "AAPL", moneda: "ARS" },
      { id: "bono:AL30", tipo: "bono", nombre: "Bonar 2030", ticker: "AL30", moneda: "USD" },
      { id: "cripto:BTC", tipo: "cripto", nombre: "Bitcoin", ticker: "BTC", moneda: "USD" },
    ] satisfies Activo[]
  ).map((a) => [a.id, a]),
);

const movimientos: Movimiento[] = [
  { id: "1", activoId: "billetera:mp", fecha: "2026-01-01", tipo: "deposito", cantidad: "1000000", precio: "1" },
  { id: "2", activoId: "cedear:AAPL", fecha: "2026-01-01", tipo: "compra", cantidad: "10", precio: "20000", comision: "1000" },
  { id: "3", activoId: "cedear:AAPL", fecha: "2026-02-01", tipo: "compra", cantidad: "10", precio: "24000", comision: "1200" },
  { id: "4", activoId: "bono:AL30", fecha: "2026-02-01", tipo: "compra", cantidad: "1000", precio: "60" },
  { id: "5", activoId: "cedear:AAPL", fecha: "2026-03-01", tipo: "venta", cantidad: "5", precio: "30000", comision: "750" },
  { id: "6", activoId: "cripto:BTC", fecha: "2026-03-01", tipo: "compra", cantidad: "0.01", precio: "50000" },
  { id: "7", activoId: "billetera:mp", fecha: "2026-04-01", tipo: "interes", cantidad: "50000", precio: "1" },
  { id: "8", activoId: "bono:AL30", fecha: "2026-04-01", tipo: "cupon", cantidad: "3.75", precio: "1" },
];

const mercado: Record<string, { mep: number; precios: Record<string, number> }> = {
  "2026-01-01": { mep: 1000, precios: { "cedear:AAPL": 20000 } },
  "2026-02-01": { mep: 1100, precios: { "cedear:AAPL": 24000, "bono:AL30": 60 } },
  "2026-03-01": { mep: 1200, precios: { "cedear:AAPL": 30000, "bono:AL30": 62, "cripto:BTC": 50000 } },
  "2026-04-01": { mep: 1220, precios: { "cedear:AAPL": 31000, "bono:AL30": 63, "cripto:BTC": 55000 } },
  "2026-07-01": { mep: 1250, precios: { "cedear:AAPL": 32000, "bono:AL30": 66, "cripto:BTC": 60000 } },
};

const contextoEn = (fecha: string): ContextoValuacion => {
  const m = mercado[fecha]!;
  return { mep: m.mep, precios: new Map(Object.entries(m.precios)) };
};

describe("9. cartera multi-moneda", () => {
  it("posiciones y costo promedio ponderado", () => {
    const enFebrero = derivarPosiciones(movimientos, activos, "2026-02-01");
    expect(enFebrero.get("cedear:AAPL")!.cantidad.toNumber()).toBe(20);
    expect(enFebrero.get("cedear:AAPL")!.costoPromedio.toNumber()).toBe(CARTERA.costoPromedioAapl);

    const final = derivarPosiciones(movimientos, activos);
    const aapl = final.get("cedear:AAPL")!;
    expect(aapl.cantidad.toNumber()).toBe(15);
    expect(aapl.realizado.toNumber()).toBe(CARTERA.realizadoAapl);
    expect(aapl.costoTotal.toNumber()).toBe(CARTERA.costoTotalAaplFinal);
    expect(aapl.costoPromedio.toNumber()).toBe(CARTERA.costoPromedioAapl);

    const mp = final.get("billetera:mp")!;
    expect(mp.cantidad.toNumber()).toBe(1_050_000);
    expect(mp.costoTotal.toNumber()).toBe(1_000_000);
    expect(mp.ingresos.toNumber()).toBe(50_000);

    const al30 = final.get("bono:AL30")!;
    expect(al30.cantidad.toNumber()).toBe(1000);
    expect(al30.costoTotal.toNumber()).toBe(600);
    expect(al30.costoPromedio.toNumber()).toBe(60);
    expect(al30.ingresos.toNumber()).toBe(3.75);
  });

  it("valuación en pesos con MEP", () => {
    const posiciones = derivarPosiciones(movimientos, activos);
    const valuadas = valuarPosiciones(posiciones, activos, contextoEn("2026-07-01"), "2026-07-01");
    expect(totalArs(valuadas).toNumber()).toBe(3_105_000);
    const btc = valuadas.find((p) => p.activoId === "cripto:BTC")!;
    expect(btc.valor.toNumber()).toBe(600);
    expect(btc.valorArs.toNumber()).toBe(750_000);
    expect(btc.noRealizado.toNumber()).toBe(100);
    expect(btc.variacion!.toNumber()).toBeCloseTo(0.2, 12);
  });

  it("puntos de valuación, TWR y XIRR", () => {
    const puntos = puntosDeValuacion(movimientos, activos, contextoEn, ["2026-07-01"]);
    expect(puntos.map((p) => Number(p.valor))).toEqual(CARTERA.valores);
    expect(puntos.map((p) => Number(p.flujo))).toEqual(CARTERA.flujos);
    expect(twr(puntos)!.toNumber()).toBeCloseTo(CARTERA.twr, 10);
    expect(xirr(flujosParaXirr(puntos))!.toNumber()).toBeCloseTo(CARTERA.xirr, 8);

    const resumen = resumenRendimiento(puntos)!;
    expect(resumen.aportesNetos.toNumber()).toBe(1_201_000 + 901_200 + 450_750 - 4_575);
    expect(resumen.ganancia.toNumber()).toBe(3_105_000 - 2_548_375);
    expect(resumen.dias).toBe(181);
  });

  it("re-expresada en dólares MEP", () => {
    const puntos = puntosDeValuacion(movimientos, activos, contextoEn, ["2026-07-01"]);
    const enUsd = reexpresar(puntos, (f) => mercado[f]!.mep);
    expect(Number(enUsd[0]!.valor)).toBe(1200);
    expect(Number(enUsd[4]!.valor)).toBe(2484);
    // En dólares rinde menos que en pesos porque el MEP subió 25 %.
    expect(twr(enUsd)!.toNumber()).toBeLessThan(CARTERA.twr);
  });

  it("sin precio de mercado: se valúa al costo y se marca", () => {
    const posiciones = derivarPosiciones(movimientos, activos);
    const valuadas = valuarPosiciones(posiciones, activos, { mep: 1250, precios: new Map() }, "2026-07-01");
    expect(valuadas.find((p) => p.activoId === "cedear:AAPL")!.sinPrecio).toBe(true);
    expect(valuadas.find((p) => p.activoId === "billetera:mp")!.sinPrecio).toBe(false);
  });

  it("plazo fijo: devenga interés simple hasta el vencimiento", () => {
    const pf: Activo = { id: "plazo_fijo:1", tipo: "plazo_fijo", nombre: "PF", moneda: "ARS", tna: 0.24, inicio: "2026-01-01", vencimiento: "2026-01-31" };
    const mapa = new Map([[pf.id, pf]]);
    const movs: Movimiento[] = [{ id: "a", activoId: pf.id, fecha: "2026-01-01", tipo: "deposito", cantidad: "1000000", precio: "1" }];
    const valor = (fecha: string) =>
      totalArs(valuarPosiciones(derivarPosiciones(movs, mapa, fecha), mapa, { mep: 1, precios: new Map() }, fecha)).toNumber();
    expect(valor("2026-01-16")).toBeCloseTo(1_000_000 + (1_000_000 * 0.24 * 15) / 365, 6);
    expect(valor("2026-03-01")).toBeCloseTo(1_019_726.0274, 3);
  });
});
