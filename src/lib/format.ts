/**
 * Formato es-AR para toda la interfaz: `$ 1.234.567,89`, `24,50 %`, `+0,25 %`, `16 nov`, `hace 2 min`.
 * Acepta number, string o Decimal (cualquier cosa con toNumber()).
 */
import { pais } from "@/config/countries/ar";

type Numerico = number | string | { toNumber(): number } | null | undefined;

const LOCALE = pais.locale;
const NBSP = " ";
const MENOS = "−";
export const SIN_DATO = "—";

function aNumero(x: Numerico): number | null {
  if (x === null || x === undefined) return null;
  const n = typeof x === "number" ? x : typeof x === "string" ? Number(x) : x.toNumber();
  return Number.isFinite(n) ? n : null;
}

const cacheFormato = new Map<string, Intl.NumberFormat>();
function nf(min: number, max: number): Intl.NumberFormat {
  const clave = `${min}-${max}`;
  let f = cacheFormato.get(clave);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: min, maximumFractionDigits: max });
    cacheFormato.set(clave, f);
  }
  return f;
}

/** Número con separadores es-AR. Usa el signo menos tipográfico (−). */
export function numero(x: Numerico, decimales = 2, minDecimales = decimales): string {
  const n = aNumero(x);
  if (n === null) return SIN_DATO;
  const texto = nf(minDecimales, decimales).format(Math.abs(n));
  const esCero = Number(Math.abs(n).toFixed(decimales)) === 0;
  return n < 0 && !esCero ? MENOS + texto : texto;
}

/** `$ 1.234.567,89`. Por defecto sin decimales si el monto es ≥ 10.000. */
export function pesos(x: Numerico, decimales?: number): string {
  const n = aNumero(x);
  if (n === null) return SIN_DATO;
  const dec = decimales ?? (Math.abs(n) >= 10_000 ? 0 : 2);
  const texto = nf(dec, dec).format(Math.abs(n));
  return `${n < 0 ? MENOS : ""}$${NBSP}${texto}`;
}

/** `US$ 1.234,56`. */
export function dolares(x: Numerico, decimales = 2): string {
  const n = aNumero(x);
  if (n === null) return SIN_DATO;
  return `${n < 0 ? MENOS : ""}US$${NBSP}${nf(decimales, decimales).format(Math.abs(n))}`;
}

export function dinero(x: Numerico, moneda: "ARS" | "USD", decimales?: number): string {
  return moneda === "USD" ? dolares(x, decimales ?? 2) : pesos(x, decimales);
}

/** Monto abreviado: `$ 1,2 M`, `$ 350 mil`, `$ 2,4 B` (miles de millones). */
export function pesosCompacto(x: Numerico, simbolo = "$"): string {
  const n = aNumero(x);
  if (n === null) return SIN_DATO;
  const abs = Math.abs(n);
  const signo = n < 0 ? MENOS : "";
  if (abs >= 1e12) return `${signo}${simbolo}${NBSP}${nf(0, 1).format(abs / 1e12)}${NBSP}B`;
  if (abs >= 1e9) return `${signo}${simbolo}${NBSP}${nf(0, 1).format(abs / 1e9)}${NBSP}MM`;
  if (abs >= 1e6) return `${signo}${simbolo}${NBSP}${nf(0, 1).format(abs / 1e6)}${NBSP}M`;
  if (abs >= 1e4) return `${signo}${simbolo}${NBSP}${nf(0, 0).format(abs / 1e3)}${NBSP}mil`;
  return `${signo}${simbolo}${NBSP}${nf(0, 0).format(abs)}`;
}

/** Fracción → `24,50 %`. */
export function porcentaje(fraccion: Numerico, decimales = 2): string {
  const n = aNumero(fraccion);
  if (n === null) return SIN_DATO;
  return `${numero(n * 100, decimales)}${NBSP}%`;
}

/** Fracción → `+0,25 %` / `−0,10 %` (siempre con signo). */
export function delta(fraccion: Numerico, decimales = 2): string {
  const n = aNumero(fraccion);
  if (n === null) return SIN_DATO;
  const redondeado = Number((n * 100).toFixed(decimales));
  const signo = redondeado > 0 ? "+" : redondeado < 0 ? MENOS : "";
  return `${signo}${nf(decimales, decimales).format(Math.abs(n * 100))}${NBSP}%`;
}

/** Diferencia en puntos porcentuales: `+3,1 pp`. */
export function puntos(fraccion: Numerico, decimales = 1): string {
  const n = aNumero(fraccion);
  if (n === null) return SIN_DATO;
  const redondeado = Number((n * 100).toFixed(decimales));
  const signo = redondeado > 0 ? "+" : redondeado < 0 ? MENOS : "";
  return `${signo}${nf(decimales, decimales).format(Math.abs(n * 100))}${NBSP}pp`;
}

/** Monto con signo: `+$ 84.200`. */
export function pesosConSigno(x: Numerico, decimales = 0): string {
  const n = aNumero(x);
  if (n === null) return SIN_DATO;
  const signo = n > 0 ? "+" : n < 0 ? MENOS : "";
  return `${signo}$${NBSP}${nf(decimales, decimales).format(Math.abs(n))}`;
}

/** Parte entera y decimal por separado, para componer cifras grandes (decimales más chicos). */
export function partes(x: Numerico, decimales = 2): { entero: string; decimal: string; negativo: boolean } | null {
  const n = aNumero(x);
  if (n === null) return null;
  const texto = nf(decimales, decimales).format(Math.abs(n));
  const [entero = "0", decimal = ""] = texto.split(",");
  return { entero, decimal, negativo: n < 0 };
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function partesFecha(fecha: string | Date): { y: number; m: number; d: number; dow: number; hh: number; mm: number } {
  if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [y = 1970, m = 1, d = 1] = fecha.split("-").map(Number);
    return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), hh: 0, mm: 0 };
  }
  const instante = typeof fecha === "string" ? new Date(fecha) : fecha;
  const local = new Date(instante.getTime() + pais.utcOffset * 3_600_000);
  return {
    y: local.getUTCFullYear(),
    m: local.getUTCMonth() + 1,
    d: local.getUTCDate(),
    dow: local.getUTCDay(),
    hh: local.getUTCHours(),
    mm: local.getUTCMinutes(),
  };
}

/** `16 nov` (y el año si no es el actual: `16 nov 2027`). */
export function fechaCorta(fecha: string | Date, conAnio: boolean | "auto" = "auto"): string {
  const p = partesFecha(fecha);
  const anioActual = partesFecha(new Date()).y;
  const mostrar = conAnio === "auto" ? p.y !== anioActual : conAnio;
  return `${p.d}${NBSP}${MESES[p.m - 1]}${mostrar ? `${NBSP}${p.y}` : ""}`;
}

/** `nov 2026`. */
export function mesAnio(fecha: string | Date): string {
  const p = partesFecha(fecha);
  return `${MESES[p.m - 1]}${NBSP}${p.y}`;
}

export function nombreMes(fecha: string | Date): string {
  return MESES_LARGOS[partesFecha(fecha).m - 1] ?? "";
}

/** `Lunes 16 de noviembre`. */
export function fechaLarga(fecha: string | Date): string {
  const p = partesFecha(fecha);
  const dia = DIAS[p.dow] ?? "";
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${p.d} de ${MESES_LARGOS[p.m - 1]}`;
}

/** `el jueves` / `mañana` / `hoy` para vencimientos cercanos; si no, `el 16 nov`. */
export function diaCercano(fecha: string, hoy: string): string {
  const dias = Math.round((Date.parse(fecha) - Date.parse(hoy)) / 86_400_000);
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  if (dias > 1 && dias < 7) return `el ${DIAS[partesFecha(fecha).dow]}`;
  return `el ${fechaCorta(fecha)}`;
}

/** `18:41` en hora de Argentina. */
export function hora(fecha: string | Date): string {
  const p = partesFecha(fecha);
  return `${String(p.hh).padStart(2, "0")}:${String(p.mm).padStart(2, "0")}`;
}

/** `hace 2 min`, `hace 3 h`, `ayer`, `hace 4 días`, o la fecha corta. */
export function hace(fecha: string | Date, ahora: Date = new Date()): string {
  const instante = typeof fecha === "string" ? new Date(fecha) : fecha;
  const seg = Math.max(0, Math.round((ahora.getTime() - instante.getTime()) / 1000));
  if (seg < 60) return "recién";
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min}${NBSP}min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `hace ${horas}${NBSP}h`;
  const dias = Math.round(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  return fechaCorta(instante);
}

/** Días → `14 días`, `1 día`, `3 meses`. */
export function plazo(dias: number): string {
  if (dias === 1) return "1 día";
  if (dias < 60) return `${dias} días`;
  if (dias < 365) return `${Math.round(dias / 30)} meses`;
  const anios = dias / 365;
  return anios < 1.05 ? "1 año" : `${nf(0, 1).format(anios)} años`;
}

/** Interpreta lo que escribe una persona: "1.500.000", "1,5M", "500k", "2 millones". Devuelve null si no es un número. */
export function interpretarMonto(texto: string): number | null {
  const limpio = texto.trim().toLowerCase().replace(/\$|us\$|usd|ars/g, "").trim();
  if (!limpio) return null;
  const m = limpio.match(/^(-?[\d.,\s]+)\s*(k|mil|m|mm|millones|millón|millon)?$/);
  if (!m) return null;
  let cifra = (m[1] ?? "").replace(/\s/g, "");
  const tieneComa = cifra.includes(",");
  if (tieneComa) {
    cifra = cifra.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(cifra)) {
    cifra = cifra.replace(/\./g, "");
  } else if (m[2] === undefined && (cifra.match(/\./g) ?? []).length > 1) {
    cifra = cifra.replace(/\./g, "");
  }
  const base = Number(cifra);
  if (!Number.isFinite(base)) return null;
  const sufijo = m[2];
  const factor = sufijo === "k" || sufijo === "mil" ? 1e3 : sufijo === "mm" ? 1e9 : sufijo ? 1e6 : 1;
  return base * factor;
}
