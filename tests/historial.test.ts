import { describe, expect, it } from "vitest";
import type { FotoTasas } from "@data/historico/tasas/tipos";
import { cambiosPlazoFijo, rangoHistorial, serieDe } from "@/lib/historial/tasas";

const foto = (pf: Record<string, [number | null, number | null]>): FotoTasas => ({
  plazoFijo: Object.fromEntries(Object.entries(pf).map(([k, [tna, tnaNoClientes]]) => [k, { tna, tnaNoClientes }])),
  cuentas: {},
  letras: {},
});

const historial: Record<string, FotoTasas> = {
  "2026-11-19": foto({ A: [0.2, null], B: [0.18, 0.17] }),
  "2026-11-18": foto({ A: [0.19, null], B: [0.19, null], C: [null, 0.21] }),
  "2026-11-20": foto({ A: [0.205, null], B: [0.175, null] }),
};

describe("historial de tasas", () => {
  it("serie ordenada por fecha, sin los días en que no informó", () => {
    expect(serieDe(historial, (f) => f.plazoFijo.C?.tnaNoClientes)).toEqual([{ fecha: "2026-11-18", tna: 0.21 }]);
    expect(serieDe(historial, (f) => f.plazoFijo.A?.tna).map((p) => p.fecha)).toEqual(["2026-11-18", "2026-11-19", "2026-11-20"]);
  });

  it("cambio de cada banco desde el primer día, ordenado por la tasa de hoy", () => {
    const c = cambiosPlazoFijo(historial);
    expect(c.map((x) => x.entidad)).toEqual(["C", "A", "B"]);
    const a = c.find((x) => x.entidad === "A")!;
    expect(a.actual).toBe(0.205);
    expect(a.cambio).toBeCloseTo(0.015, 12);
    // Sin tasa para clientes, usa la de no clientes.
    expect(c.find((x) => x.entidad === "C")!.actual).toBe(0.21);
    expect(c.find((x) => x.entidad === "B")!.cambio).toBeCloseTo(-0.015, 12);
  });

  it("rango del historial", () => {
    expect(rangoHistorial(historial)).toEqual({ desde: "2026-11-18", hasta: "2026-11-20", dias: 3 });
    expect(rangoHistorial({})).toBeNull();
  });
});
