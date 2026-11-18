import { d, DIAS_ANIO, UNO, type Dec, type Num } from "./decimal";
import { aUTC, desdeUTC, esHabil, sumarDias, type FechaISO } from "./fechas";

/**
 * Opciones sobre acciones de BYMA (GGAL, YPF, PAMP…).
 *
 * El modelo (Black-Scholes, volatilidad implícita, delta) trabaja con `number`: es una estimación estadística,
 * no una cuenta de plata. Las cuentas con pesos (lanzamiento cubierto) van con decimal.js.
 */

export type TipoOpcion = "call" | "put";

// ───────────────────────── Símbolos y vencimientos ─────────────────────────

/** Códigos de mes de BYMA: GFGC5400DI = call de GGAL, base $5.400, vence en diciembre. */
export const MESES_OPCION: Record<string, number> = { EN: 1, FE: 2, MR: 3, AB: 4, MY: 5, JU: 6, JL: 7, AG: 8, SE: 9, OC: 10, NO: 11, DI: 12 };

export type SimboloOpcion = { prefijo: string; tipo: TipoOpcion; base: number; codigoMes: string };

/**
 * Desarma el símbolo: prefijo de 3 letras, C (call) o V (put), la base y el mes.
 * Los símbolos tienen 10 caracteres como máximo: con una base de 5 cifras el mes queda en una letra
 * (GFGC10300D = diciembre). Devuelve null si no es una opción.
 */
export function parsearSimbolo(simbolo: string): SimboloOpcion | null {
  const m = /^([A-Z]{3})([CV])(\d+(?:\.\d+)?)([A-Z]{1,2})$/.exec(simbolo);
  if (!m) return null;
  const [, prefijo, cv, base, mes] = m;
  const valor = Number(base);
  if (!prefijo || !mes || !Number.isFinite(valor) || valor <= 0) return null;
  if (mes.length === 2 && !(mes in MESES_OPCION)) return null;
  if (mes.length === 1 && !Object.keys(MESES_OPCION).some((k) => k.startsWith(mes))) return null;
  return { prefijo, tipo: cv === "C" ? "call" : "put", base: valor, codigoMes: mes };
}

/** Tercer viernes del mes (mes 1–12). */
export function tercerViernes(anio: number, mes: number): FechaISO {
  const primero = new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay();
  const primerViernes = 1 + ((5 - primero + 7) % 7);
  return desdeUTC(Date.UTC(anio, mes - 1, primerViernes + 14));
}

/** Vencimiento de BYMA: el tercer viernes del mes; si no es hábil, el hábil anterior. */
export function vencimientoDelMes(anio: number, mes: number, feriados: ReadonlySet<FechaISO>): FechaISO {
  let fecha = tercerViernes(anio, mes);
  while (!esHabil(fecha, feriados)) fecha = sumarDias(fecha, -1);
  return fecha;
}

/**
 * Un vencimiento de este año que pasó hace menos de esto se toma como vencido (la fuente a veces sigue listando
 * la serie unos días): no lo pasamos al año siguiente. BYMA no lista series a más de un año.
 */
const DIAS_VENCIDA = 60;

/** El vencimiento de un mes dado: el de este año si no pasó (o pasó hace poco: vencida), si no el del año que viene. */
function proximoVencimiento(mes: number, hoy: FechaISO, feriados: ReadonlySet<FechaISO>): FechaISO {
  const anio = Number(hoy.slice(0, 4));
  const este = vencimientoDelMes(anio, mes, feriados);
  if (este >= hoy) return este;
  return (aUTC(hoy) - aUTC(este)) / 86_400_000 <= DIAS_VENCIDA ? este : vencimientoDelMes(anio + 1, mes, feriados);
}

/**
 * Fecha de vencimiento de un código de mes. Con una sola letra (símbolo truncado) se elige entre los meses
 * que empiezan con esa letra: primero los que ya aparecen completos en el panel, si no el más cercano.
 */
export function vencimientoOpcion(codigoMes: string, hoy: FechaISO, feriados: ReadonlySet<FechaISO>, codigosPresentes: ReadonlySet<string> = new Set()): FechaISO | null {
  if (codigoMes.length === 2) {
    const mes = MESES_OPCION[codigoMes];
    return mes ? proximoVencimiento(mes, hoy, feriados) : null;
  }
  const candidatos = Object.keys(MESES_OPCION).filter((k) => k.startsWith(codigoMes));
  const presentes = candidatos.filter((k) => codigosPresentes.has(k));
  const lista = (presentes.length ? presentes : candidatos).map((k) => proximoVencimiento(MESES_OPCION[k]!, hoy, feriados)).sort();
  return lista[0] ?? null;
}

// ───────────────────────── Black-Scholes ─────────────────────────

/** Normal estándar acumulada (Abramowitz y Stegun 26.2.17, error < 7,5e-8). */
export function normalAcumulada(x: number): number {
  if (x < 0) return 1 - normalAcumulada(-x);
  const t = 1 / (1 + 0.2316419 * x);
  const poli = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return 1 - (Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI)) * poli;
}

export type ParametrosBS = {
  tipo: TipoOpcion;
  /** Precio de la acción. */
  s: number;
  /** Base (strike). */
  k: number;
  /** Tiempo al vencimiento, en años. */
  t: number;
  /** Tasa libre de riesgo, continua. */
  r: number;
  /** Volatilidad anual. */
  sigma: number;
};

function d1d2({ s, k, t, r, sigma }: ParametrosBS): [number, number] {
  const raiz = sigma * Math.sqrt(t);
  const d1 = (Math.log(s / k) + (r + (sigma * sigma) / 2) * t) / raiz;
  return [d1, d1 - raiz];
}

/** Prima teórica de Black-Scholes (opción europea, sin dividendos). Ej.: S=K=100, 1 año, r=5 %, σ=20 % → call 10,45. */
export function primaBS(p: ParametrosBS): number {
  const [d1, d2] = d1d2(p);
  const descuento = p.k * Math.exp(-p.r * p.t);
  return p.tipo === "call" ? p.s * normalAcumulada(d1) - descuento * normalAcumulada(d2) : descuento * normalAcumulada(-d2) - p.s * normalAcumulada(-d1);
}

/** Delta: cuánto se mueve la prima por cada $1 que se mueve la acción. Call entre 0 y 1, put entre −1 y 0. */
export function deltaBS(p: ParametrosBS): number {
  const [d1] = d1d2(p);
  return p.tipo === "call" ? normalAcumulada(d1) : normalAcumulada(d1) - 1;
}

/**
 * Volatilidad implícita: la σ que hace que Black-Scholes dé la prima observada (bisección entre 1 % y 500 %).
 * null si la prima está fuera de los límites que admite el modelo (por debajo del valor intrínseco descontado,
 * o por encima del precio de la acción) o si falta tiempo.
 */
export function volatilidadImplicita(prima: number, p: Omit<ParametrosBS, "sigma">): number | null {
  if (!(prima > 0) || !(p.t > 0) || !(p.s > 0) || !(p.k > 0)) return null;
  const descuento = p.k * Math.exp(-p.r * p.t);
  const minimo = p.tipo === "call" ? Math.max(0, p.s - descuento) : Math.max(0, descuento - p.s);
  const maximo = p.tipo === "call" ? p.s : descuento;
  if (prima <= minimo || prima >= maximo) return null;
  let bajo = 0.01;
  let alto = 5;
  if (primaBS({ ...p, sigma: bajo }) > prima || primaBS({ ...p, sigma: alto }) < prima) return null;
  for (let i = 0; i < 100; i++) {
    const medio = (bajo + alto) / 2;
    if (primaBS({ ...p, sigma: medio }) > prima) alto = medio;
    else bajo = medio;
    if (alto - bajo < 1e-7) break;
  }
  return (bajo + alto) / 2;
}

/** Tasa continua equivalente a una TEA: ln(1 + TEA). */
export function tasaContinua(tea: number): number {
  return Math.log(1 + tea);
}

/** Valor intrínseco por acción: lo que valdría ejercerla hoy. */
export function valorIntrinseco(tipo: TipoOpcion, s: number, k: number): number {
  return Math.max(0, tipo === "call" ? s - k : k - s);
}

// ───────────────────────── Lanzamiento cubierto ─────────────────────────

export type LanzamientoCubierto = {
  /** Lo que ponés por acción: precio de la acción − prima cobrada. */
  inversion: Dec;
  /** Rendimiento directo si te ejercen: base / inversión − 1. */
  directo: Dec;
  tna: Dec;
  tea: Dec;
  /** Cuánto puede bajar la acción y que igual te ejerzan: 1 − base / precio. Negativo: tiene que subir. */
  colchon: Dec;
  /** Precio de la acción al vencimiento en el que no ganás ni perdés (= inversión). */
  equilibrio: Dec;
  /** Cuánto puede bajar la acción hasta el punto de equilibrio: prima / precio. */
  caidaEquilibrio: Dec;
};

/**
 * Comprás la acción y vendés un call. Si al vencimiento la acción está por encima de la base, te ejercen:
 * entregás la acción a la base y la cuenta queda cerrada, como una colocación a tasa.
 * Ej.: acción $4.720, call base $4.400 cobrado a $480, 31 días → inversión $4.240, directo 3,77 %, TNA 44,4 %.
 * `comision` (fracción, comisión + derechos de mercado) se cobra al comprar la acción, al vender el call y al
 * entregar la acción en el ejercicio: inversión = S × (1 + c) − C × (1 − c); cobro = K × (1 − c). Sin impuestos.
 */
export function lanzamientoCubierto(precioAccion: Num, prima: Num, base: Num, dias: number, comision: Num = 0): LanzamientoCubierto | null {
  const s = d(precioAccion);
  const c = d(prima);
  const k = d(base);
  const com = d(comision);
  if (dias <= 0 || s.lte(0) || c.lte(0) || k.lte(0) || com.lt(0) || com.gte(1)) return null;
  const inversion = s.mul(UNO.plus(com)).minus(c.mul(UNO.minus(com)));
  if (inversion.lte(0)) return null;
  const factor = k.mul(UNO.minus(com)).div(inversion);
  const directo = factor.minus(UNO);
  return {
    inversion,
    directo,
    tna: directo.mul(DIAS_ANIO).div(dias),
    tea: factor.pow(DIAS_ANIO.div(dias)).minus(UNO),
    colchon: UNO.minus(k.div(s)),
    // Si no te ejercen y vendés la acción (pagando comisión), no perdés mientras S_venta × (1 − c) ≥ inversión.
    equilibrio: inversion.div(UNO.minus(com)),
    caidaEquilibrio: UNO.minus(inversion.div(UNO.minus(com)).div(s)),
  };
}

// ───────────────────────── Cajas ─────────────────────────

export type PuntasCaja = {
  /** Call de la base baja y de la base alta, put de la base baja y de la base alta: mejores puntas. */
  callBaja: { compra: number | null; venta: number | null };
  callAlta: { compra: number | null; venta: number | null };
  putBaja: { compra: number | null; venta: number | null };
  putAlta: { compra: number | null; venta: number | null };
};

export type TasaCaja = {
  /** Colocar: lo que ponés hoy por acción. Tomar: lo que recibís hoy por acción. */
  hoy: Dec;
  /** Lo que cobrás (colocar) o pagás (tomar) al vencimiento por acción: la diferencia de bases. */
  alVencimiento: Dec;
  directo: Dec;
  tna: Dec;
  tea: Dec;
};

/**
 * Caja (box spread): call comprado y put vendido en la base baja, call vendido y put comprado en la base alta.
 * Al vencimiento vale siempre la diferencia de bases, suba o baje la acción: es una tasa sin riesgo de precio.
 *  - Colocar pesos: comprás la caja (pagás las puntas vendedoras de lo que comprás, cobrás las compradoras de lo que vendés).
 *  - Tomar pesos: la vendés (al revés), y al vencimiento pagás la diferencia de bases.
 * `comision` se cobra sobre cada una de las cuatro primas. Antes de los costos del ejercicio.
 * Ej.: bases 4.400 y 5.000, colocar por $585 → al vencimiento $600: 2,56 % directo.
 */
export function tasaCaja(baja: Num, alta: Num, p: PuntasCaja, operacion: "colocar" | "tomar", dias: number, comision: Num = 0): TasaCaja | null {
  const k1 = d(baja);
  const k2 = d(alta);
  const com = d(comision);
  if (dias <= 0 || k2.lte(k1) || com.lt(0) || com.gte(1)) return null;
  const precios =
    operacion === "colocar"
      ? { compras: [p.callBaja.venta, p.putAlta.venta], ventas: [p.callAlta.compra, p.putBaja.compra] }
      : { compras: [p.callAlta.venta, p.putBaja.venta], ventas: [p.callBaja.compra, p.putAlta.compra] };
  const todos = [...precios.compras, ...precios.ventas];
  if (todos.some((x) => !x || x <= 0)) return null;
  const pagas = precios.compras.reduce((s, x) => s.plus(x!), d(0));
  const cobras = precios.ventas.reduce((s, x) => s.plus(x!), d(0));
  const costos = todos.reduce((s, x) => s.plus(x!), d(0)).mul(com);
  const diferencia = k2.minus(k1);
  // Colocar: hoy ponés (pagás − cobrás + costos). Tomar: hoy recibís (cobrás − pagás − costos).
  const hoy = operacion === "colocar" ? pagas.minus(cobras).plus(costos) : cobras.minus(pagas).minus(costos);
  if (hoy.lte(0)) return null;
  // Colocar: cobrás la diferencia por lo que pusiste. Tomar: pagás la diferencia por lo que recibiste (tu costo).
  const factor = diferencia.div(hoy);
  const directo = factor.minus(UNO);
  return { hoy, alVencimiento: diferencia, directo, tna: directo.mul(DIAS_ANIO).div(dias), tea: factor.pow(DIAS_ANIO.div(dias)).minus(UNO) };
}

// ───────────────────────── Estrategias ─────────────────────────

export type Pata = {
  tipo: TipoOpcion | "accion";
  lado: "compra" | "venta";
  /** Base de la opción (en la acción no se usa). */
  base: number;
  /** Prima por acción, o precio de la acción. */
  precio: number;
  /** Opciones: contratos. Acción: cantidad de acciones. */
  cantidad: number;
};

const signo = (p: Pata) => (p.lado === "compra" ? 1 : -1);
/** Acciones que mueve la pata: contratos × lote, o las acciones. */
const acciones = (p: Pata, lote: number) => (p.tipo === "accion" ? p.cantidad : p.cantidad * lote);

/** Lo que pagás hoy para armar la estrategia (negativo: cobrás), con la comisión sobre cada pata. */
export function costoEstrategia(patas: Pata[], lote: number, comision: Num = 0): Dec {
  return patas.reduce((s, p) => {
    const monto = d(p.precio).mul(acciones(p, lote));
    return s.plus(monto.mul(signo(p))).plus(monto.mul(comision));
  }, d(0));
}

/** Lo que vale la estrategia al vencimiento si la acción cierra en `s` (sin costos del ejercicio). */
export function valorAlVencimiento(patas: Pata[], lote: number, s: Num): Dec {
  const precio = d(s);
  return patas.reduce((total, p) => {
    const unidad = p.tipo === "accion" ? precio : p.tipo === "call" ? noNegativo(precio.minus(p.base)) : noNegativo(d(p.base).minus(precio));
    return total.plus(unidad.mul(acciones(p, lote)).mul(signo(p)));
  }, d(0));
}

const noNegativo = (x: Dec) => (x.gt(0) ? x : d(0));

/** Ganancia o pérdida al vencimiento si la acción cierra en `s`. */
export function resultadoAlVencimiento(patas: Pata[], lote: number, s: Num, comision: Num = 0): Dec {
  return valorAlVencimiento(patas, lote, s).minus(costoEstrategia(patas, lote, comision));
}

export type AnalisisEstrategia = {
  /** Positivo: pagás hoy. Negativo: cobrás hoy. */
  costo: Dec;
  /** null = ilimitada. */
  gananciaMaxima: Dec | null;
  /** null = ilimitada. Se informa como número positivo (lo que podés perder). */
  perdidaMaxima: Dec | null;
  /** Precios de la acción al vencimiento en los que no ganás ni perdés. */
  equilibrios: number[];
};

/**
 * Al vencimiento el resultado es lineal entre bases: alcanza con mirarlo en 0, en cada base y la pendiente después de
 * la última base. Pendiente final positiva = ganancia ilimitada; negativa = pérdida ilimitada.
 */
export function analizarEstrategia(patas: Pata[], lote: number, comision: Num = 0): AnalisisEstrategia | null {
  if (patas.length === 0) return null;
  const costo = costoEstrategia(patas, lote, comision);
  const bases = [...new Set(patas.filter((p) => p.tipo !== "accion").map((p) => p.base))].sort((a, b) => a - b);
  const xs = [0, ...bases.filter((b) => b > 0)];
  const ys = xs.map((x) => resultadoAlVencimiento(patas, lote, x, comision));
  // Pendiente por $ 1 de la acción después de la base más alta: calls y acciones suman, puts no.
  const pendiente = patas.reduce((s, p) => s + (p.tipo === "put" ? 0 : signo(p) * acciones(p, lote)), 0);
  const maximo = ys.reduce((m, y) => (y.gt(m) ? y : m), ys[0]!);
  const minimo = ys.reduce((m, y) => (y.lt(m) ? y : m), ys[0]!);
  const equilibrios: number[] = [];
  const agregar = (x: number) => {
    if (x >= 0 && !equilibrios.some((e) => Math.abs(e - x) < 1e-6)) equilibrios.push(Math.round(x * 100) / 100);
  };
  for (let i = 0; i < xs.length; i++) {
    const y0 = ys[i]!;
    if (y0.isZero()) agregar(xs[i]!);
    if (i < xs.length - 1) {
      const y1 = ys[i + 1]!;
      if (y0.isNeg() !== y1.isNeg() && !y0.isZero() && !y1.isZero()) {
        // Interpolación lineal: x0 + (x1 − x0) × y0 / (y0 − y1).
        agregar(d(xs[i]!).plus(d(xs[i + 1]! - xs[i]!).mul(y0).div(y0.minus(y1))).toNumber());
      }
    }
  }
  const yUltimo = ys.at(-1)!;
  if (pendiente !== 0 && !yUltimo.isZero() && yUltimo.isNeg() === pendiente > 0) agregar(d(xs.at(-1)!).minus(yUltimo.div(pendiente)).toNumber());
  return {
    costo,
    gananciaMaxima: pendiente > 0 ? null : maximo,
    perdidaMaxima: pendiente < 0 ? null : minimo.isNeg() ? minimo.neg() : d(0),
    equilibrios: equilibrios.sort((a, b) => a - b),
  };
}

/** Días corridos entre dos fechas ISO (para el tiempo del modelo, en años). */
export function aniosEntre(desde: FechaISO, hasta: FechaISO): number {
  return (aUTC(hasta) - aUTC(desde)) / 86_400_000 / 365;
}
