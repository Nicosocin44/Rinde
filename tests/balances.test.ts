import { describe, expect, it } from "vitest";
import { monedaDe, resumirBalances, valuar, type HechosEmpresa, type HechoXbrl } from "@/lib/calculos/balances";
import aapl from "./fixtures/sec-aapl.json";
import ggal from "./fixtures/sec-ggal.json";
import meli from "./fixtures/sec-meli.json";

/**
 * Golden tests de balances con recortes de los datos reales de la SEC (dominio público), bajados el 18/11/2026.
 * Las cifras se verificaron contra los estados contables publicados de cada empresa.
 */
const HOY = "2026-11-18";
const resumen = (j: unknown) => resumirBalances(j as HechosEmpresa, HOY)!;

describe("balances: Apple (10-K, ejercicio que cierra en septiembre)", () => {
  const r = resumen(aapl);
  it("últimos cuatro ejercicios, con ingresos, ganancia, flujo libre, BPA y dividendo", () => {
    expect(r.moneda).toBe("USD");
    expect(r.formularioAnual).toBe("10-K");
    expect(r.anuales.map((a) => a.fin)).toEqual(["2023-09-30", "2024-09-28", "2025-09-27", "2026-09-26"]);
    const u = r.anuales.at(-1)!;
    expect(u.ingresos).toBe(478_834_000_000);
    expect(u.gananciaNeta).toBe(132_175_000_000);
    expect(u.flujoLibre).toBe(136_056_000_000);
    expect(u.bpa).toBe(8.98);
    expect(u.dividendoPorAccion).toBe(1.06);
  });
  it("el cuarto trimestre se deriva: año menos los primeros nueve meses", () => {
    const q4 = r.trimestres.at(-1)!;
    expect(q4).toEqual({ fin: "2026-09-26", ingresos: 478_834_000_000 - 364_357_000_000, gananciaNeta: 30_711_000_000, derivado: true });
  });
  it("crecimiento contra el ejercicio anterior del mismo 10-K, balance y rentabilidad", () => {
    expect(r.crecimiento.ingresos).toBeCloseTo(478_834 / 416_161 - 1, 10);
    expect(r.crecimiento.gananciaNeta).toBeCloseTo(132_175 / 112_010 - 1, 10);
    expect(r.ultimos12).toEqual({ ingresos: 478_834_000_000, gananciaNeta: 132_175_000_000, hasta: "2026-09-26", fuente: "ejercicio" });
    expect(r.balance).toEqual({ fecha: "2026-09-26", activos: 404_548_000_000, pasivos: 292_455_000_000, patrimonio: 112_093_000_000, caja: 36_305_000_000, deuda: 78_114_000_000 });
    expect(r.margenNeto).toBeCloseTo(132_175 / 478_834, 10);
    expect(r.endeudamiento).toBeCloseTo(292_455 / 112_093, 10);
    expect(r.desactualizado).toBe(false);
  });
  it("valuación con el precio de una acción", () => {
    const v = valuar(r, 270)!;
    expect(v.capitalizacion).toBe(270 * 14_720_306_000);
    expect(v.per).toBeCloseTo((270 * 14_720_306_000) / 132_175_000_000, 8);
    expect(v.precioVentas).toBeCloseTo((270 * 14_720_306_000) / 478_834_000_000, 8);
    expect(v.rendimientoDividendo).toBeCloseTo(1.06 / 270, 10);
    expect(valuar(r, 0)).toBeNull();
  });
});

describe("balances: Mercado Libre (10-Q más nuevo que el 10-K)", () => {
  const r = resumen(meli);
  it("los últimos 12 meses suman los cuatro últimos trimestres", () => {
    expect(r.ultimo).toMatchObject({ fin: "2026-09-30", formulario: "10-Q" });
    expect(r.ultimos12).toMatchObject({ ingresos: 38_523_000_000, gananciaNeta: 1_890_000_000, hasta: "2026-09-30", fuente: "trimestres" });
    expect(r.trimestres).toHaveLength(8);
  });
  it("una convocatoria a asamblea (DEF 14A) que repite la ganancia no rompe el crecimiento", () => {
    expect(r.crecimiento.ingresos).toBeCloseTo(28_893 / 20_777 - 1, 10);
    expect(r.crecimiento.gananciaNeta).toBeCloseTo(1_997 / 1_911 - 1, 10);
  });
});

describe("balances: Galicia (6-K en pesos, banco)", () => {
  const r = resumen(ggal);
  it("en pesos solo compara ejercicios del mismo balance (reexpresados a la misma fecha)", () => {
    expect(r.moneda).toBe("ARS");
    expect(r.ajustadoPorInflacion).toBe(true);
    expect(r.anuales.map((a) => [a.fin, a.gananciaNeta])).toEqual([
      ["2022-12-31", 357_608_923_000],
      ["2023-12-31", 797_156_007_000],
      ["2024-12-31", 1_763_971_045_000],
    ]);
    expect(r.trimestres).toEqual([]);
  });
  it("banco: sin ingresos ni flujo libre; balance de hace más de 15 meses, desactualizado", () => {
    expect(r.financiera).toBe(true);
    expect(r.anuales.every((a) => a.flujoLibre === null)).toBe(true);
    expect(r.balance?.fecha).toBe("2025-03-31");
    expect(r.desactualizado).toBe(true);
  });
});

describe("balances: reglas", () => {
  const h = (x: Partial<HechoXbrl> & { end: string; val: number }): HechoXbrl => ({ accn: "a1", form: "10-K", filed: "2026-02-01", ...x });
  const empresa = (facts: HechosEmpresa["facts"]): HechosEmpresa => ({ cik: 1, entityName: "Prueba", facts });

  it("moneda: la del período más reciente; con traducción de cortesía, la que tiene más datos", () => {
    const tsm = empresa({ "ifrs-full": { Revenue: { units: { TWD: [h({ start: "2023-01-01", end: "2023-12-31", val: 1 }), h({ start: "2024-01-01", end: "2024-12-31", val: 2 })], USD: [h({ start: "2024-01-01", end: "2024-12-31", val: 3 })] } } } });
    expect(monedaDe(tsm)).toBe("TWD");
    const ypf = empresa({ "ifrs-full": { Revenue: { units: { ARS: [h({ start: "2020-01-01", end: "2020-12-31", val: 1 }), h({ start: "2021-01-01", end: "2021-12-31", val: 1 })], USD: [h({ start: "2025-01-01", end: "2025-12-31", val: 3 })] } } } });
    expect(monedaDe(ypf)).toBe("USD");
  });

  it("un período corregido en un balance posterior usa la cifra nueva; el nombre preferido gana", () => {
    const r = resumirBalances(
      empresa({
        "us-gaap": {
          Revenues: { units: { USD: [h({ start: "2025-01-01", end: "2025-12-31", val: 100 }), h({ start: "2025-01-01", end: "2025-12-31", val: 110, accn: "a2", filed: "2026-03-01", form: "10-K/A" })] } },
          SalesRevenueNet: { units: { USD: [h({ start: "2025-01-01", end: "2025-12-31", val: 999 })] } },
          NetIncomeLoss: { units: { USD: [h({ start: "2025-01-01", end: "2025-12-31", val: 10 })] } },
        },
      }),
      HOY,
    )!;
    expect(r.anuales.at(-1)!.ingresos).toBe(110);
  });

  it("sin resultados anuales no hay resumen", () => {
    expect(resumirBalances(empresa({}), HOY)).toBeNull();
  });
});
