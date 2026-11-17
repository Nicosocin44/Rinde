import { describe, expect, it } from "vitest";
import { normalizarCuentas, normalizarFondos, normalizarLecaps } from "@/lib/data/servicios/pesos";
import { normalizarRanking } from "@/lib/data/servicios/dolar";
import { ajusteNelsonSiegel } from "@/lib/data/validacion";

/** 11. Validación: una LECAP vencida y un FCI duplicado quedan excluidos con su motivo. */

const feriados = new Set(["2026-11-23", "2026-12-08"]);

const fila = (symbol: string, c: number, v = 1_000_000) => ({ symbol, px_bid: c, px_ask: c, v, q_op: 10, c, pct_change: 0.1 });

describe("curva Nelson-Siegel", () => {
  it("recupera una curva conocida y nunca devuelve NaN", () => {
    const f1 = (u: number) => (1 - Math.exp(-u)) / u;
    const real = (t: number) => 0.3 - 0.05 * f1(t / 0.4) + 0.08 * (f1(t / 0.4) - Math.exp(-t / 0.4));
    const puntos = [0.03, 0.16, 0.2, 0.27, 0.45, 0.53, 0.61].map((x) => ({ x, y: real(x) }));
    const ajuste = ajusteNelsonSiegel(puntos)!;
    expect(ajuste).not.toBeNull();
    for (const p of puntos) expect(ajuste.f(p.x)).toBeCloseTo(p.y, 3);
    expect(Number.isFinite(ajuste.f(0.001))).toBe(true);
  });
});

describe("11. validación de sanidad", () => {
  it("LECAPs: excluye vencidas, deja fuera de la curva las que vencen en ≤ 5 hábiles y nunca devuelve tasas absurdas", () => {
    const precios = [
      // Vencida: el caso de la competencia (TEM 13.426 %).
      fila("S31O6", 99.9),
      fila("S20N6", 129.6),
      fila("S29E7", 106.5),
      fila("S26F7", 101.3),
      fila("T30A7", 140.0),
      fila("T30J7", 132.5),
      fila("T31Y7", 131.5, 0),
    ];
    const letrasAd = {
      fechaActualizacion: "2026-11-16T00:00:00Z",
      letras: [
        { ticker: "S31O6", precioArs: 99.9, teaPorcentaje: 849e25, tnaPorcentaje: 1e6, fechaVencimiento: "2026-10-31", diasAlVencimiento: 1 },
        { ticker: "S20N6", precioArs: 129.6, teaPorcentaje: 25, tnaPorcentaje: 22.5, fechaVencimiento: "2026-11-20", diasAlVencimiento: 4 },
      ],
    };
    const { curva, excluidas } = normalizarLecaps(precios, letrasAd, "2026-11-16", feriados);

    expect(excluidas).toContainEqual({ id: "S31O6", reason: "Vencida" });
    expect(curva.letras.find((l) => l.ticker === "S31O6")).toBeUndefined();

    const porVencer = curva.letras.find((l) => l.ticker === "S20N6")!;
    expect(porVencer.enCurva).toBe(false);
    expect(porVencer.etiqueta).toMatch(/^Vence en \d/);

    const sinOperar = curva.letras.find((l) => l.ticker === "T31Y7")!;
    expect(sinOperar.enCurva).toBe(false);
    expect(sinOperar.etiqueta).toBe("Sin operaciones hoy");

    for (const l of curva.letras) {
      expect(Number.isFinite(l.tea)).toBe(true);
      expect(l.tea).toBeGreaterThan(0);
      expect(l.tea).toBeLessThan(2);
    }
    expect(curva.liquidacion).toBe("2026-11-17");
  });

  it("FCI: una sola clase por fondo, preferentemente la A; el duplicado queda informado", () => {
    const base = { administradora: "Delta Asset Management S.A.", tipoRenta: "Mercado de Dinero", moneda: "Peso Argentino", fecha: "2026-11-16", plazoLiquidacionDias: 0 };
    const { fondos, excluidas } = normalizarFondos(
      [
        { ...base, nombre: "Delta Pesos - Clase X", patrimonio: 4e11, rendimientos: { valorCuotaparte: 6119.5, ultimos7Dias: 0.2633, diasUltimos7Dias: 5 } },
        { ...base, nombre: "Delta Pesos - Clase A", patrimonio: 7e10, rendimientos: { valorCuotaparte: 50210.9, ultimos7Dias: 0.2352, diasUltimos7Dias: 5 } },
        { ...base, nombre: "Fima Premium - Clase P", patrimonio: 0, rendimientos: { valorCuotaparte: 76123, ultimos7Dias: 0, diasUltimos7Dias: 8 } },
      ],
      "2026-11-17",
    );
    expect(fondos).toHaveLength(1);
    expect(fondos[0]!.clase).toBe("A");
    expect(excluidas).toContainEqual({ id: "Delta Pesos - Clase X", reason: "Duplicado: se muestra una sola clase por fondo o producto" });
    expect(excluidas.find((e) => e.id === "Fima Premium - Clase P")).toBeDefined();
    // TNA desde la cuotaparte: 0,2352 % en 5 días → 17,17 %.
    expect(fondos[0]!.tna).toBeCloseTo((0.002352 * 365) / 5, 10);
  });

  it("cuentas: excluye tasas viejas y en cero, separa las que tienen condiciones y deja un tramo por producto", () => {
    const { opciones, excluidas } = normalizarCuentas(
      [
        { fondo: "BRUBANK", tna: 0.27, tope: 750000, fecha: "2025-08-06" },
        { fondo: "BICA CUENTA POSITIVA 1", tna: 0, tope: 0, fecha: "2026-11-16", condicionesCorto: "desde $20.000.001" },
        { fondo: "BICA CUENTA POSITIVA 3", tna: 0.19, tope: 2250000, fecha: "2026-11-16", condicionesCorto: "de $750.001 hasta $2.250.000" },
        { fondo: "BICA CUENTA POSITIVA 4", tna: 0.22, tope: 750000, fecha: "2026-11-16", condicionesCorto: "de $1 hasta $750.000" },
        { fondo: "SUPERVIELLE", tna: 0.14, tope: 1000000, fecha: "2026-11-16", condicionesCorto: "Solo Clientes Plan Sueldo." },
        { fondo: "BELO", tna: 0.19, tope: 0, fecha: "2026-11-16", condicionesCorto: "" },
      ],
      "2026-11-17",
    );
    expect(excluidas.find((e) => e.id === "Brubank")?.reason).toMatch(/sin actualizar/i);
    const bica = opciones.filter((o) => o.proveedorId === "bica");
    expect(bica).toHaveLength(1);
    expect(bica[0]!.tna).toBe(0.22);
    expect(opciones.find((o) => o.proveedorId === "supervielle")!.condicionEspecial).toBe(true);
    const belo = opciones.find((o) => o.proveedorId === "belo")!;
    expect(belo.tope).toBeNull();
    expect(belo.tea).toBeCloseTo(0.20917, 4);
  });

  it("dólar: excluye cotizaciones viejas, en cero y atípicas; los P2P van aparte", () => {
    const ahora = new Date("2026-11-16T20:00:00Z");
    const t = ahora.getTime() / 1000;
    const { ranking, excluidos } = normalizarRanking(
      "USDT",
      {
        belo: { ask: 1690, totalAsk: 1690, bid: 1671, totalBid: 1671, time: t - 60 },
        ripio: { ask: 1694, totalAsk: 1694, bid: 1655, totalBid: 1647, time: t - 60 },
        huobip2p: { ask: 0, totalAsk: 0, bid: 1082, totalBid: 1082, time: t - 60 },
        viejo: { ask: 1600, totalAsk: 1600, bid: 1590, totalBid: 1590, time: t - 9000 },
        raro: { ask: 2900, totalAsk: 2900, bid: 2800, totalBid: 2800, time: t - 60 },
        binancep2p: { ask: 1677, totalAsk: 1677, bid: 1670, totalBid: 1670, time: t - 60 },
      },
      ahora,
    );
    expect(ranking.proveedores.map((p) => p.id).sort()).toEqual(["belo", "ripio"]);
    expect(ranking.especiales.map((p) => p.id)).toEqual(["binancep2p"]);
    expect(excluidos.map((e) => e.reason).join(" ")).toMatch(/desactualizada/);
    expect(excluidos.map((e) => e.reason).join(" ")).toMatch(/atípico/);
    expect(excluidos.map((e) => e.reason).join(" ")).toMatch(/No publica/);
  });
});
