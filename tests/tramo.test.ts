import { describe, expect, it } from "vitest";
import { indiceCercano, tramoEntre } from "@/lib/calculos/tramo";

const PUNTOS: [string, number][] = [
  ["2026-07-15", 199.72],
  ["2026-08-01", 150],
  ["2026-10-08", 219.92],
  ["2026-11-23", 99.92],
];

describe("tramo del gráfico (cuánto subió o bajó entre dos puntos)", () => {
  it("la diferencia y el porcentaje entre dos fechas, como en Google Finance (+20,20, +10,11 %)", () => {
    const t = tramoEntre(PUNTOS, 0, 2)!;
    expect(t.desde).toEqual(["2026-07-15", 199.72]);
    expect(t.hasta).toEqual(["2026-10-08", 219.92]);
    expect(t.diferencia).toBeCloseTo(20.2, 10);
    expect(t.variacion).toBeCloseTo(219.92 / 199.72 - 1, 12);
  });

  it("da lo mismo arrastrar hacia la izquierda o hacia la derecha", () => {
    expect(tramoEntre(PUNTOS, 3, 1)).toEqual(tramoEntre(PUNTOS, 1, 3));
    expect(tramoEntre(PUNTOS, 1, 3)!.variacion).toBeCloseTo(99.92 / 150 - 1, 12);
  });

  it("en puntos (series que ya son porcentajes, como la brecha): la variación es la diferencia", () => {
    const brecha: [string, number][] = [
      ["2026-01-02", 0.12],
      ["2026-06-01", 0.05],
    ];
    const t = tramoEntre(brecha, 0, 1, "puntos")!;
    expect(t.variacion).toBeCloseTo(-0.07, 12);
    expect(t.diferencia).toBeCloseTo(-0.07, 12);
  });

  it("un solo punto, un índice que no existe o un punto de partida en cero: no hay tramo o no hay porcentaje", () => {
    expect(tramoEntre(PUNTOS, 2, 2)).toBeNull();
    expect(tramoEntre(PUNTOS, 0, 9)).toBeNull();
    expect(tramoEntre([["2026-01-01", 0], ["2026-02-01", 5]], 0, 1)!.variacion).toBeNull();
  });

  it("el índice más cercano a una posición del eje, sin salirse de los datos", () => {
    expect(indiceCercano(1.4, 4)).toBe(1);
    expect(indiceCercano(1.6, 4)).toBe(2);
    expect(indiceCercano(-3, 4)).toBe(0);
    expect(indiceCercano(12, 4)).toBe(3);
    expect(indiceCercano(1, 0)).toBeNull();
    expect(indiceCercano(Number.NaN, 4)).toBeNull();
  });
});
