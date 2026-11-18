import { describe, expect, it } from "vitest";
import { analizarEstrategia, costoEstrategia, deltaBS, lanzamientoCubierto, normalAcumulada, parsearSimbolo, primaBS, resultadoAlVencimiento, tasaCaja, tercerViernes, vencimientoDelMes, vencimientoOpcion, volatilidadImplicita, type Pata } from "@/lib/calculos";
import { normalizarOpciones } from "@/lib/data/servicios/opciones";
import { armarCajas, armarLanzamientos } from "@/lib/opciones/tasas";
import { armarHistorial } from "@/lib/opciones/historial";

const sinFeriados = new Set<string>();

describe("opciones · símbolos", () => {
  it("desarma call, put, base y mes", () => {
    expect(parsearSimbolo("GFGC5400DI")).toEqual({ prefijo: "GFG", tipo: "call", base: 5400, codigoMes: "DI" });
    expect(parsearSimbolo("GFGV4400FE")).toEqual({ prefijo: "GFG", tipo: "put", base: 4400, codigoMes: "FE" });
  });
  it("con una base de 5 cifras el mes queda en una letra", () => {
    expect(parsearSimbolo("GFGC10300D")).toEqual({ prefijo: "GFG", tipo: "call", base: 10300, codigoMes: "D" });
  });
  it("descarta lo que no es una opción", () => {
    expect(parsearSimbolo("GGAL")).toBeNull();
    expect(parsearSimbolo("GFGX5400DI")).toBeNull();
    expect(parsearSimbolo("GFGC5400ZZ")).toBeNull();
  });
});

describe("opciones · vencimientos", () => {
  it("el tercer viernes del mes", () => {
    expect(tercerViernes(2026, 11)).toBe("2026-11-20");
    expect(tercerViernes(2026, 12)).toBe("2026-12-18");
    expect(tercerViernes(2027, 2)).toBe("2027-02-19");
  });
  it("si es feriado, vence el hábil anterior", () => {
    expect(vencimientoDelMes(2026, 12, new Set(["2026-12-18"]))).toBe("2026-12-17");
  });
  it("resuelve el código de mes al próximo vencimiento", () => {
    expect(vencimientoOpcion("NO", "2026-11-18", sinFeriados)).toBe("2026-11-20");
    expect(vencimientoOpcion("FE", "2026-11-18", sinFeriados)).toBe("2027-02-19");
    expect(vencimientoOpcion("D", "2026-11-18", sinFeriados)).toBe("2026-12-18");
  });
  it("un vencimiento que pasó hace poco queda vencido, no salta al año siguiente", () => {
    expect(vencimientoOpcion("NO", "2026-11-23", sinFeriados)).toBe("2026-11-20");
  });
  it("una letra ambigua usa el mes que aparece completo en el panel; si no, el más cercano", () => {
    expect(vencimientoOpcion("A", "2026-11-18", sinFeriados, new Set(["AG"]))).toBe("2027-08-20");
    expect(vencimientoOpcion("A", "2026-11-18", sinFeriados)).toBe("2027-04-16");
  });
});

describe("opciones · Black-Scholes", () => {
  const base = { s: 100, k: 100, t: 1, r: 0.05, sigma: 0.2 };
  it("normal acumulada", () => {
    expect(normalAcumulada(0)).toBeCloseTo(0.5, 7);
    expect(normalAcumulada(1.96)).toBeCloseTo(0.975, 4);
    expect(normalAcumulada(-1.96)).toBeCloseTo(0.025, 4);
  });
  it("prima de call y put (caso de libro: Hull)", () => {
    expect(primaBS({ ...base, tipo: "call" })).toBeCloseTo(10.4506, 3);
    expect(primaBS({ ...base, tipo: "put" })).toBeCloseTo(5.5735, 3);
  });
  it("delta", () => {
    expect(deltaBS({ ...base, tipo: "call" })).toBeCloseTo(0.6368, 3);
    expect(deltaBS({ ...base, tipo: "put" })).toBeCloseTo(-0.3632, 3);
  });
  it("la volatilidad implícita recupera la σ de la prima", () => {
    for (const tipo of ["call", "put"] as const) {
      const p = { tipo, s: 4715, k: 5400, t: 30 / 365, r: 0.35 };
      const prima = primaBS({ ...p, sigma: 0.55 });
      expect(volatilidadImplicita(prima, p)).toBeCloseTo(0.55, 5);
    }
  });
  it("sin solución si la prima está por debajo del valor intrínseco", () => {
    expect(volatilidadImplicita(300, { tipo: "call", s: 4715, k: 4400, t: 30 / 365, r: 0 })).toBeNull();
    expect(volatilidadImplicita(0, { tipo: "call", s: 4715, k: 4400, t: 30 / 365, r: 0 })).toBeNull();
    expect(volatilidadImplicita(100, { tipo: "call", s: 4715, k: 4400, t: 0, r: 0 })).toBeNull();
  });
});

describe("opciones · lanzamiento cubierto", () => {
  it("calculado a mano: acción $4.720, call base $4.400 cobrado a $480, 31 días", () => {
    const l = lanzamientoCubierto(4720, 480, 4400, 31)!;
    expect(l.inversion.toNumber()).toBe(4240);
    expect(l.directo.toNumber()).toBeCloseTo(4400 / 4240 - 1, 10);
    expect(l.tna.toNumber()).toBeCloseTo(0.444311, 5);
    expect(l.tea.toNumber()).toBeCloseTo(Math.pow(4400 / 4240, 365 / 31) - 1, 8);
    expect(l.colchon.toNumber()).toBeCloseTo(0.0677966, 6);
    expect(l.equilibrio.toNumber()).toBe(4240);
    expect(l.caidaEquilibrio.toNumber()).toBeCloseTo(480 / 4720, 10);
  });
  it("base por encima del precio: el colchón es negativo (la acción tiene que subir)", () => {
    expect(lanzamientoCubierto(4720, 100, 5000, 31)!.colchon.toNumber()).toBeLessThan(0);
  });
  it("sin datos válidos devuelve null", () => {
    expect(lanzamientoCubierto(4720, 0, 4400, 31)).toBeNull();
    expect(lanzamientoCubierto(4720, 480, 4400, 0)).toBeNull();
    expect(lanzamientoCubierto(400, 480, 4400, 31)).toBeNull();
  });
});

describe("opciones · cadena", () => {
  const fila = (symbol: string, px_bid: number | null, px_ask: number | null, c: number | null, v = 10) => ({ symbol, q_bid: 5, px_bid, px_ask, q_ask: 5, v, q_op: 3, c, pct_change: 1.5 });
  const armar = (panel: ReturnType<typeof fila>[], hoy = "2026-11-18") =>
    normalizarOpciones({ panel, prefijo: "GFG", subyacente: { precio: 4715, compra: 4710, venta: 4720 }, hoy, feriados: sinFeriados, tasa: () => ({ nombre: "Caución", tna: 0.3, tea: 0.35 }) });

  it("agrupa por vencimiento y base, y une la letra suelta con su mes", () => {
    const { vencimientos } = armar([fila("GFGC4400DI", 480, 490, 485), fila("GFGV4400DI", 60, 65, 62), fila("GFGC10300D", 1, 2, 1.5), fila("YPFC10000D", 5, 6, 5)]);
    expect(vencimientos).toHaveLength(1);
    const v = vencimientos[0]!;
    expect(v.fecha).toBe("2026-12-18");
    expect(v.filas.map((f) => f.base)).toEqual([4400, 10300]);
    expect(v.filas[0]!.call?.referencia).toBe(485);
    expect(v.filas[0]!.put?.simbolo).toBe("GFGV4400DI");
  });
  it("calcula volatilidad implícita y delta, y el lanzamiento cubierto con la punta compradora del call", () => {
    const v = armar([fila("GFGC4400DI", 480, 490, 485)]).vencimientos[0]!;
    const call = v.filas[0]!.call!;
    expect(call.vi).not.toBeNull();
    expect(call.delta).toBeGreaterThan(0.5);
    expect(call.intrinseco).toBe(4715 - 4400);
    const l = armarLanzamientos(v.filas, 4720, v.diasCobro)[0]!;
    expect(l.prima).toBe(480);
    expect(l.inversion).toBe(4720 - 480);
    // Liquidación 19/11 (24 hs) → cobro del ejercicio 21/12 (vencimiento + 1 hábil) = 32 días.
    expect(v.diasCobro).toBe(32);
  });
  it("excluye las vencidas y las puntas cruzadas", () => {
    const { vencimientos, excluidos } = armar([fila("GFGV5400NO", 700, 710, 705), fila("GFGC4400DI", 500, 490, 485)], "2026-11-23");
    expect(excluidos.map((e) => e.id)).toEqual(["GFGV5400NO", "GFGC4400DI"]);
    const call = vencimientos[0]!.filas[0]!.call!;
    expect(call.compra).toBeNull();
    expect(call.venta).toBeNull();
    expect(call.referencia).toBe(485);
  });
  it("una prima que no operó y no tiene puntas no se usa para el modelo", () => {
    const call = armar([fila("GFGC4400DI", null, null, 485, 0)]).vencimientos[0]!.filas[0]!.call!;
    expect(call.referencia).toBeNull();
    expect(call.vi).toBeNull();
  });
});

describe("opciones · lanzamiento cubierto con comisión", () => {
  it("la comisión se cobra al comprar la acción, al vender el call y al entregar en el ejercicio", () => {
    const l = lanzamientoCubierto(4720, 480, 4400, 31, 0.005)!;
    expect(l.inversion.toNumber()).toBeCloseTo(4720 * 1.005 - 480 * 0.995, 8);
    expect(l.directo.toNumber()).toBeCloseTo((4400 * 0.995) / 4266 - 1, 10);
    expect(l.equilibrio.toNumber()).toBeCloseTo(4266 / 0.995, 8);
  });
});

describe("opciones · cajas", () => {
  const puntas = {
    callBaja: { compra: 480, venta: 490 },
    callAlta: { compra: 210, venta: 215 },
    putBaja: { compra: 5, venta: 7 },
    putAlta: { compra: 295, venta: 300 },
  };
  it("colocar: comprás la caja y al vencimiento cobrás la diferencia de bases", () => {
    const c = tasaCaja(4400, 5000, puntas, "colocar", 32)!;
    expect(c.hoy.toNumber()).toBe(490 + 300 - 210 - 5);
    expect(c.alVencimiento.toNumber()).toBe(600);
    expect(c.directo.toNumber()).toBeCloseTo(600 / 575 - 1, 10);
    expect(c.tna.toNumber()).toBeCloseTo(((600 / 575 - 1) * 365) / 32, 10);
  });
  it("tomar: vendés la caja, recibís hoy y pagás la diferencia al vencimiento", () => {
    const c = tasaCaja(4400, 5000, puntas, "tomar", 32)!;
    expect(c.hoy.toNumber()).toBe(480 + 295 - 215 - 7);
    expect(c.directo.toNumber()).toBeCloseTo(600 / 553 - 1, 10);
  });
  it("la comisión se cobra sobre las cuatro primas", () => {
    const c = tasaCaja(4400, 5000, puntas, "colocar", 32, 0.005)!;
    expect(c.hoy.toNumber()).toBeCloseTo(575 + (490 + 300 + 210 + 5) * 0.005, 10);
  });
  it("sin las cuatro puntas, o con bases invertidas, no hay caja", () => {
    expect(tasaCaja(4400, 5000, { ...puntas, putBaja: { compra: null, venta: 7 } }, "colocar", 32)).toBeNull();
    expect(tasaCaja(5000, 4400, puntas, "colocar", 32)).toBeNull();
  });
});

describe("opciones · estrategias", () => {
  const call = (lado: Pata["lado"], base: number, precio: number, cantidad = 1): Pata => ({ tipo: "call", lado, base, precio, cantidad });
  const put = (lado: Pata["lado"], base: number, precio: number, cantidad = 1): Pata => ({ tipo: "put", lado, base, precio, cantidad });

  it("compra de call: pérdida limitada a la prima, ganancia ilimitada", () => {
    const a = analizarEstrategia([call("compra", 5400, 108)], 100)!;
    expect(a.costo.toNumber()).toBe(10_800);
    expect(a.perdidaMaxima?.toNumber()).toBe(10_800);
    expect(a.gananciaMaxima).toBeNull();
    expect(a.equilibrios).toEqual([5508]);
  });
  it("spread alcista con calls (calculado a mano)", () => {
    const patas = [call("compra", 4400, 490), call("venta", 5000, 210)];
    const a = analizarEstrategia(patas, 100)!;
    expect(a.costo.toNumber()).toBe(28_000);
    expect(a.gananciaMaxima?.toNumber()).toBe(32_000);
    expect(a.perdidaMaxima?.toNumber()).toBe(28_000);
    expect(a.equilibrios).toEqual([4680]);
    expect(resultadoAlVencimiento(patas, 100, 4800).toNumber()).toBe(12_000);
  });
  it("venta de put descubierta: cobrás la prima y la pérdida llega hasta que la acción valga 0", () => {
    const a = analizarEstrategia([put("venta", 4400, 60)], 100)!;
    expect(a.costo.toNumber()).toBe(-6000);
    expect(a.gananciaMaxima?.toNumber()).toBe(6000);
    expect(a.perdidaMaxima?.toNumber()).toBe(434_000);
    expect(a.equilibrios).toEqual([4340]);
  });
  it("lanzamiento cubierto: 100 acciones y un call vendido", () => {
    const a = analizarEstrategia([{ tipo: "accion", lado: "compra", base: 0, precio: 4720, cantidad: 100 }, call("venta", 4400, 480)], 100)!;
    expect(a.costo.toNumber()).toBe(424_000);
    expect(a.gananciaMaxima?.toNumber()).toBe(16_000);
    expect(a.perdidaMaxima?.toNumber()).toBe(424_000);
    expect(a.equilibrios).toEqual([4240]);
  });
  it("cono comprado: dos puntos de equilibrio", () => {
    const a = analizarEstrategia([call("compra", 5000, 210), put("compra", 5000, 300)], 100)!;
    expect(a.equilibrios).toEqual([4490, 5510]);
    expect(a.perdidaMaxima?.toNumber()).toBe(51_000);
    expect(a.gananciaMaxima).toBeNull();
  });
  it("la comisión suma sobre el monto de cada pata", () => {
    expect(costoEstrategia([call("compra", 5400, 108)], 100, 0.005).toNumber()).toBeCloseTo(10_854, 8);
    expect(costoEstrategia([call("venta", 5400, 108)], 100, 0.005).toNumber()).toBeCloseTo(-10_746, 8);
  });
});
describe("opciones · cajas y lanzamientos desde la cadena", () => {
  const lado = (simbolo: string, compra: number | null, venta: number | null, cant = 10) => ({
    simbolo, compra, venta, cantCompra: compra ? cant : null, cantVenta: venta ? cant : null, ultimo: null, variacion: null, volumen: 0, operaciones: 0,
    referencia: null, vi: null, delta: null, intrinseco: 0, extrinseco: null, puntasAbiertas: false,
  });
  const filas = [
    { base: 4400, call: lado("GFGC4400DI", 480, 490, 7), put: lado("GFGV4400DI", 5, 7) },
    { base: 5000, call: lado("GFGC5000DI", 210, 215), put: lado("GFGV5000DI", 295, 300, 3) },
    { base: 5600, call: lado("GFGC5600DI", 60, 62), put: null },
  ];
  it("arma la caja con las dos bases que tienen las cuatro puntas y cuenta cuántas se pueden armar", () => {
    const cajas = armarCajas(filas, "colocar", 32);
    expect(cajas).toHaveLength(1);
    expect(cajas[0]!.id).toBe("4400-5000");
    expect(cajas[0]!.hoy).toBe(575);
    // Colocar usa: venta del call 4400 (7), venta del put 5000 (3), compra del call 5000 (10), compra del put 4400 (10).
    expect(cajas[0]!.contratos).toBe(3);
  });
  it("con una comisión que se come la tasa, no hay caja", () => {
    expect(armarCajas(filas, "colocar", 32, 0.04)).toHaveLength(0);
  });
  it("lanzamientos de cada call con punta compradora, con la comisión", () => {
    const l = armarLanzamientos(filas, 4720, 32, 0.005);
    expect(l.map((x) => x.base)).toEqual([4400, 5000, 5600]);
    expect(l[0]!.inversion).toBeCloseTo(4720 * 1.005 - 480 * 0.995, 8);
  });
});
describe("opciones · historial de primas", () => {
  it("toma el punto medio de las puntas, o el último si operó, y solo de las series vigentes", () => {
    const h = armarHistorial(
      {
        "2026-11-19": { GGAL: { precio: 4750, series: { GFGC5400DI: [100, 110, 104, 50], GFGC5400NO: [1, 2, 1, 5] } } },
        "2026-11-18": { GGAL: { precio: 4715, series: { GFGC5400DI: [null, null, 98, 20], GFGV4400DI: [null, null, 60, 0] } } },
      },
      "GGAL",
      new Set(["GFGC5400DI", "GFGV4400DI"]),
    );
    expect(h.dias).toBe(2);
    expect(h.desde).toBe("2026-11-18");
    expect(h.series.GFGC5400DI).toEqual([
      { fecha: "2026-11-18", prima: 98 },
      { fecha: "2026-11-19", prima: 105 },
    ]);
    // Sin puntas y sin operaciones ese día: no hay prima.
    expect(h.series.GFGV4400DI).toBeUndefined();
    expect(h.series.GFGC5400NO).toBeUndefined();
    expect(h.precio.map((p) => p.valor)).toEqual([4715, 4750]);
  });
});