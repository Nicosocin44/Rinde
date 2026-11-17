import { describe, expect, it } from "vitest";
import { aporteParaLlegar, avance, evaluarMeta, mesesEntre, mesesFraccion, mesesParaLlegar, objetivoAjustado, type Meta } from "@/lib/calculos";

// Golden tests de metas de ahorro, calculados a mano.

const cerca = (valor: { toNumber(): number } | number, esperado: number, decimales = 6) =>
  expect(typeof valor === "number" ? valor : valor.toNumber()).toBeCloseTo(esperado, decimales);

describe("metas: piezas", () => {
  it("cuenta meses calendario completos", () => {
    expect(mesesEntre("2026-01-15", "2026-03-14")).toBe(1);
    expect(mesesEntre("2026-01-15", "2026-03-15")).toBe(2);
    expect(mesesEntre("2026-11-17", "2027-11-17")).toBe(12);
    expect(mesesEntre("2026-03-01", "2026-01-01")).toBe(0);
  });

  it("meses con decimales: 365 días son 12 meses", () => {
    cerca(mesesFraccion("2026-01-01", "2027-01-01"), 12, 10);
    expect(mesesFraccion("2026-03-01", "2026-01-01")).toBe(0);
  });

  it("cargar más de lo planeado nunca atrasa la fecha de llegada", () => {
    const base: Meta = { id: "a", nombre: "Auto", moneda: "ARS", objetivo: 20_000_000, fechaObjetivo: "2028-09-17", aporteMensual: 600_000, teaManual: null, creada: "2026-09-17", controles: [{ fecha: "2026-09-17", saldo: 2_000_000 }, { fecha: "2026-10-13", saldo: 2_400_000 }] };
    const ctx = { teaReferencia: 0.227, inflacionMensual: 0.0165 };
    const antes = evaluarMeta(base, ctx, "2026-10-13");
    const despues = evaluarMeta({ ...base, controles: [...base.controles, { fecha: "2026-11-17", saldo: 3_200_000 }] }, ctx, "2026-11-17");
    // Fechas de llegada en meses desde la creación.
    const llegadaAntes = mesesEntre(base.creada, "2026-10-13") + antes.mesesConTuAporte!;
    const llegadaDespues = mesesEntre(base.creada, "2026-11-17") + despues.mesesConTuAporte!;
    expect(llegadaDespues).toBeLessThanOrEqual(llegadaAntes);
  });

  it("ajusta el objetivo por inflación: 1.000 con 2 % mensual durante 12 meses = 1.268,24", () => {
    cerca(objetivoAjustado(1000, 0.02, 12), 1268.2417945625, 8);
    cerca(objetivoAjustado(1000, 0, 12), 1000, 12);
  });

  it("aporte para llegar: sin tasa ni inflación es dividir; con 1 % mensual, 100 por mes juntan 1.268,25 en 12 meses", () => {
    cerca(aporteParaLlegar(1200, 0, 0, 0, 12), 100, 12);
    cerca(aporteParaLlegar(1268.2503013197, 0, 0.01, 0, 12), 100, 6);
    cerca(aporteParaLlegar(1200, 1500, 0.01, 0, 12), 0, 12);
    cerca(aporteParaLlegar(1200, 0, 0.01, 0, 0), 0, 12);
  });

  it("aporte para llegar con inflación: el objetivo a 12 meses sube a 1.268,24 → 105,69 por mes sin tasa", () => {
    cerca(aporteParaLlegar(1000, 0, 0, 0.02, 12), 1268.2417945625 / 12, 6);
  });

  it("meses para llegar", () => {
    expect(mesesParaLlegar(1200, 0, 100, 0)).toBe(12);
    expect(mesesParaLlegar(1200, 0, 99, 0)).toBe(13);
    expect(mesesParaLlegar(1200, 1200, 0, 0)).toBe(0);
    expect(mesesParaLlegar(1200, 0, 0, 0)).toBeNull();
    // La inflación (5 % mensual) le gana a poner 1 por mes: nunca llega.
    expect(mesesParaLlegar(1000, 0, 1, 0, 0.05)).toBeNull();
    // 500 por mes contra un objetivo de 1.000 que sube 10 % por mes: 500/1.100, 1.000/1.210, 1.500/1.331 → 3.
    expect(mesesParaLlegar(1000, 0, 500, 0, 0.1)).toBe(3);
  });

  it("avance entre 0 y 1", () => {
    expect(avance(250, 1000)).toBe(0.25);
    expect(avance(1500, 1000)).toBe(1);
    expect(avance(-10, 1000)).toBe(0);
  });
});

describe("metas: evaluarMeta", () => {
  const viaje: Meta = {
    id: "viaje",
    nombre: "Viaje",
    moneda: "USD",
    objetivo: 800,
    fechaObjetivo: "2026-09-01",
    aporteMensual: 100,
    teaManual: null,
    creada: "2026-01-01",
    controles: [{ fecha: "2026-01-01", saldo: 0 }],
  };
  const contexto = { teaReferencia: 0.3, inflacionMensual: 0.02 };

  it("el día que se crea: 8 meses, 100 por mes, en dólares sin rendimiento ni inflación", () => {
    const e = evaluarMeta(viaje, contexto, "2026-01-01");
    expect(e.tea).toBe(0);
    expect(e.objetivoHoy).toBe(800);
    expect(e.objetivoFinal).toBe(800);
    expect(e.mesesRestantes).toBe(8);
    cerca(e.aporteNecesario, 100, 10);
    expect(e.mesesConTuAporte).toBe(8);
    expect(e.llegaEnFecha).toBe(true);
    expect(e.controlPendiente).toBe(false);
    expect(e.avance).toBe(0);
  });

  it("atrasada: a los 3 meses tenía que tener 300 y cargó 150 en el último control", () => {
    const meta = { ...viaje, controles: [...viaje.controles, { fecha: "2026-03-01", saldo: 150 }] };
    const e = evaluarMeta(meta, contexto, "2026-04-05");
    cerca(e.esperadoHoy, 300, 10);
    cerca(e.diferencia, -150, 10);
    expect(e.mesesRestantes).toBe(6);
    cerca(e.aporteNecesario, 650 / 6, 8);
    expect(e.mesesConTuAporte).toBe(7);
    expect(e.llegaEnFecha).toBe(false);
    expect(e.diasDesdeControl).toBe(35);
    expect(e.controlPendiente).toBe(true);
  });

  it("en pesos usa la tasa de referencia y ajusta el objetivo por inflación", () => {
    const auto: Meta = { ...viaje, id: "auto", moneda: "ARS", objetivo: 1_000_000 };
    const e = evaluarMeta(auto, contexto, "2026-04-01");
    expect(e.tea).toBe(0.3);
    // 90 días = 2,96 meses de inflación.
    cerca(e.objetivoHoy, 1_000_000 * 1.02 ** (90 / (365 / 12)), 4);
    cerca(e.objetivoFinal, 1_000_000 * 1.02 ** 8, 4);
  });

  it("una tasa elegida a mano manda sobre la de referencia", () => {
    expect(evaluarMeta({ ...viaje, teaManual: 0.05 }, contexto, "2026-01-01").tea).toBe(0.05);
  });

  it("cumplida: no pide más controles", () => {
    const meta = { ...viaje, controles: [...viaje.controles, { fecha: "2026-02-01", saldo: 900 }] };
    const e = evaluarMeta(meta, contexto, "2026-05-01");
    expect(e.cumplida).toBe(true);
    expect(e.avance).toBe(1);
    expect(e.llegaEnFecha).toBe(true);
    expect(e.controlPendiente).toBe(false);
  });
});
