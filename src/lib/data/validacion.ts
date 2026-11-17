import type { Excluido } from "./types";

/**
 * Validación de sanidad (DATOS_Y_FORMULAS.md §4). Se aplica en el servidor, antes de cachear.
 * Todo lo que se filtra queda registrado con su motivo, para que la UI pueda explicar "Excluimos N. ¿Por qué?".
 */

export type Banda = { min: number; max: number };

export function esNumeroSano(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export function enBanda(valor: number, banda: Banda): boolean {
  return esNumeroSano(valor) && valor >= banda.min && valor <= banda.max;
}

export function mediana(valores: number[]): number {
  if (valores.length === 0) return NaN;
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[medio]! : (orden[medio - 1]! + orden[medio]!) / 2;
}

/** Deja una sola fila por clave. `preferir` decide cuál queda cuando hay repetidas (devuelve true si `a` gana). */
export function deduplicar<T>(
  filas: T[],
  clave: (fila: T) => string,
  preferir: (a: T, b: T) => boolean = () => false,
  describir: (fila: T) => string = clave,
): { unicas: T[]; excluidas: Excluido[] } {
  const mapa = new Map<string, T>();
  const excluidas: Excluido[] = [];
  for (const fila of filas) {
    const k = clave(fila);
    const actual = mapa.get(k);
    if (!actual) {
      mapa.set(k, fila);
    } else if (preferir(fila, actual)) {
      excluidas.push({ id: describir(actual), reason: "Duplicado: se muestra una sola clase por fondo o producto" });
      mapa.set(k, fila);
    } else {
      excluidas.push({ id: describir(fila), reason: "Duplicado: se muestra una sola clase por fondo o producto" });
    }
  }
  return { unicas: [...mapa.values()], excluidas };
}

/** Separa las filas que pasan todos los chequeos de las que no. Cada chequeo devuelve null si pasa, o el motivo. */
export function filtrar<T>(
  filas: T[],
  id: (fila: T) => string,
  chequeos: ((fila: T) => string | null)[],
): { validas: T[]; excluidas: Excluido[] } {
  const validas: T[] = [];
  const excluidas: Excluido[] = [];
  for (const fila of filas) {
    const motivo = chequeos.map((c) => c(fila)).find((m) => m !== null);
    if (motivo) excluidas.push({ id: id(fila), reason: motivo });
    else validas.push(fila);
  }
  return { validas, excluidas };
}

/**
 * Ajuste de Nelson-Siegel: y(t) = β0 + β1·f1(t/τ) + β2·f2(t/τ), con f1(u) = (1 − e^−u)/u y f2(u) = f1(u) − e^−u.
 * Es el modelo estándar para curvas de tasas: capta el nivel, la pendiente y una "joroba" en el tramo corto.
 * τ se busca en una grilla; los β salen por mínimos cuadrados. `t` en años. Con menos de 4 puntos, null.
 */
export function ajusteNelsonSiegel(puntos: { x: number; y: number }[]): { f: (x: number) => number; desvio: number } | null {
  const n = puntos.length;
  if (n < 4) return null;
  const f1 = (u: number) => (u < 1e-8 ? 1 : (1 - Math.exp(-u)) / u);
  const f2 = (u: number) => f1(u) - Math.exp(-u);
  let mejor: { sse: number; b: [number, number, number]; tau: number } | null = null;
  for (let tau = 0.03; tau <= 6; tau *= 1.12) {
    const filas = puntos.map((p) => [1, f1(p.x / tau), f2(p.x / tau)] as const);
    // Ecuaciones normales 3×3: (XᵀX) β = Xᵀy
    const A = [0, 1, 2].map((i) => [0, 1, 2].map((j) => filas.reduce((s, r) => s + r[i]! * r[j]!, 0)));
    const v = [0, 1, 2].map((i) => filas.reduce((s, r, k) => s + r[i]! * puntos[k]!.y, 0));
    const b = resolver3(A, v);
    if (!b) continue;
    const sse = puntos.reduce((s, p, k) => s + (p.y - (b[0] + b[1] * filas[k]![1] + b[2] * filas[k]![2])) ** 2, 0);
    if (!mejor || sse < mejor.sse) mejor = { sse, b, tau };
  }
  if (!mejor) return null;
  const { b, tau, sse } = mejor;
  return { f: (x: number) => b[0] + b[1] * f1(x / tau) + b[2] * f2(x / tau), desvio: Math.sqrt(sse / Math.max(1, n - 4)) };
}

function resolver3(m: number[][], v: number[]): [number, number, number] | null {
  const det = (a: number[][]) =>
    a[0]![0]! * (a[1]![1]! * a[2]![2]! - a[1]![2]! * a[2]![1]!) - a[0]![1]! * (a[1]![0]! * a[2]![2]! - a[1]![2]! * a[2]![0]!) + a[0]![2]! * (a[1]![0]! * a[2]![1]! - a[1]![1]! * a[2]![0]!);
  const D = det(m);
  if (!Number.isFinite(D) || Math.abs(D) < 1e-14) return null;
  const col = (k: number) => m.map((fila, i) => fila.map((x, j) => (j === k ? v[i]! : x)));
  return [det(col(0)) / D, det(col(1)) / D, det(col(2)) / D];
}

/**
 * Ajuste y = a + b·ln(x): monótono y robusto con pocos puntos (curva de bonos por ley, 5 o 6 bonos).
 */
export function ajusteLogaritmico(puntos: { x: number; y: number }[]): ((x: number) => number) | null {
  const validos = puntos.filter((p) => p.x > 0 && Number.isFinite(p.y));
  const n = validos.length;
  if (n < 2) return null;
  const lx = validos.map((p) => Math.log(p.x));
  const mx = lx.reduce((s, v) => s + v, 0) / n;
  const my = validos.reduce((s, p) => s + p.y, 0) / n;
  const sxx = lx.reduce((s, v) => s + (v - mx) ** 2, 0);
  if (sxx === 0) return null;
  const b = lx.reduce((s, v, i) => s + (v - mx) * (validos[i]!.y - my), 0) / sxx;
  const a = my - b * mx;
  return (x: number) => a + b * Math.log(x);
}

/**
 * Ajuste por mínimos cuadrados de y = a + b·x + c·x² (respaldo de la curva cuando hay solo 3 puntos).
 * Devuelve la función ajustada y el desvío estándar de los residuos. Con menos de 3 puntos, null.
 */
export function ajusteCuadratico(puntos: { x: number; y: number }[]): { f: (x: number) => number; desvio: number } | null {
  const n = puntos.length;
  if (n < 3) return null;
  let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0, sy = 0, sxy = 0, sx2y = 0;
  for (const { x, y } of puntos) {
    const x2 = x * x;
    sx += x; sx2 += x2; sx3 += x2 * x; sx4 += x2 * x2;
    sy += y; sxy += x * y; sx2y += x2 * y;
  }
  // Sistema normal 3×3 resuelto por Cramer.
  const det = (m: number[][]) =>
    m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) -
    m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!) +
    m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!);
  const A = [[n, sx, sx2], [sx, sx2, sx3], [sx2, sx3, sx4]];
  const D = det(A);
  if (!Number.isFinite(D) || Math.abs(D) < 1e-12) return null;
  const a = det([[sy, sx, sx2], [sxy, sx2, sx3], [sx2y, sx3, sx4]]) / D;
  const b = det([[n, sy, sx2], [sx, sxy, sx3], [sx2, sx2y, sx4]]) / D;
  const c = det([[n, sx, sy], [sx, sx2, sxy], [sx2, sx3, sx2y]]) / D;
  const f = (x: number) => a + b * x + c * x * x;
  const residuos = puntos.map((p) => p.y - f(p.x));
  const desvio = Math.sqrt(residuos.reduce((acc, r) => acc + r * r, 0) / Math.max(1, n - 3));
  return { f, desvio };
}
