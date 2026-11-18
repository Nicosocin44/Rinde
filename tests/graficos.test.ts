import { describe, expect, it } from "vitest";
import { variacionDeVelas, velasEnOtraMoneda, type Vela } from "@/lib/calculos";

const vela = (fecha: string, apertura: number, maximo: number, minimo: number, cierre: number): Vela => ({ fecha, apertura, maximo, minimo, cierre, volumen: 0 });

describe("gráficos · velas en otra moneda", () => {
  it("divide apertura, máximo, mínimo y cierre por el dólar de cada día (pesos → dólares)", () => {
    const velas = [vela("2026-11-16", 10_000, 11_000, 9_000, 10_500), vela("2026-11-17", 10_500, 12_000, 10_000, 12_000)];
    const dolar = [
      { fecha: "2026-11-16", valor: 1000 },
      { fecha: "2026-11-17", valor: 1200 },
    ];
    expect(velasEnOtraMoneda(velas, dolar, "dividir")).toEqual([vela("2026-11-16", 10, 11, 9, 10.5), vela("2026-11-17", 8.75, 10, 25 / 3, 10)]);
  });
  it("usa el último dólar disponible (fin de semana) y descarta lo anterior al primer dato", () => {
    const velas = [vela("2026-11-14", 1, 1, 1, 1), vela("2026-11-16", 2, 2, 2, 2)];
    expect(velasEnOtraMoneda(velas, [{ fecha: "2026-11-15", valor: 1000 }], "multiplicar")).toEqual([vela("2026-11-16", 2000, 2000, 2000, 2000)]);
  });
  it("funciona con fecha y hora (recorrido del día)", () => {
    const velas = [vela("2026-11-18T13:00:00.000Z", 64_000, 64_100, 63_900, 64_050)];
    const usdt = [{ fecha: "2026-11-18T13:00:00.000Z", valor: 1700 }];
    expect(velasEnOtraMoneda(velas, usdt, "multiplicar")[0]!.cierre).toBe(64_050 * 1700);
  });
});

describe("gráficos · variación de un tramo de velas", () => {
  it("va de la primera apertura al último cierre", () => {
    expect(variacionDeVelas([vela("a", 100, 101, 99, 100.5), vela("b", 100.5, 103, 100, 102)])).toBeCloseTo(0.02, 10);
  });
  it("sin datos suficientes devuelve null", () => {
    expect(variacionDeVelas([])).toBeNull();
    expect(variacionDeVelas([vela("a", 100, 100, 100, 100)])).toBeNull();
  });
});
