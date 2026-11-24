import type { Activo, Movimiento } from "@/lib/calculos/cartera";
import type { DatosCartera } from "./repositorio";

/**
 * Al iniciar sesión, lo cargado en este navegador se suma a la cuenta (no la pisa). Se suben los movimientos que la
 * cuenta no tiene (por id; cada movimiento tiene un id único) y sus activos, salvo los que la cuenta ya tiene: ahí
 * manda la cuenta. Puro (se testea aparte).
 */
export function aSubir(local: Pick<DatosCartera, "activos" | "movimientos">, cuenta: Pick<DatosCartera, "activos" | "movimientos">): { activos: Activo[]; movimientos: Movimiento[] } {
  const enCuenta = new Set(cuenta.movimientos.map((m) => m.id));
  const activosCuenta = new Set(cuenta.activos.map((a) => a.id));
  const movimientos = local.movimientos.filter((m) => !enCuenta.has(m.id));
  const usados = new Set(movimientos.map((m) => m.activoId));
  const activos = local.activos.filter((a) => usados.has(a.id) && !activosCuenta.has(a.id));
  return { activos, movimientos };
}
