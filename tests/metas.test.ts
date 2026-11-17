import { describe, expect, it } from "vitest";
import {
  aporteParaLlegar,
  avance,
  caminoMeta,
  compararAlternativas,
  crecer,
  hitosMeta,
  rendimientoReal,
  resumenMetas,
  vencimientos,
  evaluarMeta,
  mesesEntre,
  mesesFraccion,
  mesesParaLlegar,
  objetivoAjustado,
  teaPromedio,
  tenencias,
  type AporteMeta,
  type InstrumentoMeta,
  type Meta,
} from "@/lib/calculos";

// Golden tests de metas de ahorro, calculados a mano.

const cerca = (valor: { toNumber(): number } | number, esperado: number, decimales = 6) =>
  expect(typeof valor === "number" ? valor : valor.toNumber()).toBeCloseTo(esperado, decimales);

const billetera: InstrumentoMeta = { id: "mp", nombre: "Mercado Pago", tipo: "billetera", tea: 0.21 };
const dolares: InstrumentoMeta = { id: "dolares", nombre: "Dólares guardados", tipo: "dolares", tea: 0 };
let n = 0;
const aporte = (fecha: string, monto: number, instrumento: InstrumentoMeta): AporteMeta => ({ id: `a${n++}`, fecha, monto, instrumento });

describe("metas: piezas", () => {
  it("cuenta meses calendario completos y meses con decimales", () => {
    expect(mesesEntre("2026-01-15", "2026-03-14")).toBe(1);
    expect(mesesEntre("2026-01-15", "2026-03-15")).toBe(2);
    expect(mesesEntre("2026-03-01", "2026-01-01")).toBe(0);
    cerca(mesesFraccion("2026-01-01", "2027-01-01"), 12, 10);
    expect(mesesFraccion("2026-03-01", "2026-01-01")).toBe(0);
  });

  it("crecer: 1.000 a 21 % TEA durante un año = 1.210; a 44 % durante medio año = 1.200", () => {
    cerca(crecer(1000, 0.21, 365), 1210, 10);
    cerca(crecer(1000, 0.44, 182.5), 1200, 10);
    cerca(crecer(1000, 0.44, 0), 1000, 12);
  });

  it("ajusta el objetivo por inflación: 1.000 con 2 % mensual durante 12 meses = 1.268,24", () => {
    cerca(objetivoAjustado(1000, 0.02, 12), 1268.2417945625, 8);
  });

  it("aporte para llegar, con lo invertido y lo nuevo rindiendo distinto", () => {
    cerca(aporteParaLlegar(1200, 0, 0, 0, 12), 100, 12);
    cerca(aporteParaLlegar(1200, 600, 0, 0, 12), 50, 12);
    // 1.000 invertidos al 1 % mensual llegan a 1.126,83; faltan 141,43 que se juntan sin rendimiento: 11,79 por mes.
    cerca(aporteParaLlegar(1268.2503013197, 1000, 0.01, 0, 12, 0), 141.425271187731 / 12, 8);
    // Con 1 % mensual para todo, 100 por mes juntan 1.268,25 en 12 meses.
    cerca(aporteParaLlegar(1268.2503013197, 0, 0.01, 0, 12), 100, 6);
    cerca(aporteParaLlegar(1200, 1500, 0.01, 0, 12), 0, 12);
    // Con inflación del 2 % mensual el objetivo a 12 meses sube a 1.268,24: 105,69 por mes sin tasa.
    cerca(aporteParaLlegar(1000, 0, 0, 0.02, 12), 1268.2417945625 / 12, 6);
  });

  it("meses para llegar", () => {
    expect(mesesParaLlegar(1200, 0, 100, 0)).toBe(12);
    expect(mesesParaLlegar(1200, 0, 99, 0)).toBe(13);
    expect(mesesParaLlegar(1200, 600, 50, 0)).toBe(12);
    expect(mesesParaLlegar(1200, 1200, 0, 0)).toBe(0);
    expect(mesesParaLlegar(1200, 0, 0, 0)).toBeNull();
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

describe("metas: tenencias por instrumento", () => {
  it("un aporte crece a su TEA hasta hoy", () => {
    const [t] = tenencias({ aportes: [aporte("2026-01-01", 1000, billetera)], ajustes: [] }, "2027-01-01");
    cerca(t!.valor, 1210, 8);
    expect(t!.aportado).toBe(1000);
    cerca(t!.ganancia, 210, 8);
  });

  it("un segundo aporte suma y la TEA pasa a ser la del último", () => {
    const mas = { ...billetera, tea: 0.44 };
    const [t] = tenencias({ aportes: [aporte("2026-01-01", 1000, billetera), aporte("2027-01-01", 500, mas)], ajustes: [] }, "2028-01-01");
    // (1.210 + 500) × 1,44 = 2.462,4
    cerca(t!.valor, 2462.4, 8);
    expect(t!.aportado).toBe(1500);
    expect(t!.instrumento.tea).toBe(0.44);
  });

  it("un ajuste reemplaza la estimación por el valor real y sigue creciendo desde ahí", () => {
    const meta = { aportes: [aporte("2026-01-01", 1000, billetera)], ajustes: [{ id: "j", fecha: "2026-07-01", instrumentoId: "mp", valor: 1300 }] };
    const [hoyMismo] = tenencias(meta, "2026-07-01");
    expect(hoyMismo!.valor).toBe(1300);
    expect(hoyMismo!.valorReal).toBe(true);
    const [unAnio] = tenencias(meta, "2027-07-01");
    cerca(unAnio!.valor, 1573, 8);
    expect(unAnio!.valorReal).toBe(false);
  });

  it("en un mismo día respeta el orden de carga: un retiro después de un ajuste resta del valor real", () => {
    const meta = {
      aportes: [
        { ...aporte("2026-01-01", 1000, billetera), cargado: "2026-01-01T10:00:00Z" },
        { ...aporte("2026-01-01", -100, billetera), cargado: "2026-01-01T12:00:00Z" },
      ],
      ajustes: [{ id: "j", fecha: "2026-01-01", instrumentoId: "mp", valor: 1050, cargado: "2026-01-01T11:00:00Z" }],
    };
    const [t] = tenencias(meta, "2026-01-01");
    expect(t!.valor).toBe(950);
    expect(t!.aportado).toBe(900);
  });

  it("los retiros restan y el valor nunca queda negativo", () => {
    const [t] = tenencias({ aportes: [aporte("2026-01-01", 1000, dolares), aporte("2026-01-01", -400, dolares)], ajustes: [] }, "2026-06-01");
    expect(t!.valor).toBe(600);
    expect(t!.aportado).toBe(600);
    const [vacio] = tenencias({ aportes: [aporte("2026-01-01", 100, dolares), aporte("2026-02-01", -300, dolares)], ajustes: [] }, "2026-06-01");
    expect(vacio!.valor).toBe(0);
  });

  it("varios instrumentos, ordenados por valor; TEA promedio ponderada", () => {
    const a = { id: "a", nombre: "A", tipo: "fci", tea: 0.2 };
    const b = { id: "b", nombre: "B", tipo: "plazo_fijo", tea: 0.4 };
    const lista = tenencias({ aportes: [aporte("2026-01-01", 1000, a), aporte("2026-01-01", 3000, b)], ajustes: [] }, "2026-01-01");
    expect(lista.map((t) => t.instrumento.id)).toEqual(["b", "a"]);
    cerca(teaPromedio(lista), 0.35, 12);
    expect(teaPromedio([])).toBe(0);
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
    aportes: [],
    ajustes: [],
  };
  const contexto = { teaReferencia: 0.3, inflacionMensual: 0.02 };

  it("el día que se crea: 8 meses, 100 por mes, en dólares sin rendimiento ni inflación", () => {
    const e = evaluarMeta(viaje, contexto, "2026-01-01");
    expect(e.teaPlan).toBe(0);
    expect(e.objetivoHoy).toBe(800);
    expect(e.mesesRestantes).toBe(8);
    cerca(e.aporteNecesario, 100, 10);
    expect(e.mesesConTuAporte).toBe(8);
    expect(e.llegaEnFecha).toBe(true);
    expect(e.controlPendiente).toBe(false);
    expect(e.comparacion).toBeNull();
  });

  it("atrasada: a los 3 meses tenía que tener 300 y puso 150", () => {
    const meta = { ...viaje, aportes: [aporte("2026-02-01", 100, dolares), aporte("2026-03-01", 50, dolares)] };
    const e = evaluarMeta(meta, contexto, "2026-04-05");
    expect(e.saldo).toBe(150);
    expect(e.aportado).toBe(150);
    cerca(e.esperadoHoy, 300, 10);
    cerca(e.diferencia, -150, 10);
    expect(e.mesesRestantes).toBe(4);
    cerca(e.aporteNecesario, 650 / 4, 8);
    expect(e.mesesConTuAporte).toBe(7);
    expect(e.llegaEnFecha).toBe(false);
    expect(e.diasDesdeMovimiento).toBe(35);
    expect(e.controlPendiente).toBe(true);
  });

  it("en pesos: el plan usa la tasa de hoy, el objetivo sube con la inflación y compara contra lo invertido", () => {
    const pf = { id: "pf", nombre: "Plazo fijo", tipo: "plazo_fijo", tea: 0.25 };
    const auto: Meta = { ...viaje, id: "auto", moneda: "ARS", objetivo: 1_000_000, aportes: [aporte("2026-01-01", 100_000, pf)] };
    const e = evaluarMeta(auto, contexto, "2026-01-01");
    expect(e.teaPlan).toBe(0.3);
    expect(e.teaSaldo).toBe(0.25);
    cerca(e.objetivoFinal, 1_000_000 * 1.02 ** 8, 4);
    cerca(e.comparacion!.extraPorMes, 100_000 * (1.3 ** (1 / 12) - 1.25 ** (1 / 12)), 6);
    // 90 días después, el objetivo subió 2,96 meses de inflación.
    cerca(evaluarMeta(auto, contexto, "2026-04-01").objetivoHoy, 1_000_000 * 1.02 ** (90 / (365 / 12)), 4);
    // Menos de un punto de diferencia: no compara.
    expect(evaluarMeta(auto, { ...contexto, teaReferencia: 0.255 }, "2026-01-01").comparacion).toBeNull();
  });

  it("una tasa elegida a mano manda sobre la de referencia y apaga la comparación", () => {
    const e = evaluarMeta({ ...viaje, moneda: "ARS", teaManual: 0.05, aportes: [aporte("2026-01-01", 100, dolares)] }, contexto, "2026-01-01");
    expect(e.teaPlan).toBe(0.05);
    expect(e.comparacion).toBeNull();
  });

  it("tener más plata nunca atrasa la fecha de llegada", () => {
    const base: Meta = { ...viaje, moneda: "ARS", objetivo: 20_000_000, fechaObjetivo: "2028-09-17", aporteMensual: 600_000, creada: "2026-09-17" };
    const poco = evaluarMeta({ ...base, aportes: [aporte("2026-09-17", 2_400_000, billetera)] }, contexto, "2026-11-17");
    const mucho = evaluarMeta({ ...base, aportes: [aporte("2026-09-17", 3_200_000, billetera)] }, contexto, "2026-11-17");
    expect(mucho.mesesConTuAporte!).toBeLessThanOrEqual(poco.mesesConTuAporte!);
    expect(mucho.aporteNecesario).toBeLessThan(poco.aporteNecesario);
  });

  it("cumplida: no pide más controles", () => {
    const e = evaluarMeta({ ...viaje, aportes: [aporte("2026-02-01", 900, dolares)] }, contexto, "2026-05-01");
    expect(e.cumplida).toBe(true);
    expect(e.avance).toBe(1);
    expect(e.controlPendiente).toBe(false);
  });
});

describe("metas: más datos", () => {
  it("camino mes a mes: lo invertido, lo nuevo y el objetivo con inflación", () => {
    const plano = caminoMeta({ saldo: 1000, aportado: 1000, aporte: 100, tasaSaldo: 0, tasaAporte: 0, objetivoHoy: 2000, inflacionMensual: 0, meses: 3 });
    expect(plano.map((p) => p.total)).toEqual([1000, 1100, 1200, 1300]);
    expect(plano.every((p) => p.ganancia === 0 && p.objetivo === 2000)).toBe(true);
    const rinde = caminoMeta({ saldo: 1000, aportado: 1000, aporte: 0, tasaSaldo: 0.01, tasaAporte: 0, objetivoHoy: 2000, inflacionMensual: 0.1, meses: 12 });
    cerca(rinde[12]!.total, 1126.825030131969, 8);
    cerca(rinde[12]!.ganancia, 126.825030131969, 8);
    cerca(rinde[2]!.objetivo, 2420, 8);
  });

  it("hitos: primer mes en que llega al 25, 50, 75 y 100 %", () => {
    const camino = caminoMeta({ saldo: 0, aportado: 0, aporte: 250, tasaSaldo: 0, tasaAporte: 0, objetivoHoy: 1000, inflacionMensual: 0, meses: 4 });
    expect(hitosMeta(camino).map((h) => h.mes)).toEqual([1, 2, 3, 4]);
    expect(hitosMeta(camino.slice(0, 4)).map((h) => h.mes)).toEqual([1, 2, 3, null]);
  });

  it("rendimiento real: cada aporte se actualiza por IPC desde su fecha", () => {
    const indice: Record<string, number> = { "2026-01-01": 1, "2026-07-01": 1.1, "2027-01-01": 1.21 };
    const nivel = (f: string) => indice[f] ?? null;
    const aportes = [aporte("2026-01-01", 1000, billetera), aporte("2026-07-01", 500, billetera)];
    // 1.000 × 1,21 + 500 × 1,21 / 1,1 = 1.760 en pesos de hoy; tiene 2.000 → ganó 240 por encima de la inflación.
    const r = rendimientoReal(aportes, 2000, "2027-01-01", nivel)!;
    cerca(r.aportadoHoy, 1760, 8);
    cerca(r.gananciaReal, 240, 8);
    expect(rendimientoReal([aporte("2025-01-01", 1, billetera)], 2000, "2027-01-01", nivel)).toBeNull();
    expect(rendimientoReal([], 2000, "2027-01-01", nivel)).toBeNull();
  });

  it("vencimientos: plazos fijos y letras, desde hace 30 días, ordenados", () => {
    const pf = { id: "pf", nombre: "Plazo fijo", tipo: "plazo_fijo", tea: 0.25, plazoDias: 30 };
    const lista = vencimientos(
      [aporte("2026-11-10", 500, pf), aporte("2026-10-01", 1000, pf), aporte("2026-08-01", 1000, pf), aporte("2026-10-01", 1000, billetera), aporte("2026-10-05", -100, pf)],
      "2026-11-17",
    );
    expect(lista.map((v) => [v.vence, v.vencido])).toEqual([
      ["2026-10-31", true],
      ["2026-12-10", false],
    ]);
  });

  it("alternativas: neutral, ordena solo por TEA; más tasa, menos aporte por mes", () => {
    const meta: Meta = { id: "m", nombre: "M", moneda: "ARS", objetivo: 1200, fechaObjetivo: "2027-01-01", aporteMensual: 100, teaManual: null, creada: "2026-01-01", aportes: [], ajustes: [] };
    const alternativas = [
      { id: "b", nombre: "B", tipo: "fci", tea: 0 },
      { id: "a", nombre: "A", tipo: "billetera", tea: 0.3 },
    ];
    const r = compararAlternativas(meta, { teaReferencia: 0.2, inflacionMensual: 0 }, "2026-01-01", alternativas);
    expect(r.map((x) => x.alternativa.id)).toEqual(["a", "b"]);
    cerca(r[1]!.aporteNecesario, 100, 10);
    expect(r[0]!.aporteNecesario).toBeLessThan(r[1]!.aporteNecesario);
    // El orden no depende del orden de entrada.
    expect(compararAlternativas(meta, { teaReferencia: 0.2, inflacionMensual: 0 }, "2026-01-01", [...alternativas].reverse()).map((x) => x.alternativa.id)).toEqual(["a", "b"]);
  });

  it("resumen: suma por moneda, sin mezclar pesos con dólares", () => {
    const contexto = { teaReferencia: 0, inflacionMensual: 0 };
    const base: Meta = { id: "x", nombre: "X", moneda: "ARS", objetivo: 1200, fechaObjetivo: "2027-01-01", aporteMensual: 100, teaManual: null, creada: "2026-01-01", aportes: [], ajustes: [] };
    const metas: Meta[] = [
      { ...base, id: "1", aportes: [aporte("2026-01-01", 600, dolares)] },
      { ...base, id: "2", aportes: [aporte("2026-01-01", 1200, dolares)] },
      { ...base, id: "3", moneda: "USD", aportes: [aporte("2026-01-01", 100, dolares)] },
    ];
    const r = resumenMetas(metas.map((meta) => ({ meta, estado: evaluarMeta(meta, contexto, "2026-01-01") })));
    expect(r.map((x) => x.moneda)).toEqual(["ARS", "USD"]);
    expect(r[0]).toMatchObject({ cantidad: 2, saldo: 1800, cumplidas: 1 });
    // Solo la meta sin cumplir suma: le faltan 600 en 12 meses = 50 por mes.
    cerca(r[0]!.aporteNecesario, 50, 10);
    expect(r[1]).toMatchObject({ cantidad: 1, saldo: 100 });
  });
});
