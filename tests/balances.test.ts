import { describe, expect, it } from "vitest";
import { monedaDe, resumirBalances, valuar, type HechosEmpresa, type HechoXbrl } from "@/lib/calculos/balances";
import aapl from "./fixtures/sec-aapl.json";
import ggal from "./fixtures/sec-ggal.json";
import ko from "./fixtures/sec-ko.json";
import meli from "./fixtures/sec-meli.json";

/**
 * Golden tests de estados contables con recortes de los datos reales de la SEC (dominio público), bajados el
 * 18/11/2026. Las cifras se verificaron contra los estados contables publicados de cada empresa.
 */
const HOY = "2026-11-18";
const resumen = (j: unknown) => resumirBalances(j as HechosEmpresa, HOY)!;
const M = 1_000_000;

describe("Apple (10-K, ejercicio que cierra en septiembre)", () => {
  const r = resumen(aapl);

  it("estado de resultados anual: ingresos, bruta, operativa, neta, EBITDA, BPA", () => {
    expect(r.anual.periodos.map((p) => p.fin)).toEqual(["2023-09-30", "2024-09-28", "2025-09-27", "2026-09-26"]);
    const v = r.anual.valores;
    expect(v.ingresos.at(-1)).toBe(478_834 * M);
    expect(v.gananciaBruta.at(-1)).toBe(233_602 * M);
    expect(v.gananciaNeta.at(-1)).toBe(132_175 * M);
    expect(v.ebitda.at(-1)).toBe(171_486 * M); // ganancia operativa + amortizaciones
    expect(v.bpa.at(-1)).toBe(8.98);
    expect(v.dividendoPorAccion.at(-1)).toBe(1.06);
  });

  it("flujo de efectivo: libre = operativo − inversión; recompras y dividendos pagados", () => {
    const v = r.anual.valores;
    expect(v.flujoLibre.at(-1)).toBe(136_056 * M);
    expect(v.recompras.at(-1)).toBe(86_390 * M);
    expect(r.ultimos12.valores.dividendosPagados).toBe(15_721 * M);
  });

  it("trimestres: el cuarto se deriva (año − 9 meses) y el flujo trimestral sale de restar acumulados", () => {
    const t = r.trimestral!;
    expect(t.periodos.map((p) => p.derivado)).toEqual([false, false, false, true, false, false, false, true]);
    expect(t.valores.ingresos.at(-1)).toBe((478_834 - 364_357) * M);
    // El flujo operativo de los 10-Q viene acumulado: el trimestre jun-2026 = 9 meses − 6 meses.
    expect(t.valores.flujoOperativo.at(-2)).toBe(34_369 * M);
    expect(t.valores.flujoLibre.at(-2)).toBe(31_914 * M);
  });

  it("deuda total = deuda de largo plazo con su porción corriente + papeles comerciales", () => {
    expect(r.balance?.valores.deudaTotal).toBe(80_111 * M);
    expect(r.anual.valores.deudaTotal).toEqual([111_088 * M, 106_629 * M, 98_657 * M, 80_111 * M]);
  });

  it("indicadores: márgenes, liquidez, deuda neta, payout, interanual", () => {
    const i = r.indicadores;
    expect(i.margenBruto).toBeCloseTo(233_602 / 478_834, 10);
    expect(i.margenEbitda).toBeCloseTo(171_486 / 478_834, 10);
    expect(i.liquidezCorriente).toBeCloseTo(173_857 / 169_915, 10);
    expect(i.pruebaAcida).toBeCloseTo((173_857 - 14_541) / 169_915, 10);
    expect(i.deudaNeta).toBe((80_111 - 36_305 - 20_417) * M);
    expect(i.payout).toBeCloseTo(15_721 / 132_175, 10);
    expect(i.ingresosInteranual).toBeCloseTo(114_477 / 102_466 - 1, 10);
    expect(i.crecimientoIngresos).toBeCloseTo(478_834 / 416_161 - 1, 10);
    expect(i.coberturaIntereses).toBeNull(); // Apple no informa los intereses por separado
  });

  it("valuación con el precio de una acción", () => {
    const v = valuar(r, 353)!;
    const cap = 353 * 14_720_306_000;
    expect(v.capitalizacion).toBe(cap);
    expect(v.valorEmpresa).toBe(cap + (80_111 - 36_305 - 20_417) * M);
    expect(v.per).toBeCloseTo(cap / (132_175 * M), 8);
    expect(v.evEbitda).toBeCloseTo(v.valorEmpresa! / (171_486 * M), 8);
    expect(v.rendimientoDividendo).toBeCloseTo(1.06 / 353, 10);
    expect(v.rendimientoFlujoLibre).toBeCloseTo((136_056 * M) / cap, 10);
    expect(valuar(r, 0)).toBeNull();
  });
});

describe("Mercado Libre (10-Q más nuevo que el 10-K)", () => {
  const r = resumen(meli);
  it("últimos 12 meses: la suma de los cuatro últimos trimestres", () => {
    expect(r.ultimo).toMatchObject({ fin: "2026-09-30", formulario: "10-Q" });
    expect(r.ultimos12).toMatchObject({ hasta: "2026-09-30", fuente: "trimestres" });
    expect(r.ultimos12.valores.ingresos).toBe(38_523 * M);
    expect(r.ultimos12.valores.gananciaNeta).toBe(1_890 * M);
    expect(r.ultimos12.valores.flujoLibre).toBe(12_254 * M);
  });
  it("una convocatoria a asamblea (DEF 14A) que repite la ganancia no rompe el crecimiento", () => {
    expect(r.indicadores.crecimientoIngresos).toBeCloseTo(28_893 / 20_777 - 1, 10);
    expect(r.indicadores.crecimientoGanancia).toBeCloseTo(1_997 / 1_911 - 1, 10);
  });
  it("deuda: si la parte de largo plazo cambia de nombre, el total informado la sostiene", () => {
    expect(r.trimestral!.valores.deudaTotal.at(-1)).toBe(13_190 * M);
  });
});

describe("Coca-Cola (deuda con arrendamientos, dos trimestres iguales)", () => {
  const r = resumen(ko);
  it("deuda total con los conceptos nuevos desde 2024", () => {
    expect(r.anual.valores.deudaTotal.at(-1)).toBe(45_436 * M);
  });
  it("cobertura de intereses, payout e ingresos por trimestre (13.380 M dos veces: es real)", () => {
    expect(r.indicadores.coberturaIntereses).toBeCloseTo(10.0307, 3);
    expect(r.indicadores.payout).toBeCloseTo(11_230 / 14_629, 10);
    expect(r.trimestral!.valores.ingresos.slice(-2)).toEqual([13_380 * M, 13_380 * M]);
  });
});

describe("Galicia (6-K en pesos, banco)", () => {
  const r = resumen(ggal);
  it("en pesos solo compara ejercicios del mismo balance y no hay trimestres", () => {
    expect(r.moneda).toBe("ARS");
    expect(r.ajustadoPorInflacion).toBe(true);
    expect(r.anual.periodos.map((p) => p.fin)).toEqual(["2022-12-31", "2023-12-31", "2024-12-31"]);
    expect(r.anual.valores.gananciaNeta).toEqual([357_608_923_000, 797_156_007_000, 1_763_971_045_000]);
    expect(r.trimestral).toBeNull();
  });
  it("banco: sin ingresos, flujo libre, EBITDA ni deuda neta; balance viejo", () => {
    expect(r.financiera).toBe(true);
    expect(r.anual.valores.flujoLibre.every((x) => x === null)).toBe(true);
    expect(r.anual.valores.ebitda.every((x) => x === null)).toBe(true);
    expect(r.indicadores.deudaNeta).toBeNull();
    expect(r.indicadores.coberturaIntereses).toBeNull();
    expect(r.indicadores.roe).toBeCloseTo(1_763_971_045 / 6_750_166_386, 8);
    expect(r.balance?.fecha).toBe("2025-03-31");
    expect(r.desactualizado).toBe(true);
  });
});

describe("reglas", () => {
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
    expect(r.anual.valores.ingresos.at(-1)).toBe(110);
  });

  it("IFRS con bonos aparte: la deuda total suma préstamos y bonos (préstamos no los incluye)", () => {
    const i = (end: string, val: number) => h({ end, val, form: "20-F" });
    const r = resumirBalances(
      empresa({
        "ifrs-full": {
          Revenue: { units: { USD: [h({ start: "2024-01-01", end: "2024-12-31", val: 100, form: "20-F" })] } },
          Assets: { units: { USD: [i("2024-12-31", 500)] } },
          Borrowings: { units: { USD: [i("2024-12-31", 30)] } },
          ShorttermBorrowings: { units: { USD: [i("2024-12-31", 10)] } },
          LongtermBorrowings: { units: { USD: [i("2024-12-31", 20)] } },
          NoncurrentPortionOfNoncurrentBondsIssued: { units: { USD: [i("2024-12-31", 70)] } },
        },
      }),
      HOY,
    )!;
    expect(r.balance?.valores.deudaTotal).toBe(100);
  });

  it("sin resultados anuales no hay resumen", () => {
    expect(resumirBalances(empresa({}), HOY)).toBeNull();
  });
});
