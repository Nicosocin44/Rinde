import type { ProveedorDolar } from "@/lib/data/types";

/**
 * Ranking del dólar. REGLA DE NEUTRALIDAD: este archivo ordena solo por métricas objetivas
 * (precio final, spread). No importa ni puede importar `partners.ts` (lo impide ESLint y lo verifica
 * tests/neutralidad.test.ts).
 */

export type CriterioDolar = "comprar" | "vender" | "spread";

export function ordenarProveedores<T extends ProveedorDolar>(proveedores: T[], criterio: CriterioDolar): T[] {
  const comparar: Record<CriterioDolar, (a: T, b: T) => number> = {
    // Mejor para comprar: el que te cobra menos.
    comprar: (a, b) => a.compras - b.compras,
    // Mejor para vender: el que te paga más.
    vender: (a, b) => b.vendes - a.vendes,
    spread: (a, b) => a.spread - b.spread,
  };
  // Desempate estable y neutral: por nombre.
  return [...proveedores].sort((a, b) => comparar[criterio](a, b) || a.nombre.localeCompare(b.nombre, "es"));
}

export function filtrarProveedores<T extends ProveedorDolar>(proveedores: T[], filtros: { solo247?: boolean }): T[] {
  return proveedores.filter((p) => !filtros.solo247 || p.opera247);
}

/** Texto de la respuesta héroe: mejor proveedor y diferencia contra el promedio. */
export function resumenRanking(proveedores: ProveedorDolar[], criterio: CriterioDolar) {
  const orden = ordenarProveedores(proveedores, criterio);
  const mejor = orden[0];
  if (!mejor) return null;
  const promedioCosto = proveedores.reduce((acc, p) => acc + p.costoMil, 0) / proveedores.length;
  const promedioRecibis = proveedores.reduce((acc, p) => acc + p.recibisMil, 0) / proveedores.length;
  return {
    mejor,
    ahorroContraPromedio: promedioCosto - mejor.costoMil,
    extraContraPromedio: mejor.recibisMil - promedioRecibis,
    cantidad: proveedores.length,
  };
}
