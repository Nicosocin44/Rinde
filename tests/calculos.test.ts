import { describe, expect, it } from "vitest";
import {
  aporteNecesario,
  brecha,
  cobroAlVencimiento,
  construirIndice,
  actualizarMonto,
  convertirTasa,
  costoCompra,
  d,
  diferenciaMensual,
  fechaLiquidacion,
  gananciaConTope,
  gananciaPeriodo,
  habilesEntre,
  inflacionAcumulada,
  inflacionBreakeven,
  interesPlazoFijo,
  metricasBono,
  nivelEnFecha,
  proyeccion,
  rendimientoFci,
  rendimientoLecap,
  spread,
  sumarHabiles,
  tasaReal,
  teaCapitalizacionDiaria,
  teaDesdeTna,
  teaEfectivaConTope,
  temDesdeTea,
  tnaDesdeTea,
  teaDesdeTem,
  twr,
  valorFuturo,
  xirr,
  calculadoraFlujos,
  capitalParaRetiro,
  type DefinicionBono,
} from "@/lib/calculos";
import * as G from "./fixtures/golden";

const cerca = (valor: { toNumber(): number } | null, esperado: number, decimales = 8) => {
  expect(valor).not.toBeNull();
  expect(valor!.toNumber()).toBeCloseTo(esperado, decimales);
};

describe("1. tasas: TNA ↔ TEA ↔ TEM", () => {
  for (const caso of G.TASAS) {
    it(`ida y vuelta a ${caso.dias} días`, () => {
      const tea = teaDesdeTna(caso.tna, caso.dias);
      cerca(tea, caso.tea);
      cerca(temDesdeTea(tea), caso.tem);
      cerca(tnaDesdeTea(tea, caso.dias), caso.tna, 12);
      // Ida y vuelta TEA → TEM → TEA: tiene que volver al mismo valor (no al golden redondeado).
      cerca(teaDesdeTem(temDesdeTea(tea)), tea.toNumber(), 12);
      const todas = convertirTasa(caso.tem, "tem", caso.dias);
      cerca(todas.tna, caso.tna, 7);
    });
  }
  it("capitalización diaria", () => cerca(teaCapitalizacionDiaria(0.32), G.TEA_DIARIA_32));
  it("tasa real", () => cerca(tasaReal(0.3, 0.25), 0.04, 12));
  it("ganancia del período y diferencia mensual son consistentes", () => {
    const a = gananciaPeriodo(2_000_000, 0.3, 30);
    const b = gananciaPeriodo(2_000_000, 0.36, 30);
    cerca(diferenciaMensual(2_000_000, 0.3, 0.36), b.minus(a).toNumber(), 6);
  });
  it("tope: el excedente no rinde", () => {
    cerca(gananciaConTope(3_000_000, 0.3, 365, 1_000_000), 300_000, 6);
    cerca(teaEfectivaConTope(3_000_000, 0.3, 1_000_000), 0.1, 12);
    cerca(teaEfectivaConTope(500_000, 0.3, 1_000_000), 0.3, 12);
    cerca(teaEfectivaConTope(500_000, 0.3, null), 0.3, 12);
  });
});

describe("2. plazo fijo", () => {
  it("interés exacto de $1.000.000 a 30 días al 24 % TNA", () => {
    const interes = interesPlazoFijo(G.PLAZO_FIJO.capital, G.PLAZO_FIJO.tna, G.PLAZO_FIJO.dias);
    // Precisión de 20 dígitos significativos: exacto hasta el 15.º decimal de un peso.
    expect(interes.toFixed(15)).toBe(d(G.PLAZO_FIJO.interes).toFixed(15));
    expect(interes.toFixed(2)).toBe("19726.03");
  });
});

describe("3. LECAP", () => {
  it("TNA, TEA y TEM con VF, precio y días conocidos", () => {
    const r = rendimientoLecap(G.LECAP.vf, G.LECAP.precio, G.LECAP.dias)!;
    cerca(r.directo, G.LECAP.directo);
    cerca(r.tna, G.LECAP.tna);
    cerca(r.tea, G.LECAP.tea);
    cerca(r.tem, G.LECAP.tem);
  });
  it("calculadora: pongo $1.000.000", () => {
    const c = cobroAlVencimiento(1_000_000, G.LECAP.precio, G.LECAP.vf);
    cerca(c.nominales, G.LECAP.nominales, 3);
    cerca(c.cobro, G.LECAP.cobro, 4);
  });
  it("vencida o sin precio → null (nunca Infinity ni NaN)", () => {
    expect(rendimientoLecap(100, 99, 0)).toBeNull();
    expect(rendimientoLecap(100, 99, -3)).toBeNull();
    expect(rendimientoLecap(100, 0, 10)).toBeNull();
  });
});

describe("4. FCI money market", () => {
  it("TNA y TEA desde dos cuotapartes", () => {
    const r = rendimientoFci(G.FCI.vcpActual, G.FCI.vcpAnterior, G.FCI.dias)!;
    cerca(r.directo, G.FCI.directo, 12);
    cerca(r.tna, G.FCI.tna);
    cerca(r.tea, G.FCI.tea);
  });
});

describe("5. bonos: TIR, duration y paridad", () => {
  const bullet: DefinicionBono = {
    ticker: "BULLET",
    pagos: ["2027-01-01", "2028-01-01"],
    inicioDevengamiento: "2026-01-01",
    cupones: [{ desde: "2026-01-01", tasaAnual: 0.1 }],
    amortizaciones: { "2028-01-01": 100 },
    frecuencia: 1,
  };
  it("bullet anual a la par", () => {
    const m = metricasBono(bullet, 100, "2026-01-01")!;
    cerca(m.tir, G.BONO_BULLET.tir, 9);
    cerca(m.duration, G.BONO_BULLET.duration, 8);
    cerca(m.paridad, G.BONO_BULLET.paridad, 12);
  });
  const semestral: DefinicionBono = {
    ticker: "SEM",
    pagos: ["2026-07-01", "2027-01-01", "2027-07-01", "2028-01-01", "2028-07-01", "2029-01-01"],
    inicioDevengamiento: "2026-01-01",
    cupones: [{ desde: "2026-01-01", tasaAnual: 0.08 }],
    amortizaciones: { "2029-01-01": 100 },
    frecuencia: 2,
  };
  it("semestral bajo la par", () => {
    const m = metricasBono(semestral, G.BONO_SEMESTRAL.precio, "2026-01-01")!;
    cerca(m.tir, G.BONO_SEMESTRAL.tir, 8);
    cerca(m.duration, G.BONO_SEMESTRAL.duration, 7);
    cerca(m.durationModificada, G.BONO_SEMESTRAL.durationModificada, 7);
    cerca(m.paridad, G.BONO_SEMESTRAL.paridad, 12);
    expect(m.proximoPago?.fecha).toBe("2026-07-01");
  });
  it("intereses corridos y residual con amortizaciones parciales", () => {
    const amortizable: DefinicionBono = { ...semestral, amortizaciones: { "2028-01-01": 50, "2029-01-01": 50 } };
    const m = metricasBono(amortizable, 60, "2028-04-01")!;
    cerca(m.residual, 50, 12);
    // Cupón del semestre: 50 × 8 % / 2 = 2; corridos: 91 de 182 días.
    cerca(m.valorTecnico, 51, 10);
  });
  it("calculadora de flujos", () => {
    const c = calculadoraFlujos(semestral, 9500, 95, "2026-01-01");
    cerca(c.nominales, 10_000, 10);
    expect(c.cobros).toHaveLength(6);
    cerca(c.totalCobrado, 12_400, 8);
  });
  it("precio inválido → null", () => expect(metricasBono(bullet, 0, "2026-01-01")).toBeNull());
});

describe("6. breakeven", () => {
  it("LECAP contra CER", () => {
    const be = inflacionBreakeven(G.BREAKEVEN.teaLecap, G.BREAKEVEN.tirReal);
    cerca(be.anual, G.BREAKEVEN.anual);
    cerca(be.mensual, G.BREAKEVEN.mensual);
  });
});

describe("7 y 8. interés compuesto y metas", () => {
  const { c0, aporte, i, n } = G.INTERES_COMPUESTO;
  it("aportes al final y al inicio", () => {
    cerca(valorFuturo(c0, aporte, i, n, false), G.INTERES_COMPUESTO.alFinal, 5);
    cerca(valorFuturo(c0, aporte, i, n, true), G.INTERES_COMPUESTO.alInicio, 5);
  });
  it("la proyección período a período termina en el mismo valor", () => {
    const serie = proyeccion(c0, aporte, i, n, true);
    expect(serie).toHaveLength(n + 1);
    cerca(serie[n]!.total, G.INTERES_COMPUESTO.alInicio, 5);
    cerca(serie[n]!.aportado, c0 + aporte * n, 8);
  });
  it("aporte necesario para una meta", () => {
    cerca(aporteNecesario(G.META.meta, c0, i, n, false), G.META.alFinal, 5);
    cerca(aporteNecesario(G.META.meta, c0, i, n, true), G.META.alInicio, 5);
    cerca(valorFuturo(c0, aporteNecesario(G.META.meta, c0, i, n, true), i, n, true), G.META.meta, 6);
  });
  it("tasa cero y meta ya alcanzada", () => {
    cerca(valorFuturo(100, 10, 0, 12), 220, 12);
    cerca(aporteNecesario(100, 500, 0.01, 12), 0, 12);
  });
  it("regla de retiro", () => cerca(capitalParaRetiro(12_000, 0.04), 300_000, 8));
});

describe("rendimiento: TWR y XIRR", () => {
  it("TWR del ejemplo del JSDoc", () => {
    cerca(
      twr([
        { fecha: "2026-01-01", valor: 100, flujo: 100 },
        { fecha: "2026-02-01", valor: 110, flujo: 0 },
        { fecha: "2026-03-01", valor: 168, flujo: 50 },
      ]),
      0.155,
      12,
    );
  });
  it("XIRR simple a un año", () => {
    cerca(xirr([{ fecha: "2026-01-01", monto: -1000 }, { fecha: "2027-01-01", monto: 1100 }]), 0.1, 8);
  });
  it("XIRR sin cambio de signo → null", () => {
    expect(xirr([{ fecha: "2026-01-01", monto: 1000 }, { fecha: "2027-01-01", monto: 1100 }])).toBeNull();
  });
});

describe("inflación", () => {
  it("acumulada", () => cerca(inflacionAcumulada([2, 3, 1]), G.INFLACION_ACUMULADA, 10));
  it("índice y actualización de montos", () => {
    const indice = construirIndice([
      { fecha: "2026-01-31", valor: 2 },
      { fecha: "2026-02-28", valor: 3 },
      { fecha: "2026-03-31", valor: 1 },
    ]);
    const origen = nivelEnFecha(indice, "2025-12-31")!;
    const destino = nivelEnFecha(indice, "2026-03-31")!;
    cerca(actualizarMonto(1000, origen, destino), 1061.106, 8);
    // Mitad de febrero: 1,02 × 1,03^(14/28)
    cerca(nivelEnFecha(indice, "2026-02-14"), 1.02 * Math.sqrt(1.03), 10);
    // Después del último dato, proyecta con la tasa indicada.
    cerca(nivelEnFecha(indice, "2026-04-30", 2), 1.061106 * 1.02, 10);
    expect(nivelEnFecha(indice, "2025-06-15")).toBeNull();
  });
});

describe("dólar", () => {
  it("spread, costo de USD 1.000 y brecha", () => {
    cerca(spread(1567, 1548), G.DOLAR.spread);
    cerca(costoCompra(1000, 1567, 0.005), G.DOLAR.costoMil, 6);
    cerca(brecha(1585, 1575), G.DOLAR.brecha);
  });
});

describe("días hábiles", () => {
  const feriados = new Set(["2026-11-23", "2026-12-08"]);
  it("liquidación 24 hs salta fines de semana y feriados", () => {
    expect(fechaLiquidacion("2026-11-16", "24hs", feriados)).toBe("2026-11-17");
    expect(fechaLiquidacion("2026-11-20", "24hs", feriados)).toBe("2026-11-24"); // viernes → lunes feriado → martes
    expect(fechaLiquidacion("2026-11-21", "ci", feriados)).toBe("2026-11-24"); // sábado → próximo hábil
  });
  it("cuenta de hábiles", () => {
    expect(habilesEntre("2026-11-16", "2026-11-30", feriados)).toBe(9);
    expect(sumarHabiles("2026-11-16", 5, feriados)).toBe("2026-11-24");
  });
});
