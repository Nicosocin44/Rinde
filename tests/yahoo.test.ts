import { describe, expect, it } from "vitest";
import { aVelas } from "@/lib/data/adapters/yahoo";

/** Historia diaria de Yahoo → velas (para los CEDEARs sin historia en data912). */
describe("Yahoo: historia diaria a velas", () => {
  // 2026-11-18 y 19 a las 14:30 UTC (apertura de Nueva York), y un día sin cierre.
  const t = [1795012200, 1795098600, 1795185000];
  it("una vela por día, en orden; descarta los días sin cierre", () => {
    const v = aVelas(t, { open: [100, 102, null], high: [103, 104, null], low: [99, 101, null], close: [102, 103.5, null], volume: [1000, 2000, null] });
    expect(v).toEqual([
      { fecha: "2026-11-18", apertura: 100, maximo: 103, minimo: 99, cierre: 102, volumen: 1000 },
      { fecha: "2026-11-19", apertura: 102, maximo: 104, minimo: 101, cierre: 103.5, volumen: 2000 },
    ]);
  });
  it("si falta apertura, máximo o mínimo, usa el cierre; un día repetido queda una vez", () => {
    const v = aVelas([t[0]!, t[0]! + 60], { close: [50, 51] });
    expect(v).toEqual([{ fecha: "2026-11-18", apertura: 51, maximo: 51, minimo: 51, cierre: 51, volumen: 0 }]);
  });
});
