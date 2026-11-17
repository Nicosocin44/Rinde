import { describe, expect, it } from "vitest";
import { derivarPosiciones, valuarPosiciones, type Activo, type Movimiento } from "@/lib/calculos";
import { generarIdeas, type EntradaIdeas } from "@/lib/insights/reglas";
import type { OpcionPesos } from "@/lib/data/types";

const opcion = (o: Partial<OpcionPesos>): OpcionPesos => ({
  id: "x",
  nombre: "X",
  proveedorId: "x",
  tipo: "billetera",
  tna: 0.36,
  tea: 0.4329,
  tem: 0.03,
  plazoDias: null,
  liquidez: "inmediata",
  tope: null,
  condicionEspecial: false,
  garantia: "Sin garantía",
  riesgo: "bajo",
  asOf: "2026-11-17",
  fuenteId: "argentinadatos",
  ...o,
});

function entrada(activos: Activo[], movs: Movimiento[], extra: Partial<EntradaIdeas> = {}): EntradaIdeas {
  const mapa = new Map(activos.map((a) => [a.id, a]));
  const posiciones = valuarPosiciones(derivarPosiciones(movs, mapa), mapa, { mep: 1500, precios: new Map([["cedear:AAPL", 30000]]) }, "2026-11-17");
  return {
    posiciones,
    total: posiciones.reduce((s, p) => s + p.valorArs.toNumber(), 0),
    hoy: "2026-11-17",
    feriados: new Set(["2026-11-23"]),
    mejorLiquida: opcion({ nombre: "Billetera Y" }),
    mejorPlazoFijo30: opcion({ id: "pf", nombre: "Banco Z", tipo: "plazo_fijo", tna: 0.24, tea: 0.2682, plazoDias: 30 }),
    lecaps: [opcion({ id: "lecap:S29E7", nombre: "LECAP S29E7", tipo: "lecap", tea: 0.29, plazoDias: 72 })],
    rendimientoArs: 0.18,
    inflacionPeriodo: 0.24,
    mesesPeriodo: 12,
    objetivoPesos: null,
    ...extra,
  };
}

describe("motor de ideas", () => {
  const mp: Activo = { id: "billetera:x", tipo: "billetera", nombre: "Billetera X", moneda: "ARS", tna: 0.32 };
  const dep: Movimiento = { id: "1", activoId: mp.id, fecha: "2026-11-01", tipo: "deposito", cantidad: "2000000", precio: "1" };

  it("liquidez mejorable: la cuenta del ejemplo de PRODUCTO.md (≈ $6.600 más por mes)", () => {
    const ideas = generarIdeas(entrada([mp], [dep]));
    const idea = ideas.find((i) => i.regla === "liquidez")!;
    expect(idea).toBeDefined();
    expect(idea.cuenta).toMatch(/32,0\s% TNA/);
    expect(idea.cuenta).toMatch(/36,0\s%/);
    // 2.000.000 × ((1 + TEA_36)^(30/365) − (1 + TEA_32)^(30/365)) ≈ 6.580
    expect(idea.impactoMensual!).toBeGreaterThan(6400);
    expect(idea.impactoMensual!).toBeLessThan(6800);
  });

  it("no sugiere nada si la diferencia es menor a 2 pp", () => {
    const ideas = generarIdeas(entrada([{ ...mp, tna: 0.35 }], [dep]));
    expect(ideas.find((i) => i.regla === "liquidez")).toBeUndefined();
  });

  it("vencimiento próximo (≤ 3 días hábiles) y curva contra plazo fijo", () => {
    const pf: Activo = { id: "plazo_fijo:1", tipo: "plazo_fijo", nombre: "PF", moneda: "ARS", tna: 0.2, inicio: "2026-10-20", vencimiento: "2026-11-19" };
    const ideas = generarIdeas(entrada([pf], [{ id: "2", activoId: pf.id, fecha: "2026-10-20", tipo: "deposito", cantidad: "1000000", precio: "1" }], { lecaps: [opcion({ id: "lecap:T", nombre: "LECAP T", tipo: "lecap", tea: 0.3, plazoDias: 45 })] }));
    expect(ideas[0]!.regla).toBe("vencimiento");
    expect(ideas[0]!.titulo).toMatch(/vence el jueves/);
    expect(ideas.find((i) => i.regla === "curva")).toBeDefined();
  });

  it("pérdida real, concentración y moneda", () => {
    const aapl: Activo = { id: "cedear:AAPL", tipo: "cedear", nombre: "Apple", moneda: "ARS" };
    const usd: Activo = { id: "efectivo_usd:a", tipo: "efectivo_usd", nombre: "Dólares", moneda: "USD" };
    const ideas = generarIdeas(
      entrada(
        [aapl, usd],
        [
          { id: "a", activoId: aapl.id, fecha: "2026-01-01", tipo: "compra", cantidad: "100", precio: "20000" },
          { id: "b", activoId: usd.id, fecha: "2026-01-01", tipo: "deposito", cantidad: "100", precio: "1" },
        ],
        { objetivoPesos: 0.5 },
      ),
    );
    expect(ideas.map((i) => i.regla)).toEqual(expect.arrayContaining(["perdida_real", "concentracion", "moneda"]));
    expect(ideas.find((i) => i.regla === "perdida_real")!.cuenta).toMatch(/18,0\s%.*24,0\s%/);
  });

  it("nunca usa verbos de recomendación", () => {
    const ideas = generarIdeas(entrada([mp], [dep]));
    for (const i of ideas) expect(`${i.titulo} ${i.cuenta}`).not.toMatch(/\b(comprá|vendé|invertí|deberías)\b/i);
  });
});
