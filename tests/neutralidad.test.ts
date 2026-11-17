import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ordenarProveedores, type CriterioDolar } from "@/lib/rankings/dolar";
import { dondeRindeMas } from "@/lib/rankings/pesos";
import type { OpcionPesos, ProveedorDolar } from "@/lib/data/types";

/** 10. Ranking del dólar: el orden NO cambia al marcar un proveedor como afiliado. */

const prov = (id: string, compras: number, vendes: number): ProveedorDolar => ({
  id,
  nombre: id,
  tipo: "banco",
  compras,
  vendes,
  pizarraCompra: compras,
  pizarraVenta: vendes,
  spread: (compras - vendes) / vendes,
  costoMil: compras * 1000,
  recibisMil: vendes * 1000,
  opera247: false,
  asOf: "2026-11-16T18:00:00Z",
});

const proveedores = [prov("a", 1575, 1525), prov("b", 1567, 1548), prov("c", 1570, 1530), prov("d", 1560, 1550), prov("e", 1580, 1520)];

describe("10. neutralidad de los rankings", () => {
  for (const criterio of ["comprar", "vender", "spread"] as CriterioDolar[]) {
    it(`dólar · ${criterio}: marcar afiliados no cambia el orden`, () => {
      const antes = ordenarProveedores(proveedores, criterio).map((p) => p.id);
      // Marcamos como afiliado al peor de cada criterio y le agregamos todos los campos que tendría un partner.
      const conAfiliados = proveedores.map((p) =>
        p.id === antes.at(-1) || p.id === "c" ? { ...p, afiliado: true, activo: true, urlReferido: "https://x", comision: 999, patrocinado: true } : p,
      );
      const despues = ordenarProveedores(conAfiliados, criterio).map((p) => p.id);
      expect(despues).toEqual(antes);
    });
  }

  it("el orden del dólar es el correcto por criterio", () => {
    expect(ordenarProveedores(proveedores, "comprar").map((p) => p.id)).toEqual(["d", "b", "c", "a", "e"]);
    expect(ordenarProveedores(proveedores, "vender").map((p) => p.id)).toEqual(["d", "b", "c", "a", "e"]);
    expect(ordenarProveedores(proveedores, "spread")[0]!.id).toBe("d");
  });

  it("¿dónde rinde más?: marcar afiliados no cambia el orden", () => {
    const opcion = (id: string, tea: number, tipo: OpcionPesos["tipo"] = "billetera"): OpcionPesos => ({
      id,
      nombre: id,
      proveedorId: id,
      tipo,
      tna: tea,
      tea,
      tem: tea / 12,
      plazoDias: null,
      liquidez: "inmediata",
      tope: null,
      condicionEspecial: false,
      garantia: "Sin garantía",
      riesgo: "bajo",
      asOf: "2026-11-16",
      fuenteId: "argentinadatos",
    });
    const opciones = [opcion("x", 0.2), opcion("y", 0.25, "fci"), opcion("z", 0.22, "cuenta")];
    const consulta = { monto: 1_000_000, plazo: 0 as const, soloLiquidez: true };
    const antes = dondeRindeMas(opciones, consulta).map((r) => r.opcion.id);
    const despues = dondeRindeMas(opciones.map((o) => (o.id === "x" ? { ...o, afiliado: true } : o)), consulta).map((r) => r.opcion.id);
    expect(despues).toEqual(antes);
    expect(antes).toEqual(["y", "z", "x"]);
  });

  it("ningún archivo de rankings, datos, insights ni cálculos importa el registro de afiliados", () => {
    const raiz = join(__dirname, "..", "src", "lib");
    const carpetas = ["rankings", "data", "insights", "calculos"].map((c) => join(raiz, c));
    const archivos: string[] = [];
    const recorrer = (dir: string) => {
      for (const nombre of readdirSync(dir)) {
        const ruta = join(dir, nombre);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else if (/\.tsx?$/.test(nombre)) archivos.push(ruta);
      }
    };
    carpetas.forEach(recorrer);
    expect(archivos.length).toBeGreaterThan(10);
    for (const archivo of archivos) {
      const texto = readFileSync(archivo, "utf8");
      expect(texto, archivo).not.toMatch(/from\s+["'][^"']*partners["']/);
    }
  });
});
