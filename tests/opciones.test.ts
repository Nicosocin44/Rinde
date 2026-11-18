import { describe, expect, it } from "vitest";
import { deltaBS, lanzamientoCubierto, normalAcumulada, parsearSimbolo, primaBS, tercerViernes, vencimientoDelMes, vencimientoOpcion, volatilidadImplicita } from "@/lib/calculos";
import { normalizarOpciones } from "@/lib/data/servicios/opciones";

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
    const l = v.lanzamientos[0]!;
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
