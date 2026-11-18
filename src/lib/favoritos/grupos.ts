/**
 * Grupos de seguimiento: cada persona ordena lo que sigue en los grupos que quiera (no hay grupos armados de antemano).
 * Puro: recibe la lista de favoritos y devuelve grupos, filtros y nombres normalizados.
 */

export const LARGO_MAXIMO_GRUPO = 24;

type ConGrupo = { grupo?: string | null };

/** Saca espacios de más y corta el largo. Si ya existe un grupo con el mismo nombre (sin mirar mayúsculas), usa ese. */
export function normalizarGrupo(nombre: string, existentes: readonly string[] = []): string | null {
  const limpio = nombre.replace(/\s+/g, " ").trim().slice(0, LARGO_MAXIMO_GRUPO).trim();
  if (!limpio) return null;
  const igual = existentes.find((g) => g.localeCompare(limpio, "es", { sensitivity: "base" }) === 0);
  return igual ?? limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/** Los grupos que creó la persona, en orden alfabético y sin repetir (sin mirar mayúsculas ni tildes). */
export function gruposDisponibles(favoritos: readonly ConGrupo[], extra: readonly string[] = []): string[] {
  // Primero los que ya se usan: si hay dos escrituras del mismo grupo, gana la que tiene algún activo.
  const salida: string[] = [];
  for (const g of [...favoritos.map((f) => f.grupo), ...extra]) {
    if (typeof g !== "string" || g.trim() === "") continue;
    if (!salida.some((s) => s.localeCompare(g, "es", { sensitivity: "base" }) === 0)) salida.push(g);
  }
  return salida.sort((a, b) => a.localeCompare(b, "es"));
}

export type Filtro = { id: string; etiqueta: string; cantidad: number };
export const TODOS = "todos";
export const SIN_GRUPO = "sin-grupo";

/**
 * Los filtros que se muestran arriba de "Siguiendo": Todos, cada grupo que tiene algo y "Sin grupo" al final. Si
 * nadie tiene grupo, no hay filtros (no hace falta).
 */
export function filtrosDeGrupo(favoritos: readonly ConGrupo[]): Filtro[] {
  if (!favoritos.some((f) => f.grupo)) return [];
  const filtros: Filtro[] = [{ id: TODOS, etiqueta: "Todos", cantidad: favoritos.length }];
  for (const g of gruposDisponibles(favoritos)) {
    const cantidad = favoritos.filter((f) => f.grupo === g).length;
    if (cantidad > 0) filtros.push({ id: g, etiqueta: g, cantidad });
  }
  const sueltos = favoritos.filter((f) => !f.grupo).length;
  if (sueltos > 0) filtros.push({ id: SIN_GRUPO, etiqueta: "Sin grupo", cantidad: sueltos });
  return filtros;
}

/** Los favoritos de un filtro. Un filtro que ya no existe (se vació el grupo) muestra todos. */
export function filtrarPorGrupo<T extends ConGrupo>(favoritos: readonly T[], filtro: string): T[] {
  if (filtro === SIN_GRUPO) return favoritos.filter((f) => !f.grupo);
  const delGrupo = favoritos.filter((f) => f.grupo === filtro);
  return filtro === TODOS || delGrupo.length === 0 ? [...favoritos] : delGrupo;
}
