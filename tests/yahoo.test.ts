import { describe, expect, it } from "vitest";
import { aVelas, ultimaRueda } from "@/lib/data/adapters/yahoo";

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

/** Merval en Yahoo: la serie de 5 minutos trae todo el día de Nueva York; nos quedamos con la rueda de BYMA. */
describe("Yahoo: última rueda de un índice argentino", () => {
  const rueda = { abre: 11, cierra: 17.1, utcOffset: -3 };
  // Hora argentina → timestamp (UTC = AR + 3).
  const t = (dia: number, h: number, m = 0) => Date.UTC(2026, 10, dia, h + 3, m) / 1000;
  it("toma la última rueda con datos y, de base, el último dato de la rueda anterior", () => {
    const ts = [t(19, 9), t(19, 11), t(19, 16, 55), t(19, 20), t(20, 3), t(20, 11), t(20, 11, 5), t(20, 11, 10)];
    const v = [100, 100, 102, 102, 102, 101, null, 99.96];
    const r = ultimaRueda(ts, v, rueda);
    expect(r?.previo).toBe(102);
    expect(r?.puntos).toEqual([101, 99.96]);
    expect(r?.ultimo).toBe(99.96);
    expect(r?.variacion).toBeCloseTo(99.96 / 102 - 1, 10);
    expect(r?.hora).toBe(new Date(t(20, 11, 10) * 1000).toISOString());
  });
  it("antes de que abra el mercado, muestra la rueda anterior completa", () => {
    const ts = [t(18, 11), t(18, 16, 55), t(19, 11), t(19, 17), t(20, 9), t(20, 10)];
    const r = ultimaRueda(ts, [89, 90, 92, 95, 95, 95], rueda);
    expect(r).toMatchObject({ previo: 90, puntos: [92, 95], ultimo: 95 });
  });
  it("un domingo ignora los puntos quietos que publica Yahoo y usa los cierres oficiales (después de la rueda)", () => {
    // Jueves 19 y viernes 20 con rueda; el cierre oficial llega a las 19 h. Domingo 22: puntos quietos con el cierre del viernes.
    const ts = [t(19, 11), t(19, 17), t(19, 19), t(20, 3), t(20, 11), t(20, 17), t(20, 19), t(22, 11, 5), t(22, 11, 20)];
    const v = [100, 101, 100.5, 100.5, 99, 98, 98.5, 98.5, 98.5];
    const r = ultimaRueda(ts, v, rueda);
    expect(r).toMatchObject({ previo: 100.5, puntos: [99, 98, 98.5], ultimo: 98.5 });
    expect(r?.variacion).toBeCloseTo(98.5 / 100.5 - 1, 10);
  });
  it("sin una rueda anterior para comparar, no hay dato", () => {
    expect(ultimaRueda([t(20, 11), t(20, 12)], [1, 2], rueda)).toBeNull();
  });
});
