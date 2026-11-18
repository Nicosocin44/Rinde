import type { DefinicionBono } from "./bonos";
import { d, UNO, type Num } from "./decimal";
import { diasEntre, sumarDias, type FechaISO } from "./fechas";

/**
 * Datos de la ficha de un activo (CEDEAR o acción): rendimiento por período, rango, volatilidad, máxima caída,
 * la serie en dólares y cuánto más caro o barato sale su dólar implícito contra el MEP.
 * Todo sale de los cierres diarios; ninguna función inventa un dato si la serie no alcanza (devuelve null).
 */

export type Vela = { fecha: FechaISO; apertura: number; maximo: number; minimo: number; cierre: number; volumen: number };

/** Días hábiles por año, para anualizar la volatilidad. */
export const RUEDAS_POR_ANIO = 252;

/**
 * Corta la serie en el último salto de más de 55 % en un día (cambio de ratio de un CEDEAR o split no ajustado):
 * antes del salto los precios no son comparables con los de hoy. Mismo criterio que la cartera.
 */
export function cortarEnSalto<T extends { cierre: number }>(serie: T[], umbral = 0.55): T[] {
  for (let i = serie.length - 1; i > 0; i--) {
    const anterior = serie[i - 1]!.cierre;
    if (anterior <= 0) continue;
    const r = d(serie[i]!.cierre).div(anterior);
    if (r.gt(UNO.plus(umbral)) || r.lt(UNO.minus(umbral))) return serie.slice(i);
  }
  return serie;
}

/** Último cierre en o antes de una fecha (la serie viene ordenada). */
function cierreHasta<T extends { fecha: FechaISO; cierre: number }>(serie: T[], fecha: FechaISO): T | null {
  let encontrado: T | null = null;
  for (const p of serie) {
    if (p.fecha > fecha) break;
    encontrado = p;
  }
  return encontrado;
}

/** Variación del último cierre contra el cierre en o antes de `desde`. null si la serie empieza después. */
export function variacionDesde(serie: { fecha: FechaISO; cierre: number }[], desde: FechaISO): number | null {
  const ultimo = serie.at(-1);
  const base = cierreHasta(serie, desde);
  if (!ultimo || !base || base.cierre <= 0 || base === ultimo) return null;
  return d(ultimo.cierre).div(base.cierre).minus(1).toNumber();
}

export type Rendimientos = { semana: number | null; mes: number | null; tresMeses: number | null; enElAnio: number | null; unAnio: number | null; cincoAnios: number | null };

/** Rendimiento a 1 semana, 1 mes, 3 meses, en el año (desde el último cierre del año anterior), 1 año y 5 años. */
export function rendimientos(serie: { fecha: FechaISO; cierre: number }[], hoy: FechaISO): Rendimientos {
  const anio = Number(hoy.slice(0, 4));
  return {
    semana: variacionDesde(serie, sumarDias(hoy, -7)),
    mes: variacionDesde(serie, sumarDias(hoy, -30)),
    tresMeses: variacionDesde(serie, sumarDias(hoy, -91)),
    enElAnio: variacionDesde(serie, `${anio - 1}-12-31`),
    unAnio: variacionDesde(serie, sumarDias(hoy, -365)),
    cincoAnios: variacionDesde(serie, sumarDias(hoy, -1826)),
  };
}

/** Mínimo y máximo intradiario desde una fecha (por ejemplo, 52 semanas). */
export function rango(serie: Vela[], desde: FechaISO): { minimo: number; maximo: number } | null {
  const tramo = serie.filter((v) => v.fecha >= desde);
  if (tramo.length === 0) return null;
  return { minimo: Math.min(...tramo.map((v) => v.minimo || v.cierre)), maximo: Math.max(...tramo.map((v) => v.maximo || v.cierre)) };
}

/**
 * Volatilidad anual: desvío estándar (muestral) de los rendimientos logarítmicos diarios de las últimas `ruedas`,
 * por la raíz de las ruedas de un año (252 en la bolsa; 365 en cripto, que opera todos los días). Necesita al menos 20.
 */
export function volatilidadAnual(serie: { cierre: number }[], ruedas = RUEDAS_POR_ANIO, porAnio = RUEDAS_POR_ANIO): number | null {
  const tramo = serie.slice(-(ruedas + 1)).filter((p) => p.cierre > 0);
  if (tramo.length < 21) return null;
  const r = tramo.slice(1).map((p, i) => d(p.cierre).div(tramo[i]!.cierre).ln());
  const media = r.reduce((s, x) => s.plus(x), d(0)).div(r.length);
  const varianza = r.reduce((s, x) => s.plus(x.minus(media).pow(2)), d(0)).div(r.length - 1);
  return varianza.sqrt().mul(d(porAnio).sqrt()).toNumber();
}

/** Máxima caída desde un pico hasta el piso siguiente (con sus fechas), desde una fecha. null si nunca bajó. */
export function maximaCaida(serie: { fecha: FechaISO; cierre: number }[], desde: FechaISO): { caida: number; pico: FechaISO; piso: FechaISO } | null {
  const tramo = serie.filter((p) => p.fecha >= desde && p.cierre > 0);
  let pico = tramo[0];
  let peor: { caida: number; pico: FechaISO; piso: FechaISO } | null = null;
  for (const p of tramo) {
    if (!pico || p.cierre > pico.cierre) pico = p;
    const caida = d(p.cierre).div(pico.cierre).minus(1).toNumber();
    if (caida < 0 && (!peor || caida < peor.caida)) peor = { caida, pico: pico.fecha, piso: p.fecha };
  }
  return peor;
}

/** La serie en dólares: cada cierre dividido por el MEP de esa fecha (o el último anterior). Sin MEP previo, se saltea. */
export function enDolares(serie: { fecha: FechaISO; cierre: number }[], mep: { fecha: FechaISO; valor: number }[]): { fecha: FechaISO; cierre: number }[] {
  const ordenado = [...mep].filter((m) => m.valor > 0).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const salida: { fecha: FechaISO; cierre: number }[] = [];
  let j = -1;
  for (const p of serie) {
    while (j + 1 < ordenado.length && ordenado[j + 1]!.fecha <= p.fecha) j++;
    if (j < 0) continue;
    salida.push({ fecha: p.fecha, cierre: d(p.cierre).div(ordenado[j]!.valor).toNumber() });
  }
  return salida;
}

/** Cuánto más caro (positivo) o barato (negativo) es el dólar implícito de un CEDEAR contra el MEP: implícito / MEP − 1. */
export function primaContraMep(implicito: Num, mep: Num): number | null {
  if (d(mep).lte(0) || d(implicito).lte(0)) return null;
  return d(implicito).div(mep).minus(1).toNumber();
}

/** La serie en pesos: cada cierre en dólares por el dólar de esa fecha (o el último anterior). Sin dólar previo, se saltea. */
export function aPesos(serie: { fecha: FechaISO; cierre: number }[], dolar: { fecha: FechaISO; valor: number }[]): { fecha: FechaISO; cierre: number }[] {
  const ordenado = [...dolar].filter((m) => m.valor > 0).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const salida: { fecha: FechaISO; cierre: number }[] = [];
  let j = -1;
  for (const p of serie) {
    while (j + 1 < ordenado.length && ordenado[j + 1]!.fecha <= p.fecha) j++;
    if (j < 0) continue;
    salida.push({ fecha: p.fecha, cierre: d(p.cierre).mul(ordenado[j]!.valor).toNumber() });
  }
  return salida;
}

/**
 * Inflación esperada entre dos fechas con las expectativas mensuales del REM: cada mes pesa por los días del período que
 * caen en él, Π (1 + π_mes)^(días en el mes / días del mes) − 1. Para meses después del último dato, repite el último.
 */
export function inflacionEsperadaHasta(mensual: { mes: string; valor: number }[], desde: FechaISO, hasta: FechaISO): number | null {
  const ordenado = [...mensual].sort((a, b) => a.mes.localeCompare(b.mes));
  if (ordenado.length === 0 || hasta <= desde) return null;
  let factor = UNO;
  let fecha = desde;
  while (fecha < hasta) {
    const mes = fecha.slice(0, 7);
    const [y, m] = mes.split("-").map(Number);
    const diasDelMes = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
    const finDeMes = sumarDias(`${mes}-01`, diasDelMes);
    const corte = finDeMes < hasta ? finDeMes : hasta;
    const dias = diasEntre(fecha, corte);
    const pi = ordenado.find((x) => x.mes === mes)?.valor ?? (mes > ordenado.at(-1)!.mes ? ordenado.at(-1)!.valor : null);
    if (pi === null) return null;
    factor = factor.mul(UNO.plus(pi).pow(d(dias).div(diasDelMes)));
    fecha = corte;
  }
  return factor.minus(1).toNumber();
}

export type ResumenBono = {
  /** Pagos por año (2 = semestral). */
  pagosPorAnio: number;
  /** Tasa del cupón vigente a la fecha y la máxima que llega a pagar (step-up). */
  tasaHoy: number;
  tasaMaxima: number;
  /** Cuotas de amortización que faltan y desde cuándo. */
  cuotasRestantes: number;
  proximaAmortizacion: FechaISO | null;
  vencimiento: FechaISO;
};

/** Lo que hay que saber de un bono para describirlo en una línea, sacado de su cronograma. */
export function resumenBono(def: DefinicionBono, hoy: FechaISO): ResumenBono {
  const vigente = [...def.cupones].filter((c) => c.desde <= hoy).at(-1) ?? def.cupones[0]!;
  const amortizaciones = Object.keys(def.amortizaciones).filter((f) => f > hoy && (def.amortizaciones[f] ?? 0) > 0).sort();
  return {
    pagosPorAnio: def.frecuencia,
    tasaHoy: vigente.tasaAnual,
    tasaMaxima: Math.max(...def.cupones.map((c) => c.tasaAnual)),
    cuotasRestantes: amortizaciones.length,
    proximaAmortizacion: amortizaciones[0] ?? null,
    vencimiento: def.pagos.at(-1)!,
  };
}

/**
 * Pasa velas a otra moneda con el tipo de cambio de cada día (o de cada momento): apertura, máximo, mínimo y
 * cierre se dividen (pesos → dólares) o se multiplican (dólares → pesos) por el último valor del dólar a esa fecha.
 * Las fechas pueden ser días ("2026-11-18") o fecha y hora ISO, siempre que las dos series usen el mismo formato.
 */
export function velasEnOtraMoneda(velas: Vela[], dolar: { fecha: string; valor: number }[], operacion: "dividir" | "multiplicar"): Vela[] {
  const ordenado = [...dolar].filter((m) => m.valor > 0).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const salida: Vela[] = [];
  let j = -1;
  for (const v of velas) {
    while (j + 1 < ordenado.length && ordenado[j + 1]!.fecha <= v.fecha) j++;
    if (j < 0) continue;
    const tc = d(ordenado[j]!.valor);
    const pasar = (x: number) => (operacion === "dividir" ? d(x).div(tc) : d(x).mul(tc)).toNumber();
    salida.push({ ...v, apertura: pasar(v.apertura), maximo: pasar(v.maximo), minimo: pasar(v.minimo), cierre: pasar(v.cierre) });
  }
  return salida;
}

/** Variación entre la primera apertura y el último cierre de un tramo de velas (fracción). null si no alcanza. */
export function variacionDeVelas(velas: Vela[]): number | null {
  if (velas.length < 2 || velas[0]!.apertura <= 0) return null;
  return d(velas.at(-1)!.cierre).div(velas[0]!.apertura).minus(1).toNumber();
}

/** Vela compacta para los gráficos: [fecha ISO (o fecha y hora), apertura, máximo, mínimo, cierre]. */
export type VelaCompacta = [string, number, number, number, number];

/** Velas del dominio → formato compacto del gráfico (lo que viaja al navegador). */
export function compactar(velas: Vela[]): VelaCompacta[] {
  return velas.map((v) => [v.fecha, v.apertura, v.maximo, v.minimo, v.cierre]);
}

export type AjusteRatio = {
  /** Desde qué índice de la serie es comparable (antes hay un salto que no es un cambio de ratio: se corta). */
  desde: number;
  /** Multiplicador para el precio de cada índice (1 después del último cambio de ratio). */
  factores: number[];
  /** Los cambios de ratio encontrados: fecha del primer precio nuevo y cuántas veces cambió (3 = cada CEDEAR nuevo vale un tercio). */
  cambios: { indice: number; veces: number }[];
};

/**
 * Ajusta los cambios de ratio y splits: un salto de más de 55 % en un día que da casi un número entero de veces (±5 %),
 * como 56.000 → 18.760 (3 veces) o 83.000 → 8.105 (10 veces), es un cambio de ratio. Los precios anteriores se dividen
 * (o multiplican) por ese entero exacto y la serie sigue siendo comparable. Un salto que no da entero no se puede
 * explicar: la serie se corta ahí, como `cortarEnSalto`.
 */
export function ajustarRatios(serie: { cierre: number }[], umbral = 0.55, tolerancia = 0.05): AjusteRatio {
  const factores = serie.map(() => 1);
  const cambios: AjusteRatio["cambios"] = [];
  let acumulado = d(1);
  for (let j = serie.length - 1; j >= 0; j--) {
    factores[j] = acumulado.toNumber();
    if (j === 0) break;
    const anterior = serie[j - 1]!.cierre;
    if (anterior <= 0) continue;
    const r = d(serie[j]!.cierre).div(anterior);
    if (r.lte(UNO.plus(umbral)) && r.gte(UNO.minus(umbral))) continue;
    const veces = r.lt(1) ? UNO.div(r) : r;
    const entero = Math.round(veces.toNumber());
    if (entero >= 2 && veces.div(entero).minus(1).abs().lte(tolerancia)) {
      // Bajó (cada unidad nueva vale menos): los precios de antes se dividen; subió: se multiplican.
      acumulado = acumulado.mul(r.lt(1) ? UNO.div(entero) : entero);
      cambios.push({ indice: j, veces: entero });
    } else {
      return { desde: j, factores, cambios };
    }
  }
  return { desde: 0, factores, cambios };
}
