import type { TipoMovimiento } from "@/lib/calculos/cartera";
import { d } from "@/lib/calculos/decimal";
import { COLUMNAS, fechaDe, numeroDe } from "../importar";
import { nombreConocido } from "../activos";
import type { ArchivoConvertido } from "./tipos";

/**
 * Cualquier archivo de un broker argentino, con las columnas que indica el usuario (o que adivinamos por el título). Se
 * pasa a las filas de nuestra planilla, así la vista previa, los avisos y lo repetido son los mismos que siempre. Lo
 * que no se puede sumar queda como "omitida", con el motivo. Puro: el mapeo lo guarda la pantalla.
 */

export type Campo = "fecha" | "operacion" | "ticker" | "cantidad" | "precio" | "importe" | "comision" | "tipo_activo" | "moneda";
export type Destino = TipoMovimiento | "omitir";
export type TipoPorDefecto = "cedear" | "accion" | "omitir";

export type Mapeo = {
  /** Índice de la fila con los títulos. */
  encabezado: number;
  columnas: Partial<Record<Campo, number>>;
  /** Valor de la columna de operación (normalizado con `claveOperacion`) → qué es. */
  operaciones: Record<string, Destino>;
  /** Qué hacer con un ticker que no reconocemos, si el archivo no dice el tipo. */
  tipoPorDefecto: TipoPorDefecto;
};

export const CAMPOS: { id: Campo; etiqueta: string; ayuda: string; obligatorio: boolean }[] = [
  { id: "fecha", etiqueta: "Fecha", ayuda: "De la operación (concertación)", obligatorio: true },
  { id: "operacion", etiqueta: "Operación", ayuda: "Compra, venta, dividendo…", obligatorio: true },
  { id: "ticker", etiqueta: "Ticker", ayuda: "AAPL, GGAL, S31O6…", obligatorio: true },
  { id: "cantidad", etiqueta: "Cantidad", ayuda: "Nominales o unidades", obligatorio: true },
  { id: "precio", etiqueta: "Precio", ayuda: "Si falta, sale del importe", obligatorio: false },
  { id: "importe", etiqueta: "Importe", ayuda: "Total de la operación", obligatorio: false },
  { id: "comision", etiqueta: "Comisión", ayuda: "Opcional", obligatorio: false },
  { id: "tipo_activo", etiqueta: "Tipo de activo", ayuda: "Opcional: si falta, sale del ticker", obligatorio: false },
  { id: "moneda", etiqueta: "Moneda", ayuda: "Opcional", obligatorio: false },
];

export const DESTINOS: { valor: Destino; etiqueta: string }[] = [
  { valor: "compra", etiqueta: "Compra" },
  { valor: "venta", etiqueta: "Venta" },
  { valor: "dividendo", etiqueta: "Dividendo" },
  { valor: "cupon", etiqueta: "Renta o amortización" },
  { valor: "omitir", etiqueta: "No sumar" },
];

const normal = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");

/** Títulos que reconocemos, del más claro al más dudoso. */
const ALIAS: Record<Campo, string[]> = {
  fecha: ["fecha concertacion", "fecha de concertacion", "concertacion", "fecha operacion", "fecha de operacion", "fecha", "date"],
  operacion: ["tipo de operacion", "tipo operacion", "operacion", "tipo de movimiento", "tipo movimiento", "movimiento", "descripcion", "concepto", "tipo"],
  ticker: ["ticker", "simbolo", "especie", "codigo", "instrumento", "activo", "symbol"],
  cantidad: ["cantidad", "nominales", "valor nominal", "cantidad vn", "vn", "unidades", "cant"],
  precio: ["precio", "precio unitario", "cotizacion", "precio operado"],
  importe: ["importe neto", "importe", "monto neto", "monto", "total", "neto"],
  comision: ["comision", "comisiones", "arancel", "aranceles", "gastos"],
  tipo_activo: ["tipo de instrumento", "tipo instrumento", "tipo de activo", "tipo activo", "clase"],
  moneda: ["moneda", "divisa"],
};

/** La fila de títulos: de las 15 primeras, la que tiene más celdas con texto (no números ni fechas), al menos 3. */
export function encontrarEncabezado(filas: string[][]): number {
  let mejor = -1;
  let puntaje = 2;
  filas.slice(0, 15).forEach((f, i) => {
    const texto = f.filter((c) => c.trim() && numeroDe(c) === null && fechaDe(c.trim().slice(0, 10)) === null).length;
    if (texto > puntaje) {
      mejor = i;
      puntaje = texto;
    }
  });
  return mejor;
}

/** Para recordar el mapeo de un archivo: sus títulos, normalizados. */
export function firmaColumnas(filas: string[][], encabezado: number): string {
  return (filas[encabezado] ?? []).map(normal).join("|");
}

/**
 * "Boleto / 10000001 / COMPRA / 1 / NVDA" y "Boleto / 10000002 / COMPRA / 1 / AAPL" valen lo mismo: sin números y sin el
 * ticker de esa fila (si la descripción lo repite).
 */
export function claveOperacion(valor: string, ticker = ""): string {
  const t = normal(ticker);
  let v = normal(valor);
  if (/^[a-z0-9.]{1,12}$/.test(t)) v = v.split(/[^a-z0-9.ñ]+/).filter((p) => p !== t).join(" ");
  return v
    .replace(/\d+([.,]\d+)?/g, " ")
    .replace(/[^a-zñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lo que adivinamos de una operación por su texto, o null si no sabemos. */
export function adivinarOperacion(valor: string): Destino | null {
  const v = normal(valor);
  if (/compra|suscrip|\bbuy\b/.test(v)) return "compra";
  if (/venta|rescate|\bsell\b/.test(v)) return "venta";
  if (/dividend/.test(v)) return "dividendo";
  if (/renta|cupon|amortiz|interes/.test(v)) return "cupon";
  if (/deposit|ingreso|retiro|extracc|transferencia|recibo de cobro|comprobante de pago|caucion|impuesto|percepcion|retencion|gasto|arancel|comision|derecho|iva|debito|credito/.test(v)) return "omitir";
  return null;
}

/** Los valores distintos de la columna de operación (agrupados con `claveOperacion`), con un ejemplo y cuántas filas hay. */
export function valoresDeOperacion(filas: string[][], mapeo: Pick<Mapeo, "encabezado" | "columnas">): { clave: string; ejemplo: string; filas: number }[] {
  const col = mapeo.columnas.operacion;
  if (col === undefined) return [];
  const grupos = new Map<string, { ejemplo: string; filas: number }>();
  const colTicker = mapeo.columnas.ticker;
  for (const f of filas.slice(mapeo.encabezado + 1)) {
    const valor = (f[col] ?? "").trim();
    if (!valor) continue;
    const clave = claveOperacion(valor, colTicker !== undefined ? (f[colTicker] ?? "") : "");
    const g = grupos.get(clave);
    if (g) g.filas++;
    else grupos.set(clave, { ejemplo: valor, filas: 1 });
  }
  return [...grupos.entries()].map(([clave, g]) => ({ clave, ...g })).sort((a, b) => b.filas - a.filas);
}

/** Adivina el mapeo por los títulos de las columnas (cada columna se usa una sola vez) y las operaciones por su texto. */
export function adivinarMapeo(filas: string[][]): Mapeo {
  const encabezado = Math.max(0, encontrarEncabezado(filas));
  const titulos = (filas[encabezado] ?? []).map(normal);
  const columnas: Mapeo["columnas"] = {};
  const usadas = new Set<number>();
  // Primero los títulos exactos de todos los campos, después los que contienen el alias.
  for (const exacto of [true, false]) {
    for (const campo of Object.keys(ALIAS) as Campo[]) {
      if (columnas[campo] !== undefined) continue;
      for (const alias of ALIAS[campo]) {
        const i = titulos.findIndex((t, j) => !usadas.has(j) && (exacto ? t === alias : t.includes(alias)));
        if (i >= 0) {
          columnas[campo] = i;
          usadas.add(i);
          break;
        }
      }
    }
  }
  const mapeo: Mapeo = { encabezado, columnas, operaciones: {}, tipoPorDefecto: "omitir" };
  for (const v of valoresDeOperacion(filas, mapeo)) mapeo.operaciones[v.clave] = adivinarOperacion(v.ejemplo) ?? "omitir";
  return mapeo;
}

/** Los campos obligatorios que faltan (y precio o importe, uno de los dos). */
export function camposQueFaltan(mapeo: Pick<Mapeo, "columnas">): Campo[] {
  const faltan = CAMPOS.filter((c) => c.obligatorio && mapeo.columnas[c.id] === undefined).map((c) => c.id);
  if (mapeo.columnas.precio === undefined && mapeo.columnas.importe === undefined) faltan.push("precio");
  return faltan;
}

const TIPOS_TEXTO: [RegExp, "cedear" | "accion" | "lecap" | "bono" | "on" | null][] = [
  [/cedear/, "cedear"],
  [/accion|acciones|equity/, "accion"],
  [/letra|lecap|boncap/, "lecap"],
  [/obligacion|\bon\b|\bons\b/, "on"],
  [/bono|titulo|renta fija/, "bono"],
  [/fondo|fci/, null],
];

/** El ticker de una celda: "NVDA", "NVDA - CEDEAR NVIDIA" o "Cedear Apple (AAPL)". */
export function tickerDe(texto: string): string | null {
  const t = texto.trim().toUpperCase();
  if (/^[A-Z0-9.]{1,12}$/.test(t)) return t;
  const parentesis = /\(([A-Z0-9.]{1,12})\)/.exec(t);
  if (parentesis) return parentesis[1]!;
  const primero = /^([A-Z0-9.]{1,12})\b/.exec(t);
  return primero ? primero[1]! : null;
}

/** El tipo por el ticker, entre los que conocemos (acciones del panel, CEDEARs y LECAPs). Los bonos no: su precio en pesos o dólares confunde. */
export function tipoPorTicker(ticker: string): "accion" | "cedear" | "lecap" | null {
  for (const tipo of ["accion", "cedear", "lecap"] as const) if (nombreConocido(tipo, ticker)) return tipo;
  return null;
}

const monedaDe = (texto: string): "ARS" | "USD" | "" => {
  const v = normal(texto);
  if (!v) return "";
  if (/dolar|usd|u\$s|us\$|mep|cable|ccl/.test(v)) return "USD";
  if (/peso|ars|^\$$/.test(v)) return "ARS";
  return "";
};

const celdaNumero = (x: ReturnType<typeof d>) => x.toString().replace(".", ",");

/** Aplica el mapeo: las filas de nuestra planilla y las omitidas. `broker` va en la nota de cada movimiento. */
export function aplicarMapeo(filas: string[][], mapeo: Mapeo, broker: string): ArchivoConvertido {
  const salida: ArchivoConvertido = { filas: [COLUMNAS], origen: [], omitidas: [] };
  const celda = (f: string[], campo: Campo) => (mapeo.columnas[campo] !== undefined ? (f[mapeo.columnas[campo]!] ?? "").trim() : "");
  const numero = (f: string[], campo: Campo) => {
    const n = numeroDe(celda(f, campo));
    return n === null ? null : d(n);
  };

  filas.slice(mapeo.encabezado + 1).forEach((f, k) => {
    const n = mapeo.encabezado + k + 2;
    if (!f.some((c) => c.trim())) return;
    const textoOperacion = celda(f, "operacion");
    const ticker = tickerDe(celda(f, "ticker"));
    const fecha = fechaDe(celda(f, "fecha").slice(0, 10));
    const texto = ticker ?? (textoOperacion || f.find((c) => c.trim())?.trim() || `Fila ${n}`);
    const omitir = (motivo: string) => salida.omitidas.push({ n, texto, fecha, motivo });

    // Sin fecha ni ticker es un total o un subtítulo; con ticker, una fecha que no se entiende.
    if (!fecha) return omitir(ticker && celda(f, "fecha") ? `La fecha "${celda(f, "fecha")}" no se entiende.` : "No parece un movimiento: no tiene fecha.");
    const destino = mapeo.operaciones[claveOperacion(textoOperacion, celda(f, "ticker"))] ?? adivinarOperacion(textoOperacion) ?? "omitir";
    if (destino === "omitir") return omitir(textoOperacion ? `"${textoOperacion}": elegiste no sumarlo (o no sabemos qué es).` : "No dice qué operación es.");
    if (!ticker) return omitir("No tiene ticker.");

    // El tipo: la columna, si la hay y se entiende; si no, el ticker; si no, lo que se eligió para los que no conocemos.
    const textoTipo = normal(celda(f, "tipo_activo"));
    const porTexto = textoTipo ? TIPOS_TEXTO.find(([re]) => re.test(textoTipo)) : undefined;
    if (porTexto && porTexto[1] === null) return omitir("Los fondos todavía no se leen de un broker: cargalos con la planilla.");
    const tipo = porTexto?.[1] ?? tipoPorTicker(ticker) ?? (mapeo.tipoPorDefecto === "omitir" ? null : mapeo.tipoPorDefecto);
    if (!tipo) return omitir(`No reconocemos ${ticker}: elegí qué tipo de activo es o cargalo con la planilla.`);

    const cantidad = numero(f, "cantidad")?.abs() ?? null;
    const importe = numero(f, "importe")?.abs() ?? null;
    const precioColumna = numero(f, "precio")?.abs() ?? null;
    const comisionColumna = numero(f, "comision")?.abs() ?? null;
    const moneda = monedaDe(celda(f, "moneda"));
    const nota = `${broker} · fila ${n}`;

    if (destino === "dividendo" || destino === "cupon") {
      const monto = importe ?? (cantidad && precioColumna ? cantidad.mul(precioColumna) : cantidad);
      if (!monto || monto.lte(0)) return omitir("No tiene importe.");
      salida.filas.push([fecha, destino, "", ticker, tipo, moneda, celdaNumero(monto), "", "", nota, "", ""]);
      salida.origen.push(n);
      return;
    }

    if (!cantidad || cantidad.lte(0)) return omitir("No tiene cantidad.");
    const precio = precioColumna && precioColumna.gt(0) ? precioColumna : importe ? importe.div(cantidad) : null;
    if (!precio || precio.lte(0)) return omitir("No tiene precio ni importe.");
    // Sin columna de comisión, sale de la diferencia entre el importe y cantidad × precio (si es chica: hasta 5 %).
    const bruto = cantidad.mul(precio);
    const diferencia = importe && precioColumna ? (destino === "compra" ? importe.minus(bruto) : bruto.minus(importe)) : null;
    const comision = comisionColumna ?? (diferencia && diferencia.gt(0) && diferencia.lte(bruto.mul(0.05)) ? diferencia.toDecimalPlaces(2) : null);
    salida.filas.push([fecha, destino, "", ticker, tipo, moneda, celdaNumero(cantidad), celdaNumero(precio.toDecimalPlaces(6)), comision && comision.gt(0) ? celdaNumero(comision) : "", nota, "", ""]);
    salida.origen.push(n);
  });
  return salida;
}
