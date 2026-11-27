import { describe, expect, it } from "vitest";
import type { Activo, Movimiento } from "@/lib/calculos/cartera";
import type { TarifarioBroker } from "@/lib/calculos/comisiones";
import { cobros, comisionesPagadas } from "@/lib/cartera/resumenes";

const A = (id: string, tipo: Activo["tipo"], moneda: Activo["moneda"], extra: Partial<Activo> = {}): Activo => ({ id, tipo, nombre: id, ticker: id.split(":")[1], moneda, ...extra });
const AAPL = A("cedear:AAPL", "cedear", "ARS");
const GGAL = A("accion:GGAL", "accion", "ARS");
const KO = A("cedear:KO", "cedear", "ARS");
const S30N6 = A("lecap:S30N6", "lecap", "ARS", { vencimiento: "2026-11-30" });
const AL30 = A("bono:AL30", "bono", "USD");
const MP = A("billetera:mp", "billetera", "ARS");
const ACTIVOS = [AAPL, GGAL, KO, S30N6, AL30, MP];

let n = 0;
const M = (activoId: string, fecha: string, tipo: Movimiento["tipo"], cantidad: string, precio: string, comision?: string): Movimiento => ({ id: `m${++n}`, activoId, fecha, tipo, cantidad, precio, ...(comision ? { comision } : {}) });

describe("comisiones pagadas", () => {
  // Brokers inventados: A es el más barato; C no opera letras, así que no se puede comparar.
  const TARIFARIOS = [
    { proveedorId: "a", comisiones: { acciones: { tasa: 0.001, iva: true }, letras: { tasa: 0.0005, iva: false } } },
    { proveedorId: "b", comisiones: { acciones: { tasa: 0.005, iva: true }, letras: { tasa: 0.001, iva: false } } },
    { proveedorId: "c", comisiones: { acciones: { tasa: 0.0001, iva: true } } },
  ] as unknown as TarifarioBroker[];
  const MOVS = [
    M(AAPL.id, "2026-11-20", "compra", "10", "18500", "925.5"),
    M(GGAL.id, "2026-11-19", "venta", "50", "6200", "1860"),
    M(KO.id, "2026-11-10", "compra", "5", "20000"),
    // LECAP: precio por cada 100 nominales → 100.000 × 98,5 / 100 = 98.500.
    M(S30N6.id, "2025-12-01", "compra", "100000", "98.5", "100"),
    M(KO.id, "2026-11-15", "dividendo", "1234.56", "1"),
    M(AL30.id, "2026-07-09", "compra", "100", "62", "5"),
  ];

  it("lo pagado, lo de este año, lo operado y las que no tienen comisión cargada", () => {
    const r = comisionesPagadas(MOVS, ACTIVOS, TARIFARIOS, "2026-11-27")!;
    expect(r.total).toBeCloseTo(2885.5, 6);
    expect(r.esteAnio).toBeCloseTo(2785.5, 6);
    expect(r.operaciones).toBe(3);
    expect(r.operado).toBeCloseTo(185_000 + 310_000 + 98_500, 6);
    // La compra de KO no tiene comisión; el bono es en dólares y no entra.
    expect(r.sinComision).toBe(1);
  });

  it("el más barato, con su tarifa, el IVA y los derechos de mercado (el que no opera letras no se compara)", () => {
    const r = comisionesPagadas(MOVS, ACTIVOS, TARIFARIOS, "2026-11-27")!;
    // Acciones: 495.000 × (0,1 % × 1,21 + 0,05 % × 1,21); letras: 98.500 × (0,05 % + 0,001 %).
    expect(r.masBarato?.proveedorId).toBe("a");
    expect(r.masBarato?.total).toBeCloseTo(495_000 * (0.001 * 1.21 + 0.0005 * 1.21) + 98_500 * (0.0005 + 0.00001), 6);
  });

  it("si ya pagás menos que el más barato, no hay comparación; y sin compras ni ventas en pesos, no hay resumen", () => {
    const barato = comisionesPagadas([M(AAPL.id, "2026-11-20", "compra", "10", "18500", "1")], ACTIVOS, TARIFARIOS, "2026-11-27")!;
    expect(barato.masBarato).toBeNull();
    expect(comisionesPagadas([M(AL30.id, "2026-07-09", "compra", "100", "62", "5")], ACTIVOS, TARIFARIOS, "2026-11-27")).toBeNull();
  });

  it("una letra con tarifa anual se prorratea por los días que le quedaban", () => {
    const anual = [{ proveedorId: "anual", comisiones: { letras: { tasa: 0.015, iva: false, anual: true } } }] as unknown as TarifarioBroker[];
    const r = comisionesPagadas([M(S30N6.id, "2025-12-01", "compra", "100000", "98.5", "5000")], ACTIVOS, anual, "2026-11-27")!;
    // 364 días de 2025-12-01 a 2026-11-30.
    expect(r.masBarato?.total).toBeCloseTo((98_500 * 0.015 * 364) / 365 + 98_500 * 0.00001, 6);
  });
});

describe("dividendos y cupones cobrados", () => {
  it("por moneda, en el año y en total, y por activo de mayor a menor (los de dólares al MEP)", () => {
    const r = cobros(
      [
        M(KO.id, "2026-11-15", "dividendo", "1234.56", "1"),
        M(KO.id, "2025-11-15", "dividendo", "500", "1"),
        M(AL30.id, "2026-07-09", "cupon", "12.5", "1"),
        M(MP.id, "2026-11-01", "interes", "999", "1"),
        M(AAPL.id, "2026-11-20", "compra", "10", "18500"),
      ],
      ACTIVOS,
      "2026-11-27",
      1500,
    )!;
    expect(r.esteAnio).toEqual({ ARS: 1234.56, USD: 12.5 });
    expect(r.total).toEqual({ ARS: 1734.56, USD: 12.5 });
    expect(r.porActivo.map((g) => [g.activo.ticker, g.cobros, g.ultimo])).toEqual([
      ["AL30", 1, "2026-07-09"],
      ["KO", 2, "2026-11-15"],
    ]);
  });

  it("sin cobros, no hay resumen", () => {
    expect(cobros([M(AAPL.id, "2026-11-20", "compra", "10", "18500")], ACTIVOS, "2026-11-27", 1500)).toBeNull();
  });
});
