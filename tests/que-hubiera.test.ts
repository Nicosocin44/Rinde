import { describe, expect, it } from "vitest";
import { ordenarEscenarios, plazoFijoRenovado, porPrecio, sinPerder, valorEn } from "@/lib/calculos";

// Golden tests de "¿Qué hubiera pasado si…?", calculados a mano.

const p = (fecha: string, valor: number) => ({ fecha, valor });

describe("¿qué hubiera pasado si…?", () => {
  it("valor en una fecha: el último anterior, y no si es muy viejo", () => {
    const serie = [p("2026-01-01", 100), p("2026-01-05", 110)];
    expect(valorEn(serie, "2026-01-04")).toBe(100);
    expect(valorEn(serie, "2026-01-10")).toBe(110);
    expect(valorEn(serie, "2025-12-31")).toBeNull();
    expect(valorEn(serie, "2026-03-01")).toBeNull();
  });

  it("comprar y valuar hoy: monto × precio final / precio inicial", () => {
    const mep = [p("2025-11-18", 1200), p("2026-11-18", 1500)];
    expect(porPrecio(1_000_000, mep, "2025-11-18", "2026-11-18")).toBeCloseTo(1_250_000, 6);
    expect(porPrecio(1_000_000, mep, "2025-01-01", "2026-11-18")).toBeNull();
  });

  it("plazo fijo renovado cada 30 días con la tasa de cada momento", () => {
    // 60 días: 30 a 36,5 % TNA (+3 %) y 30 a 73 % TNA (+6 %): 1.000 × 1,03 × 1,06 = 1.091,8.
    const tnas = [p("2026-01-01", 0.365), p("2026-01-31", 0.73)];
    expect(plazoFijoRenovado(1000, tnas, "2026-01-01", "2026-03-02")).toBeCloseTo(1091.8, 8);
    // 45 días: un plazo completo (+3 %) y 15 días a la tasa de ese momento (73 % × 15/365 = +3 %).
    expect(plazoFijoRenovado(1000, tnas, "2026-01-01", "2026-02-15")).toBeCloseTo(1060.9, 8);
    expect(plazoFijoRenovado(1000, tnas, "2025-12-01", "2026-02-15")).toBeNull();
  });

  it("para no perder contra la inflación", () => {
    expect(sinPerder(1000, 1, 1.3)).toBeCloseTo(1300, 10);
  });

  it("escenarios ordenados por valor, con ganancia nominal y real", () => {
    const r = ordenarEscenarios(
      1000,
      [
        { id: "quieto", nombre: "Quieto", detalle: "", valor: 1000 },
        { id: "mep", nombre: "MEP", detalle: "", valor: 1430 },
        { id: "btc", nombre: "Bitcoin", detalle: "", valor: null },
      ],
      1300,
    );
    expect(r.map((x) => x.id)).toEqual(["mep", "quieto"]);
    expect(r[0]!.ganancia).toBeCloseTo(0.43, 12);
    expect(r[0]!.real).toBeCloseTo(0.1, 12);
    expect(r[1]!.real).toBeCloseTo(1000 / 1300 - 1, 12);
  });
});

describe("tasa de depósitos a 30 días", () => {
  it("la fuente mezcla fracción y porcentaje: se normaliza a fracción", async () => {
    const { tnaComoFraccion } = await import("@/lib/data/adapters/argentinadatos");
    // Los dos formatos que aparecen en la serie para tasas parecidas (agosto de 2024).
    expect(tnaComoFraccion(0.3748)).toBe(0.3748);
    expect(tnaComoFraccion(39.18)).toBeCloseTo(0.3918, 12);
    expect(tnaComoFraccion(1.33)).toBe(1.33);
  });
});
