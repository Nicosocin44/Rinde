import { describe, expect, it } from "vitest";
import { TARIFARIOS_BROKERS } from "@data/ar/comisiones-brokers";
import { PROVEEDORES } from "@data/ar/proveedores";
import { costoComision, rankingBrokers } from "@/lib/calculos/comisiones";

const orden = (filas: ReturnType<typeof rankingBrokers>) => filas.map((f) => f.tarifario.proveedorId);

describe("comisiones de brokers", () => {
  it("la comisión con IVA (acciones, CEDEARs, opciones) y sin IVA (títulos públicos)", () => {
    expect(costoComision({ tasa: 0.005, iva: true }, 1_000_000)).toBeCloseTo(6050, 6);
    expect(costoComision({ tasa: 0.006, iva: false }, 1_000_000)).toBeCloseTo(6000, 6);
  });

  it("una tasa anual se prorratea por los días que le quedan a la letra", () => {
    expect(costoComision({ tasa: 0.015, iva: false, anual: true }, 1_000_000, 90)).toBeCloseTo((1_000_000 * 0.015 * 90) / 365, 6);
    expect(costoComision({ tasa: 0.015, iva: false, anual: true }, 1_000_000, -5)).toBe(0);
  });

  it("acciones y CEDEARs por $ 1.000.000: del más barato al más caro, y a igual costo por nombre", () => {
    const filas = rankingBrokers(TARIFARIOS_BROKERS, "acciones", 1_000_000);
    expect(orden(filas)).toEqual(["cocos", "balanz", "bullmarket", "iol", "ppi"]);
    expect(filas.map((f) => Math.round(f.costo))).toEqual([5445, 6050, 6050, 6050, 7260]);
    expect(filas[0]!.efectiva).toBeCloseTo(0.005445, 9);
  });

  it("letras: la de tasa anual depende del plazo, y sin plazo queda afuera", () => {
    expect(orden(rankingBrokers(TARIFARIOS_BROKERS, "letras", 1_000_000, 30))).toEqual(["balanz", "cocos", "iol", "ppi", "bullmarket"]);
    expect(orden(rankingBrokers(TARIFARIOS_BROKERS, "letras", 1_000_000, 200)).at(-1)).toBe("cocos");
    expect(orden(rankingBrokers(TARIFARIOS_BROKERS, "letras", 1_000_000))).not.toContain("cocos");
  });

  it("opciones y bonos con los tarifarios cargados", () => {
    expect(rankingBrokers(TARIFARIOS_BROKERS, "opciones", 100_000).map((f) => Math.round(f.costo))).toEqual([605, 605, 605, 1210, 1210]);
    expect(rankingBrokers(TARIFARIOS_BROKERS, "bonos", 1_000_000)[0]).toMatchObject({ tarifario: { proveedorId: "cocos" }, costo: 4500 });
  });

  it("los tarifarios están completos: proveedor conocido, fuente, fecha y tasas razonables", () => {
    const ids = new Set(PROVEEDORES.map((p) => p.id));
    for (const t of TARIFARIOS_BROKERS) {
      expect(ids.has(t.proveedorId), t.proveedorId).toBe(true);
      expect(t.fuente.url).toMatch(/^https:\/\//);
      expect(t.verificado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const c of Object.values(t.comisiones)) {
        expect(c.tasa).toBeGreaterThan(0);
        expect(c.tasa).toBeLessThan(0.02);
      }
    }
  });
});
