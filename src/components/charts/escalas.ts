/** Escalas y ticks mínimos (sin d3-scale): suficiente para nuestros gráficos. */

export function escalaLineal(dominio: [number, number], rango: [number, number]) {
  const [d0, d1] = dominio;
  const [r0, r1] = rango;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  const f = (x: number) => r0 + (x - d0) * k;
  f.invertir = (y: number) => (k === 0 ? d0 : d0 + (y - r0) / k);
  return f;
}

/** Ticks "lindos" (1, 2, 2,5, 5 × 10^n) entre min y max, aproximadamente `cantidad`. */
export function ticksLindos(min: number, max: number, cantidad = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];
  const crudo = (max - min) / Math.max(1, cantidad);
  const potencia = Math.pow(10, Math.floor(Math.log10(crudo)));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= crudo) ?? crudo;
  const inicio = Math.ceil(min / paso) * paso;
  const ticks: number[] = [];
  for (let v = inicio; v <= max + paso * 1e-9; v += paso) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

/** Extiende un dominio con un margen proporcional, para que los puntos no toquen el borde. */
export function conMargen([min, max]: [number, number], proporcion = 0.08): [number, number] {
  const r = max - min || Math.abs(max) * 0.1 || 1;
  return [min - r * proporcion, max + r * proporcion];
}
