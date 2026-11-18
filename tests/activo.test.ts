import { describe, expect, it } from "vitest";
import { aPesos, cortarEnSalto, enDolares, inflacionEsperadaHasta, maximaCaida, primaContraMep, rango, rendimientos, resumenBono, variacionDesde, volatilidadAnual, type Vela } from "@/lib/calculos";

// Golden tests de la ficha de un activo, calculados a mano.

const p = (fecha: string, cierre: number) => ({ fecha, cierre });
const vela = (fecha: string, minimo: number, maximo: number, cierre: number): Vela => ({ fecha, apertura: cierre, minimo, maximo, cierre, volumen: 0 });

describe("ficha de activo", () => {
  it("corta la serie en un cambio de ratio (salto de más de 55 % en un día)", () => {
    const serie = [100, 101, 250, 255].map((c, i) => p(`2026-01-0${i + 1}`, c));
    expect(cortarEnSalto(serie).map((x) => x.cierre)).toEqual([250, 255]);
    const baja = [100, 40, 41].map((c, i) => p(`2026-01-0${i + 1}`, c));
    expect(cortarEnSalto(baja).map((x) => x.cierre)).toEqual([40, 41]);
    const normal = [100, 120, 90].map((c, i) => p(`2026-01-0${i + 1}`, c));
    expect(cortarEnSalto(normal)).toHaveLength(3);
  });

  it("variación desde una fecha: contra el último cierre en o antes de esa fecha", () => {
    const serie = [p("2026-01-01", 100), p("2026-02-01", 110), p("2026-03-01", 121)];
    expect(variacionDesde(serie, "2026-02-15")).toBeCloseTo(0.1, 12);
    expect(variacionDesde(serie, "2026-01-01")).toBeCloseTo(0.21, 12);
    expect(variacionDesde(serie, "2025-12-01")).toBeNull();
    expect(variacionDesde(serie, "2026-03-05")).toBeNull();
  });

  it("rendimientos: en el año toma el último cierre del año anterior", () => {
    const serie = [p("2025-11-17", 50), p("2025-12-30", 80), p("2026-10-17", 90), p("2026-11-10", 95), p("2026-11-17", 100)];
    const r = rendimientos(serie, "2026-11-17");
    expect(r.enElAnio).toBeCloseTo(0.25, 12);
    expect(r.unAnio).toBeCloseTo(1, 12);
    expect(r.semana).toBeCloseTo(100 / 95 - 1, 12);
    expect(r.mes).toBeCloseTo(100 / 90 - 1, 12);
    expect(r.cincoAnios).toBeNull();
  });

  it("rango de 52 semanas con mínimos y máximos del día", () => {
    const serie = [vela("2025-01-01", 1, 500, 2), vela("2026-01-01", 90, 120, 100), vela("2026-06-01", 80, 105, 95)];
    expect(rango(serie, "2025-11-17")).toEqual({ minimo: 80, maximo: 120 });
    expect(rango(serie, "2027-01-01")).toBeNull();
  });

  it("volatilidad anual: desvío muestral de rendimientos logarítmicos × √252", () => {
    // 100, 110, 100, 110…: rendimientos ±ln(1,1); con 20 rendimientos alternados, media 0 y varianza 20·a²/19.
    const serie = Array.from({ length: 21 }, (_, i) => ({ cierre: i % 2 === 0 ? 100 : 110 }));
    const a = Math.log(1.1);
    expect(volatilidadAnual(serie)).toBeCloseTo(a * Math.sqrt(20 / 19) * Math.sqrt(252), 10);
    expect(volatilidadAnual(serie.slice(0, 10))).toBeNull();
  });

  it("máxima caída: del pico al piso siguiente", () => {
    const serie = [p("2026-01-01", 100), p("2026-02-01", 120), p("2026-03-01", 90), p("2026-04-01", 130), p("2026-05-01", 117)];
    expect(maximaCaida(serie, "2026-01-01")).toEqual({ caida: -0.25, pico: "2026-02-01", piso: "2026-03-01" });
    expect(maximaCaida([p("2026-01-01", 1), p("2026-01-02", 2)], "2026-01-01")).toBeNull();
  });

  it("en dólares: divide por el MEP de esa fecha o el último anterior", () => {
    const serie = [p("2025-12-31", 900), p("2026-01-02", 1000), p("2026-01-03", 2500)];
    const mep = [
      { fecha: "2026-01-03", valor: 1250 },
      { fecha: "2026-01-01", valor: 1000 },
    ];
    expect(enDolares(serie, mep)).toEqual([p("2026-01-02", 1), p("2026-01-03", 2)]);
  });

  it("prima del dólar implícito contra el MEP", () => {
    expect(primaContraMep(1650, 1500)).toBeCloseTo(0.1, 12);
    expect(primaContraMep(1350, 1500)).toBeCloseTo(-0.1, 12);
    expect(primaContraMep(1500, 0)).toBeNull();
  });
});

describe("ficha de bonos, letras y cripto", () => {
  it("volatilidad de cripto: anualiza con 365 días", () => {
    const serie = Array.from({ length: 21 }, (_, i) => ({ cierre: i % 2 === 0 ? 100 : 110 }));
    const a = Math.log(1.1);
    expect(volatilidadAnual(serie, 365, 365)).toBeCloseTo(a * Math.sqrt(20 / 19) * Math.sqrt(365), 10);
  });

  it("a pesos: multiplica por el dólar de esa fecha o el último anterior", () => {
    const serie = [p("2025-12-31", 1), p("2026-01-02", 2), p("2026-01-03", 3)];
    const dolar = [
      { fecha: "2026-01-03", valor: 1500 },
      { fecha: "2026-01-01", valor: 1000 },
    ];
    expect(aPesos(serie, dolar)).toEqual([p("2026-01-02", 2000), p("2026-01-03", 4500)]);
  });

  it("inflación esperada hasta el vencimiento, por días de cada mes", () => {
    const rem = [
      { mes: "2026-12", valor: 0.02 },
      { mes: "2027-01", valor: 0.03 },
    ];
    expect(inflacionEsperadaHasta(rem, "2026-12-01", "2027-01-01")).toBeCloseTo(0.02, 12);
    // Medio diciembre y medio enero: 1,02^(16/31) × 1,03^(15/31) − 1.
    expect(inflacionEsperadaHasta(rem, "2026-12-16", "2027-01-16")).toBeCloseTo(1.02 ** (16 / 31) * 1.03 ** (15 / 31) - 1, 12);
    // Después del último dato repite el último mes: febrero al 3 %.
    expect(inflacionEsperadaHasta(rem, "2027-02-01", "2027-03-01")).toBeCloseTo(0.03, 12);
    expect(inflacionEsperadaHasta(rem, "2026-10-01", "2026-11-01")).toBeNull();
    expect(inflacionEsperadaHasta(rem, "2027-01-01", "2026-12-01")).toBeNull();
  });

  it("resumen de un bono step-up que amortiza en cuotas", () => {
    const def = {
      ticker: "X",
      pagos: ["2026-01-09", "2026-07-09", "2027-01-09", "2027-07-09"],
      inicioDevengamiento: "2025-07-09",
      cupones: [
        { desde: "2025-07-09", tasaAnual: 0.01 },
        { desde: "2026-07-09", tasaAnual: 0.04 },
      ],
      amortizaciones: { "2026-07-09": 25, "2027-01-09": 25, "2027-07-09": 50 },
      frecuencia: 2,
    };
    expect(resumenBono(def, "2026-08-01")).toEqual({ pagosPorAnio: 2, tasaHoy: 0.04, tasaMaxima: 0.04, cuotasRestantes: 2, proximaAmortizacion: "2027-01-09", vencimiento: "2027-07-09" });
    expect(resumenBono(def, "2026-02-01").tasaHoy).toBe(0.01);
  });
});
