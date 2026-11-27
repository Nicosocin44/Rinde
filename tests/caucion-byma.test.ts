import { describe, expect, it } from "vitest";
import { elegirCauciones, normalizarCauciones, normalizarCaucionesByma } from "@/lib/data/servicios/pesos";
import { bymaCaucionesSchema } from "@/lib/data/schemas";
import filasReales from "./fixtures/byma-cauciones.json";

/**
 * Caución desde BYMA Data. El fixture son filas reales de "free/cauciones" del viernes 27/11/2026 a las 12:43: cuatro
 * plazos en pesos que operaron, uno en pesos sin operaciones (con el cierre de la rueda anterior) y una fila de dólar MEP
 * y otra de cable, que no van.
 */

const feriados = new Set(["2026-11-23", "2026-12-08"]);
const filas = bymaCaucionesSchema.parse(filasReales);

describe("cauciones de BYMA Data", () => {
  it("con operaciones: solo pesos, la tasa promedio del día y el monto, con la rueda del día", () => {
    const r = normalizarCaucionesByma(filas, feriados);
    expect(r.ultimaRueda).toBe("2026-11-27");
    expect(r.cauciones.map((c) => c.plazoDias)).toEqual([3, 7, 31, 38]);
    const [a3] = r.cauciones;
    expect(a3!.tna).toBeCloseTo(0.212866471, 9);
    expect(a3!.monto).toBeCloseTo(3_310_498_238_092, -3);
    expect(a3!.fecha).toBe("2026-11-27");
    // La TEA renovando cada 3 días es mayor que la TNA.
    expect(a3!.tea).toBeGreaterThan(a3!.tna);
  });

  it("antes de que abra el mercado: el cierre de la rueda anterior, sin monto, con el plazo contado desde esa rueda", () => {
    const sinOperar = filas.map((f) => ({ ...f, volumeAmount: 0, vwap: 0, trade: 0 }));
    const r = normalizarCaucionesByma(sinOperar, feriados);
    expect(r.ultimaRueda).toBe("2026-11-26");
    expect(r.cauciones.map((c) => [c.plazoDias, c.tna, c.monto])).toEqual([
      [4, 0.2, null],
      [8, 0.215, null],
      [32, 0.22, null],
      [39, 0.2, null],
      [67, 0.2, null],
    ]);
  });

  it("si BYMA cuenta los días desde un sábado, la rueda es el viernes y el plazo se cuenta desde ahí", () => {
    const desdeElSabado = filas.map((f) => ({ ...f, daysToMaturity: f.daysToMaturity - 1 }));
    const r = normalizarCaucionesByma(desdeElSabado, feriados);
    expect(r.ultimaRueda).toBe("2026-11-27");
    expect(r.cauciones.map((c) => c.plazoDias)).toEqual([3, 7, 31, 38]);
  });

  it("una tasa en porcentaje (21,5) se lee como fracción (0,215)", () => {
    const enPorcentaje = filas.map((f) => (f.symbol === "PESOS-3011-U-CT-ARS" ? { ...f, vwap: 21.5 } : f));
    expect(normalizarCaucionesByma(enPorcentaje, feriados).cauciones[0]!.tna).toBeCloseTo(0.215, 10);
  });

  it("sin filas en pesos no hay cauciones", () => {
    expect(normalizarCaucionesByma(filas.filter((f) => f.underlyingSymbol !== "PESOS"), feriados)).toEqual({ cauciones: [], ultimaRueda: null });
  });
});

describe("de qué fuente sale la caución", () => {
  const hoy = "2026-11-27";
  const byma = normalizarCaucionesByma(filas, feriados);
  // ArgentinaDatos, trabado en la rueda del 17/11 (como pasó en noviembre de 2026).
  const ad = normalizarCauciones([{ plazo: 38, montoContado: 1_791_927_231, tasaActual: 23, fechaOperacion: "2026-11-17", fechaActualizacion: "2026-11-27T15:33:30.880Z" }]);

  it("ArgentinaDatos trae la tasa en porcentaje", () => {
    expect(ad.cauciones[0]!.tna).toBeCloseTo(0.23, 10);
    expect(ad.ultimaRueda).toBe("2026-11-17");
  });

  it("vale la rueda más reciente: BYMA, vigente", () => {
    const r = elegirCauciones(
      [
        { fuente: "byma", datos: byma },
        { fuente: "argentinadatos", datos: ad },
      ],
      hoy,
      feriados,
    );
    expect(r?.fuente).toBe("byma");
    expect(r?.vigente).toBe(true);
  });

  it("si BYMA no responde, queda ArgentinaDatos, y con 7 días hábiles de atraso no está vigente", () => {
    const r = elegirCauciones(
      [
        { fuente: "byma", datos: null },
        { fuente: "argentinadatos", datos: ad },
      ],
      hoy,
      feriados,
    );
    expect(r?.fuente).toBe("argentinadatos");
    expect(r?.vigente).toBe(false);
  });

  it("a igual rueda gana la primera (BYMA), y sin datos de ninguna no hay caución", () => {
    const misma = { ...ad, ultimaRueda: "2026-11-27" };
    expect(
      elegirCauciones(
        [
          { fuente: "byma", datos: byma },
          { fuente: "argentinadatos", datos: misma },
        ],
        hoy,
        feriados,
      )?.fuente,
    ).toBe("byma");
    expect(
      elegirCauciones(
        [
          { fuente: "byma", datos: { cauciones: [], ultimaRueda: null } },
          { fuente: "argentinadatos", datos: null },
        ],
        hoy,
        feriados,
      ),
    ).toBeNull();
  });
});
