import { describe, expect, it } from "vitest";
import { describir, evaluar, type Alerta, type FotoMercado } from "@/lib/alertas/evaluar";

const foto: FotoMercado = {
  dolares: { mep: 1588.9, blue: 1600, oficial: 1575 },
  mejorTasa: { tna: 0.205, nombre: "Premier" },
  lecapVsPlazoFijo: { lecap: { nombre: "LECAP S29E7", tea: 0.2726 }, plazoFijo: { nombre: "Banco Bica", tea: 0.2683 } },
  mejorCompra: { USD: { precio: 1560, nombre: "Prex" }, USDT: { precio: 1677, nombre: "Binance" } },
  vencimientos: [{ nombre: "Plazo fijo", fecha: "2026-11-20", dias: 3 }],
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
  it("cada alerta se describe en castellano llano", () => {
    const a: Alerta = { ...base, tipo: "precio", dolar: "mep", condicion: "mayor", valor: 1600 };
    expect(describir(a)).toMatch(/^Dólar MEP por encima de \$\s1\.600$/);
  });
});
