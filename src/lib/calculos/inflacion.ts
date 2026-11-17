import { d, UNO, type Dec, type Num } from "./decimal";
import type { FechaISO } from "./fechas";

/** Inflación: acumulada, índice y actualización de montos. */

export type InflacionMensual = {
  /** Último día del mes al que corresponde el dato ("2026-10-31"). */
  fecha: FechaISO;
  /** Variación mensual en porcentaje (2.2 = 2,2 %). */
  valor: number;
};

/** Inflación acumulada: Π(1 + π_m) − 1. Ej.: 2 %, 3 % y 1 % → 6,11 %. */
export function inflacionAcumulada(mensuales: Num[]): Dec {
  return mensuales.reduce<Dec>((acc, m) => acc.mul(UNO.plus(d(m).div(100))), UNO).minus(1);
}

/** Nivel de precios al CIERRE de cada mes. El primer punto es la base (cierre del mes previo al primer dato). */
export type PuntoIndice = { mes: string; indice: Dec };

function mesAnterior(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const fecha = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 2, 1));
  return fecha.toISOString().slice(0, 7);
}

function mesesEntre(desde: string, hasta: string): number {
  const [y1, m1] = desde.split("-").map(Number);
  const [y2, m2] = hasta.split("-").map(Number);
  return ((y2 ?? 0) - (y1 ?? 0)) * 12 + ((m2 ?? 0) - (m1 ?? 0));
}

/** Índice de precios armado con el producto acumulado del IPC mensual (base 1). */
export function construirIndice(serie: InflacionMensual[]): PuntoIndice[] {
  const ordenada = [...serie].sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (ordenada.length === 0) return [];
  let nivel = UNO;
  const puntos: PuntoIndice[] = [{ mes: mesAnterior(ordenada[0]!.fecha.slice(0, 7)), indice: nivel }];
  for (const p of ordenada) {
    nivel = nivel.mul(UNO.plus(d(p.valor).div(100)));
    puntos.push({ mes: p.fecha.slice(0, 7), indice: nivel });
  }
  return puntos;
}

/**
 * Nivel de precios a una fecha. Dentro de un mes interpola geométricamente entre el cierre del mes
 * anterior y el cierre del mes en curso. Después del último dato publicado, proyecta con
 * `mensualProyectada` (en %, por ejemplo la del REM) o, si no se indica, repite la última variación.
 * Devuelve null si la fecha es anterior al inicio de la serie.
 */
export function nivelEnFecha(indice: PuntoIndice[], fecha: FechaISO, mensualProyectada?: Num): Dec | null {
  if (indice.length < 2) return null;
  const mes = fecha.slice(0, 7);
  const [anio, mesNum] = mes.split("-").map(Number);
  const diasMes = new Date(Date.UTC(anio ?? 1970, mesNum ?? 1, 0)).getUTCDate();
  const fraccion = d(Number(fecha.slice(8, 10))).div(diasMes);
  const primero = indice[0]!;
  const ultimo = indice[indice.length - 1]!;
  if (mes <= primero.mes) return mes === primero.mes && fraccion.eq(1) ? primero.indice : null;

  const i = indice.findIndex((p) => p.mes === mes);
  if (i > 0) {
    const apertura = indice[i - 1]!.indice;
    return apertura.mul(indice[i]!.indice.div(apertura).pow(fraccion));
  }
  // Fecha posterior al último dato publicado.
  const penultimo = indice[indice.length - 2]!;
  const factor =
    mensualProyectada !== undefined ? UNO.plus(d(mensualProyectada).div(100)) : ultimo.indice.div(penultimo.indice);
  const mesesCompletos = Math.max(0, mesesEntre(ultimo.mes, mes) - 1);
  return ultimo.indice.mul(factor.pow(mesesCompletos)).mul(factor.pow(fraccion));
}

/** Actualiza un monto por inflación: monto × índice_destino / índice_origen. */
export function actualizarMonto(monto: Num, indiceOrigen: Num, indiceDestino: Num): Dec {
  return d(monto).mul(indiceDestino).div(indiceOrigen);
}
