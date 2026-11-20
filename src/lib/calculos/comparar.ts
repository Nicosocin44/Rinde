import { aPesos, enDolares, maximaCaida, volatilidadAnual } from "./activo";
import { d } from "./decimal";
import { esFinDeSemana, sumarDias, type FechaISO } from "./fechas";

/**
 * Comparar activos en un mismo gráfico: cada serie se pasa a la misma moneda (pesos o dólares MEP), arranca en la misma
 * fecha y se muestra como variación porcentual desde ahí. Puro: recibe las series y devuelve números.
 */

/** [fecha, precio]. */
export type PuntoPrecio = [FechaISO, number];
export type MonedaSerie = "ARS" | "USD";
export type RangoComparar = "1M" | "3M" | "6M" | "1A" | "3A" | "5A";

export const DIAS_RANGO_COMPARAR: Record<RangoComparar, number> = { "1M": 31, "3M": 92, "6M": 183, "1A": 366, "3A": 1096, "5A": 1827 };

/** Pasa una serie a la moneda pedida con el dólar MEP de cada día (o el último anterior). Sin MEP previo, el punto se saltea. */
export function enMoneda(serie: PuntoPrecio[], de: MonedaSerie, a: MonedaSerie, mep: PuntoPrecio[]): PuntoPrecio[] {
  if (de === a) return serie;
  const puntos = serie.map(([fecha, cierre]) => ({ fecha, cierre }));
  const dolar = mep.map(([fecha, valor]) => ({ fecha, valor }));
  return (de === "ARS" ? enDolares(puntos, dolar) : aPesos(puntos, dolar)).map((p) => [p.fecha, p.cierre]);
}

/**
 * La fecha en que arranca la comparación: la del rango pedido, salvo que algún activo empiece a cotizar después (así
 * todos arrancan juntos y la comparación es pareja). null si ninguna serie tiene datos.
 */
export function inicioComun(series: PuntoPrecio[][], rango: RangoComparar, hoy: FechaISO): FechaISO | null {
  const conDatos = series.filter((s) => s.length > 1);
  if (conDatos.length === 0) return null;
  const desdeRango = sumarDias(hoy, -DIAS_RANGO_COMPARAR[rango]);
  const masTardio = conDatos.map((s) => s[0]![0]).reduce((a, b) => (b > a ? b : a));
  return masTardio > desdeRango ? masTardio : desdeRango;
}

/** Un pago de un bono (cupón + amortización), por 100 de valor nominal original: la misma unidad que su precio. */
export type PagoBono = { fecha: FechaISO; monto: number };

/**
 * El primer día en que el bono cotiza sin el pago ("ex cupón"): el hábil anterior al día de pago (si el pago cae en fin
 * de semana, se corre al lunes). Sin feriados: alcanza para ubicar la caída del precio en una serie diaria.
 */
export function diaExCupon(pago: FechaISO): FechaISO {
  let f = pago;
  while (esFinDeSemana(f)) f = sumarDias(f, 1);
  f = sumarDias(f, -1);
  while (esFinDeSemana(f)) f = sumarDias(f, -1);
  return f;
}

/**
 * Rendimiento total de un bono. El día que deja de cotizar con el pago, el precio cae lo que se paga (en los Bonares y
 * Globales, cupón y amortización: ~8 % dos veces por año). Mirar solo el precio cuenta esa caída como una pérdida
 * aunque el tenedor cobró esos dólares; acá cada pago se reinvierte en el mismo bono ese día. La serie se reescala para
 * que el último precio sea el real (como el "precio ajustado" de las acciones): cambian los anteriores, no el de hoy.
 */
export function conPagosReinvertidos(serie: PuntoPrecio[], pagos: PagoBono[]): PuntoPrecio[] {
  if (serie.length < 2) return serie;
  const ex = pagos
    .filter((p) => p.monto > 0)
    .map((p) => ({ desde: diaExCupon(p.fecha), monto: p.monto }))
    .sort((a, b) => a.desde.localeCompare(b.desde));
  // Los pagos que cortaron antes del primer precio ya están descontados en él.
  let j = 0;
  while (j < ex.length && ex[j]!.desde <= serie[0]![0]) j++;
  let unidades = d(1);
  const porPunto = serie.map(([fecha, precio]) => {
    for (; j < ex.length && ex[j]!.desde <= fecha; j++) {
      if (precio > 0) unidades = unidades.mul(d(ex[j]!.monto).div(precio).plus(1));
    }
    return unidades;
  });
  const hoy = porPunto.at(-1)!;
  return serie.map(([fecha, precio], i) => [fecha, d(precio).mul(porPunto[i]!).div(hoy).toNumber()]);
}

/** Variación de cada punto contra el primer precio en o después de `desde` (fracción: 0,1 = +10 %). Menos de 2 puntos: vacía. */
export function desdeCero(serie: PuntoPrecio[], desde: FechaISO): PuntoPrecio[] {
  const tramo = serie.filter(([f, v]) => f >= desde && v > 0);
  if (tramo.length < 2) return [];
  const base = tramo[0]![1];
  return tramo.map(([f, v]) => [f, d(v).div(base).minus(1).toNumber()]);
}

export type NumerosComparados = {
  /** Variación entre el primer y el último precio del período. */
  variacion: number | null;
  /** Peor caída desde un máximo, dentro del período (fracción negativa). */
  maximaCaida: number | null;
  /** Volatilidad anualizada del último año (con datos diarios). */
  volatilidad: number | null;
  /** Último precio, en la moneda de la serie. */
  ultimo: number | null;
};

/**
 * Los números de un activo en el período. La volatilidad usa siempre el último año (los datos más viejos vienen por
 * semana y mezclarlos la falsearía); `porAnio` es 252 ruedas para acciones y bonos, 365 días para cripto.
 */
export function numerosDelPeriodo(serie: PuntoPrecio[], desde: FechaISO, hoy: FechaISO, porAnio = 252): NumerosComparados {
  const tramo = serie.filter(([f, v]) => f >= desde && v > 0);
  const primero = tramo[0]?.[1];
  const ultimo = tramo.at(-1)?.[1] ?? null;
  const caida = maximaCaida(
    tramo.map(([fecha, cierre]) => ({ fecha, cierre })),
    desde,
  );
  const unAnio = serie.filter(([f, v]) => f >= sumarDias(hoy, -366) && v > 0).map(([, cierre]) => ({ cierre }));
  return {
    variacion: tramo.length >= 2 && primero ? d(ultimo!).div(primero).minus(1).toNumber() : null,
    maximaCaida: caida ? caida.caida : null,
    volatilidad: volatilidadAnual(unAnio, unAnio.length - 1, porAnio),
    ultimo,
  };
}
