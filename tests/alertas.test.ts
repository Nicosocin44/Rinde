import { describe, expect, it } from "vitest";
import { describir, evaluar, type Alerta, type FotoMercado } from "@/lib/alertas/evaluar";

const foto: FotoMercado = {
  dolares: { mep: 1588.9, blue: 1600, oficial: 1575 },
  mejorTasa: { tna: 0.205, nombre: "Premier" },
  lecapVsPlazoFijo: { lecap: { nombre: "LECAP S29E7", tea: 0.2726 }, plazoFijo: { nombre: "Banco Bica", tea: 0.2683 } },
  mejorCompra: { USD: { precio: 1560, nombre: "Prex" }, USDT: { precio: 1677, nombre: "Binance" } },
  vencimientos: [{ nombre: "Plazo fijo", fecha: "2026-11-20", dias: 3 }],
  activos: { NBIS: { precio: 6640, moneda: "ARS" }, AL30: { precio: 51.44, moneda: "USD" } },
  asOf: "2026-11-17T12:00:00Z",
};
const base = { id: "a", creada: "2026-11-17", activa: true };

describe("alertas", () => {
  it("precio del dólar: mayor y menor", () => {
    expect(evaluar({ ...base, tipo: "precio", dolar: "mep", condicion: "mayor", valor: 1500 }, foto).cumplida).toBe(true);
    expect(evaluar({ ...base, tipo: "precio", dolar: "mep", condicion: "menor", valor: 1500 }, foto).cumplida).toBe(false);
    expect(evaluar({ ...base, tipo: "precio", dolar: "ccl", condicion: "mayor", valor: 1 }, foto).actual).toBe("Sin dato");
  });
  it("tasa, comparación, vencimiento y spread", () => {
    expect(evaluar({ ...base, tipo: "tasa", condicion: "mayor", valor: 0.2 }, foto).cumplida).toBe(true);
    expect(evaluar({ ...base, tipo: "tasa", condicion: "mayor", valor: 0.35 }, foto).cumplida).toBe(false);
    expect(evaluar({ ...base, tipo: "comparacion" }, foto).cumplida).toBe(true);
    expect(evaluar({ ...base, tipo: "vencimiento", dias: 3 }, foto).cumplida).toBe(true);
    expect(evaluar({ ...base, tipo: "vencimiento", dias: 1 }, foto).cumplida).toBe(false);
    expect(evaluar({ ...base, tipo: "spread", activo: "USD", condicion: "menor", valor: 1565 }, foto).cumplida).toBe(true);
  });
  it("precio de un activo: sube, baja, sin dato y moneda distinta", () => {
    const nbis = { ...base, tipo: "activo" as const, ticker: "NBIS", nombre: "Nebius Group", moneda: "ARS" as const };
    expect(evaluar({ ...nbis, condicion: "menor", valor: 7000 }, foto).cumplida).toBe(true);
    expect(evaluar({ ...nbis, condicion: "mayor", valor: 7000 }, foto).cumplida).toBe(false);
    expect(evaluar({ ...nbis, ticker: "XYZ", condicion: "mayor", valor: 1 }, foto).actual).toBe("Sin dato");
    expect(evaluar({ ...nbis, ticker: "AL30", condicion: "mayor", valor: 1 }, foto).actual).toBe("Sin dato");
    const al30 = { ...base, tipo: "activo" as const, ticker: "AL30", nombre: "Bonar 2030", moneda: "USD" as const, condicion: "mayor" as const, valor: 50 };
    expect(evaluar(al30, foto).cumplida).toBe(true);
    expect(evaluar(al30, foto).actual).toMatch(/^US\$\s51,44$/);
    expect(describir(al30)).toMatch(/^Bonar 2030 por encima de US\$\s50,00$/);
  });
  it("cada alerta se describe en castellano llano", () => {
    const a: Alerta = { ...base, tipo: "precio", dolar: "mep", condicion: "mayor", valor: 1600 };
    expect(describir(a)).toMatch(/^Dólar MEP por encima de \$\s1\.600$/);
  });
});
