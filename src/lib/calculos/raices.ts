import { d, esFinito, type Dec } from "./decimal";

/**
 * Busca r tal que f(r) = 0. Newton-Raphson con derivada numérica y bisección de respaldo.
 * Devuelve null si no converge o si no hay cambio de signo en el intervalo de respaldo.
 */
export function resolverTasa(
  f: (r: Dec) => Dec,
  opciones: { semilla?: number; min?: number; max?: number; tolerancia?: number; iteraciones?: number } = {},
): Dec | null {
  const { semilla = 0.1, min = -0.99, max = 10, tolerancia = 1e-10, iteraciones = 60 } = opciones;
  const tol = d(tolerancia);
  const lo0 = d(min);
  const hi0 = d(max);

  // 1) Newton
  let r = d(semilla);
  for (let i = 0; i < iteraciones; i++) {
    const y = f(r);
    if (!esFinito(y)) break;
    if (y.abs().lt(tol)) return r;
    const h = d(1e-7);
    const dy = f(r.plus(h)).minus(f(r.minus(h))).div(h.mul(2));
    if (!esFinito(dy) || dy.isZero()) break;
    const siguiente = r.minus(y.div(dy));
    if (!esFinito(siguiente) || siguiente.lte(lo0) || siguiente.gte(hi0)) break;
    if (siguiente.minus(r).abs().lt(tol)) return siguiente;
    r = siguiente;
  }

  // 2) Bisección
  let lo = lo0;
  let hi = hi0;
  let flo = f(lo);
  let fhi = f(hi);
  if (!esFinito(flo) || !esFinito(fhi) || flo.mul(fhi).gt(0)) return null;
  for (let i = 0; i < 200; i++) {
    const mid = lo.plus(hi).div(2);
    const fmid = f(mid);
    if (!esFinito(fmid)) return null;
    if (fmid.abs().lt(tol) || hi.minus(lo).abs().lt(tol)) return mid;
    if (flo.mul(fmid).lte(0)) {
      hi = mid;
      fhi = fmid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return lo.plus(hi).div(2);
}
