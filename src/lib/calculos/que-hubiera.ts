import { d, UNO } from "./decimal";
import { diasEntre, sumarDias, type FechaISO } from "./fechas";

/**
 * "¿Qué hubiera pasado si…?": cuánto tendrías hoy si hubieras puesto $X en cada alternativa en una fecha del pasado.
 * Rendimientos pasados, sin comisiones ni impuestos. Cada función devuelve null si la serie no alcanza: no se inventa.
 */

export type Punto = { fecha: FechaISO; valor: number };

/** Valor en o antes de una fecha (la serie viene ordenada). Si el último dato es de hace más de `tolerancia` días, null. */
export function valorEn(serie: Punto[], fecha: FechaISO, tolerancia = 10): number | null {
  let encontrado: Punto | null = null;
  for (const p of serie) {
    if (p.fecha > fecha) break;
    encontrado = p;
  }
  if (!encontrado || encontrado.valor <= 0 || diasEntre(encontrado.fecha, fecha) > tolerancia) return null;
  return encontrado.valor;
}

/** Comprar al precio de `desde` y valuar al de `hasta`: monto × P(hasta) / P(desde). */
export function porPrecio(monto: number, serie: Punto[], desde: FechaISO, hasta: FechaISO): number | null {
  const inicio = valorEn(serie, desde);
  const fin = valorEn(serie, hasta);
  if (inicio === null || fin === null) return null;
  return d(monto).mul(fin).div(inicio).toNumber();
}

/**
 * Plazo fijo renovado cada `plazo` días con la TNA vigente al momento de cada renovación (interés simple por período,
 * capitalizado al renovar). Los días que sobran al final se cuentan a la última tasa, como si se cortara hoy.
 */
export function plazoFijoRenovado(monto: number, tnas: Punto[], desde: FechaISO, hasta: FechaISO, plazo = 30): number | null {
  if (hasta <= desde) return null;
  let capital = d(monto);
  let fecha = desde;
  while (fecha < hasta) {
    const tna = valorEn(tnas, fecha);
    if (tna === null) return null;
    const dias = Math.min(plazo, diasEntre(fecha, hasta));
    capital = capital.mul(UNO.plus(d(tna).mul(dias).div(365)));
    fecha = sumarDias(fecha, dias);
  }
  return capital.toNumber();
}

/** Lo que había que tener hoy para no perder contra la inflación: monto × índice(hasta) / índice(desde). */
export function sinPerder(monto: number, indiceDesde: number, indiceHasta: number): number {
  return d(monto).mul(indiceHasta).div(indiceDesde).toNumber();
}

export type Escenario = {
  id: string;
  nombre: string;
  detalle: string;
  valor: number;
  /** Ganancia nominal: valor / monto − 1. */
  ganancia: number;
  /** Contra la inflación: valor / (lo que había que tener para no perder) − 1. null sin datos de inflación. */
  real: number | null;
};

/** Arma los escenarios con su ganancia nominal y real, ordenados por valor final (los que no tienen dato quedan afuera). */
export function ordenarEscenarios(monto: number, candidatos: { id: string; nombre: string; detalle: string; valor: number | null }[], necesario: number | null): Escenario[] {
  return candidatos
    .filter((c): c is typeof c & { valor: number } => c.valor !== null && Number.isFinite(c.valor) && c.valor > 0)
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      detalle: c.detalle,
      valor: c.valor,
      ganancia: d(c.valor).div(monto).minus(1).toNumber(),
      real: necesario ? d(c.valor).div(necesario).minus(1).toNumber() : null,
    }))
    .sort((a, b) => b.valor - a.valor || a.nombre.localeCompare(b.nombre, "es"));
}
