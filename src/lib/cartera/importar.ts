import { d } from "@/lib/calculos/decimal";
import { precioCuenta, type Activo, type Moneda, type Movimiento, type TipoActivo, type TipoMovimiento } from "@/lib/calculos/cartera";
import { PROVEEDORES } from "@data/ar/proveedores";
import { esCuenta, idActivo, monedaDe, nombreConocido, vencimientoLecap } from "./activos";
import type { DatosCartera } from "./repositorio";

/**
 * Importar movimientos desde una planilla (CSV o Excel). Puro: recibe las filas ya leídas (texto) y devuelve, fila por
 * fila, qué entendimos y si está lista, tiene un aviso, ya estaba en la cartera o tiene un error. Nada se guarda acá:
 * el usuario ve la vista previa y confirma (ningún número sin que lo vea).
 */

export type Columna = "fecha" | "tipo_movimiento" | "activo" | "ticker" | "tipo_activo" | "moneda" | "cantidad" | "precio" | "comision" | "nota" | "tna" | "vencimiento";

/** Las columnas de la planilla, en el orden en que la exportamos. */
export const COLUMNAS: Columna[] = ["fecha", "tipo_movimiento", "activo", "ticker", "tipo_activo", "moneda", "cantidad", "precio", "comision", "nota", "tna", "vencimiento"];

/** minúsculas, sin tildes, espacios y guiones como "_". */
const normal = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s\-./]+/g, "_")
    .replace(/^_|_$/g, "");

const ALIAS: Record<string, Columna> = {};
const alias = (c: Columna, ...nombres: string[]) => [c, ...nombres].forEach((n) => (ALIAS[normal(n)] = c));
alias("fecha", "fecha de operacion", "fecha operacion", "fecha concertacion", "date");
alias("tipo_movimiento", "operacion", "movimiento", "tipo de operacion", "tipo de movimiento");
alias("activo", "nombre", "instrumento", "especie", "descripcion");
alias("ticker", "simbolo", "codigo");
alias("tipo_activo", "tipo", "tipo de activo", "clase");
alias("moneda");
alias("cantidad", "nominales", "unidades", "monto", "importe");
alias("precio", "precio unitario", "cotizacion");
alias("comision", "comisiones", "gastos", "aranceles");
alias("nota", "notas", "comentario", "observaciones");
alias("tna", "tasa");
alias("vencimiento", "fecha de vencimiento");

const MOVIMIENTOS: Record<string, TipoMovimiento> = {
  compra: "compra",
  suscripcion: "compra",
  venta: "venta",
  rescate: "venta",
  deposito: "deposito",
  ingreso: "deposito",
  retiro: "retiro",
  extraccion: "retiro",
  cupon: "cupon",
  renta: "cupon",
  amortizacion: "cupon",
  dividendo: "dividendo",
  interes: "interes",
  intereses: "interes",
};

const TIPOS: Record<string, TipoActivo> = {
  cedear: "cedear",
  cedears: "cedear",
  accion: "accion",
  acciones: "accion",
  bono: "bono",
  bonos: "bono",
  bono_en_usd: "bono",
  lecap: "lecap",
  lecaps: "lecap",
  letra: "lecap",
  on: "on",
  obligacion_negociable: "on",
  cripto: "cripto",
  criptomoneda: "cripto",
  fci: "fci",
  fondo: "fci",
  fondo_comun: "fci",
  billetera: "billetera",
  cuenta: "billetera",
  billetera_o_cuenta: "billetera",
  plazo_fijo: "plazo_fijo",
  efectivo_usd: "efectivo_usd",
  dolares: "efectivo_usd",
  usd: "efectivo_usd",
};

const MOV_CUENTA: TipoMovimiento[] = ["deposito", "retiro", "interes"];
const MOV_INSTRUMENTO: TipoMovimiento[] = ["compra", "venta", "cupon", "dividendo", "interes"];
const COBROS: TipoMovimiento[] = ["cupon", "dividendo", "interes"];

const NOMBRE_TIPO: Record<TipoActivo, string> = {
  billetera: "las billeteras",
  plazo_fijo: "los plazos fijos",
  fci: "los fondos",
  lecap: "las LECAPs",
  bono: "los bonos",
  on: "las ON",
  cedear: "los CEDEARs",
  accion: "las acciones",
  cripto: "las cripto",
  efectivo_usd: "los dólares",
};

// ───────────────────────── Lectura de texto ─────────────────────────

/** CSV a filas. Detecta el separador (";" de Excel en castellano, "," o tabulación) y respeta las comillas. */
export function leerCsv(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "");
  const lineas = limpio.split(/\r?\n/);
  // Excel pone "sep=;" en la primera línea a veces.
  const indicado = /^sep=(.)\s*$/i.exec(lineas[0] ?? "");
  const cuerpo = indicado ? lineas.slice(1).join("\n") : limpio;
  const muestra = cuerpo.split(/\r?\n/).slice(0, 5).join("\n");
  const sep = indicado?.[1] ?? ([";", "\t", ","] as const).map((c) => [c, muestra.split(c).length] as const).sort((a, b) => b[1] - a[1])[0]![0];

  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;
  for (let i = 0; i < cuerpo.length; i++) {
    const c = cuerpo[i]!;
    if (comillas) {
      if (c === '"' && cuerpo[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (c === '"') comillas = false;
      else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) {
      fila.push(celda);
      celda = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && cuerpo[i + 1] === "\n") i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else celda += c;
  }
  if (celda !== "" || fila.length) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((x) => x.trim() !== ""));
}

/**
 * "1.234.567,89" → "1234567.89"; "1234,5" → "1234.5"; "0.005" → "0.005"; "$ 18.500" → "18500"; "62.5" → "62.5".
 * Con coma, es formato argentino (punto de miles). Sin coma, el punto es decimal, salvo que sean varios o uno solo
 * seguido de tres cifras ("18.500"). La vista previa muestra lo que se leyó. null si no es un número.
 */
export function numeroDe(texto: string): string | null {
  // La moneda escrita al lado del número ("$400 USD", "2.000 ARS") no cuenta.
  let s = texto.replace(/\b(USD|ARS|USDT|USDC|DOLARES|PESOS)\b/gi, "").replace(/US\$|U\$S|U\$D|\$|%|\s/gi, "");
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  // Varios puntos, o uno solo seguido de tres cifras ("18.500"), son de miles: así se escribe en la Argentina.
  else if ((s.match(/\./g) ?? []).length > 1 || /^-?[1-9]\d{0,2}\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return d(s).toString();
}

/** "10/03/2026", "10-3-26" o "2026-03-10" → "2026-03-10". null si no es una fecha válida. */
export function fechaDe(texto: string): string | null {
  const s = texto.trim();
  let a: number, m: number, dia: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  const ar = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/.exec(s);
  if (iso) [a, m, dia] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (ar) [dia, m, a] = [Number(ar[1]), Number(ar[2]), ar[3]!.length === 2 ? 2000 + Number(ar[3]) : Number(ar[3])];
  else return null;
  const f = new Date(Date.UTC(a, m - 1, dia));
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== dia) return null;
  return f.toISOString().slice(0, 10);
}

// ───────────────────────── Interpretación ─────────────────────────

/** "omitida": una fila del archivo de un broker que no se suma (un depósito, un dividendo en dólares…), con el motivo. */
export type EstadoFila = "lista" | "aviso" | "repetida" | "ejemplo" | "error" | "omitida";

export type FilaImportada = {
  /** Número de fila en el archivo (la primera es 1), para que el usuario la encuentre. */
  n: number;
  estado: EstadoFila;
  /** Por qué no está lista (o qué conviene revisar). */
  motivos: string[];
  fecha: string | null;
  tipo: TipoMovimiento | null;
  activo: Activo | null;
  movimiento: Movimiento | null;
  /** Para mostrar: el monto (cuentas y cobros) o cantidad y precio. */
  monto: string | null;
  cantidad: string | null;
  precio: string | null;
  /** Lo que dice el archivo del activo (ticker o nombre), para reconocer la fila aunque tenga errores. */
  texto: string;
  /** El archivo de donde salió, cuando se suben varios a la vez. */
  archivo?: string;
};

export type Importacion =
  | { ok: false; error: string }
  | { ok: true; filas: FilaImportada[]; /** Activos nuevos que usan las filas (los que ya existen no se tocan). */ activos: Activo[] };

/** Clave para reconocer un movimiento que ya está en la cartera: activo, fecha, tipo e importe. */
const clave = (m: Pick<Movimiento, "activoId" | "fecha" | "tipo" | "cantidad" | "precio">) => [m.activoId, m.fecha, m.tipo, d(m.cantidad).mul(m.precio).toDecimalPlaces(2).toString()].join("|");

/**
 * Interpreta las filas de una planilla. `filas` es lo que se leyó del archivo (texto por celda); `cartera` es la de hoy
 * (para reusar sus activos y marcar lo repetido); `hoy` en "AAAA-MM-DD"; `nuevoId` genera los ids de los movimientos.
 */
export function interpretarPlanilla(filas: string[][], cartera: Pick<DatosCartera, "activos" | "movimientos">, hoy: string, nuevoId: () => string): Importacion {
  // El encabezado: la primera fila (de las 10 primeras) donde se reconocen al menos tres columnas.
  const inicio = filas.slice(0, 10).findIndex((f) => f.filter((c) => ALIAS[normal(c)]).length >= 3);
  if (inicio < 0) return { ok: false, error: "No encontramos los títulos de las columnas (fecha, tipo_movimiento, tipo_activo, cantidad…). Bajá la planilla modelo y copiá tus datos ahí." };
  const indice = new Map<Columna, number>();
  filas[inicio]!.forEach((c, i) => {
    const col = ALIAS[normal(c)];
    if (col && !indice.has(col)) indice.set(col, i);
  });
  const faltan = (["fecha", "tipo_movimiento", "tipo_activo", "cantidad"] as Columna[]).filter((c) => !indice.has(c));
  if (!indice.has("ticker") && !indice.has("activo")) faltan.push("ticker");
  if (faltan.length) return { ok: false, error: `Faltan columnas: ${faltan.join(", ")}. Bajá la planilla modelo para ver cómo va.` };

  const existentes = new Map(cartera.activos.map((a) => [a.id, a]));
  const nuevos = new Map<string, Activo>();
  const yaEstan = new Set(cartera.movimientos.map(clave));
  const proveedores = new Map(PROVEEDORES.map((p) => [p.nombre.toLowerCase(), p.id]));

  const salida: FilaImportada[] = filas.slice(inicio + 1).map((f, k) => {
    const n = inicio + k + 2;
    const celda = (c: Columna) => (indice.has(c) ? (f[indice.get(c)!] ?? "").trim() : "");
    const errores: string[] = [];
    const avisos: string[] = [];
    const fila: FilaImportada = { n, estado: "lista", motivos: [], fecha: null, tipo: null, activo: null, movimiento: null, monto: null, cantidad: null, precio: null, texto: [celda("activo"), celda("ticker")].filter(Boolean).join(" ") };

    const fecha = fechaDe(celda("fecha"));
    if (!fecha) errores.push(celda("fecha") ? `La fecha "${celda("fecha")}" no se entiende (usá 10/03/2026).` : "Falta la fecha.");
    else if (fecha > hoy) errores.push("La fecha es futura.");
    else if (fecha < "1990-01-01") errores.push("La fecha es demasiado vieja.");
    fila.fecha = fecha;

    const tipoActivo = TIPOS[normal(celda("tipo_activo"))];
    if (!tipoActivo) errores.push(celda("tipo_activo") ? `"${celda("tipo_activo")}" no es un tipo de activo que conozcamos (cedear, accion, bono, lecap, cripto, billetera, plazo_fijo, dolares…).` : "Falta el tipo de activo.");
    const tipo = MOVIMIENTOS[normal(celda("tipo_movimiento"))] ?? null;
    if (!tipo) errores.push(celda("tipo_movimiento") ? `"${celda("tipo_movimiento")}" no es un movimiento que conozcamos (compra, venta, deposito, retiro, cupon, dividendo, interes).` : "Falta el tipo de movimiento.");
    fila.tipo = tipo;

    const cantidad = numeroDe(celda("cantidad"));
    const precio = celda("precio") ? numeroDe(celda("precio")) : null;
    const comision = celda("comision") ? numeroDe(celda("comision")) : null;
    if (!cantidad) errores.push(celda("cantidad") ? `La cantidad "${celda("cantidad")}" no es un número.` : "Falta la cantidad (o el monto).");
    else if (d(cantidad).lte(0)) errores.push("La cantidad tiene que ser mayor a cero.");
    if (celda("precio") && (!precio || d(precio).lte(0))) errores.push(`El precio "${celda("precio")}" no es un número mayor a cero.`);
    if (celda("comision") && (!comision || d(comision).lt(0))) errores.push(`La comisión "${celda("comision")}" no es un número.`);

    if (tipoActivo && tipo) {
      const cuenta = esCuenta(tipoActivo);
      if (cuenta && !MOV_CUENTA.includes(tipo)) errores.push(`En ${NOMBRE_TIPO[tipoActivo]} el movimiento es deposito, retiro o interes (no ${tipo}).`);
      if (!cuenta && !MOV_INSTRUMENTO.includes(tipo)) errores.push(`En ${NOMBRE_TIPO[tipoActivo]} el movimiento es compra, venta, cupon, dividendo o interes (no ${tipo}).`);
      const moneda = celda("moneda").toUpperCase().replace(/[^A-Z]/g, "");
      const esperada: Moneda = monedaDe(tipoActivo);
      if (moneda && (moneda === "USD" || moneda === "ARS" || moneda === "PESOS" || moneda === "DOLARES") && (moneda === "PESOS" ? "ARS" : moneda === "DOLARES" ? "USD" : moneda) !== esperada) {
        // Una acción en dólares suele ser una acción de EE.UU. (MSFT a USD 400): solo llevamos lo que se opera acá.
        if (tipoActivo === "accion" || tipoActivo === "cedear") {
          errores.push("Está en dólares: la cartera lleva CEDEARs y acciones argentinas, en pesos (las acciones de EE.UU. no las llevamos). Si es un CEDEAR, cargá el precio en pesos.");
        } else errores.push(`En ${NOMBRE_TIPO[tipoActivo]} los montos van en ${esperada === "ARS" ? "pesos" : "dólares"}.`);
      }

      const ticker = celda("ticker").toUpperCase();
      let nombre = celda("activo");
      if (!cuenta && !/^[A-Z0-9.]{1,12}$/.test(ticker)) errores.push(ticker ? `El ticker "${celda("ticker")}" no parece válido.` : "Falta el ticker (por ejemplo, AAPL).");
      if (tipoActivo === "plazo_fijo") nombre = nombre.replace(/^plazo fijo\s*/i, "");
      if ((tipoActivo === "billetera" || tipoActivo === "plazo_fijo") && !nombre) errores.push(tipoActivo === "plazo_fijo" ? "Falta el banco del plazo fijo (columna activo)." : "Falta el nombre de la billetera o cuenta (columna activo).");
      if (!cuenta && !COBROS.includes(tipo) && !precio) errores.push("Falta el precio al que operaste.");

      if (!errores.length && fecha && cantidad) {
        const id = idActivo(tipoActivo, cuenta ? nombre || "Dólares ahorrados" : ticker, fecha);
        let activo = existentes.get(id) ?? nuevos.get(id);
        if (!activo) {
          const conocido = cuenta ? null : nombreConocido(tipoActivo, ticker);
          if (!cuenta && !conocido && tipoActivo !== "cripto") avisos.push(`No encontramos ${ticker} en nuestra lista: lo valuamos al precio que cargaste.`);
          const tnaTexto = celda("tna") ? numeroDe(celda("tna")) : null;
          const tna = tnaTexto ? (d(tnaTexto).gt(1) ? d(tnaTexto).div(100).toNumber() : d(tnaTexto).toNumber()) : undefined;
          if ((tipoActivo === "billetera" || tipoActivo === "plazo_fijo") && tna === undefined) avisos.push("Sin TNA: no le sumamos intereses.");
          const vencimiento = tipoActivo === "lecap" ? vencimientoLecap(ticker) : tipoActivo === "plazo_fijo" ? (fechaDe(celda("vencimiento")) ?? undefined) : undefined;
          if (tipoActivo === "plazo_fijo" && !vencimiento) avisos.push("Sin vencimiento: le sumamos intereses hasta hoy.");
          activo = {
            id,
            tipo: tipoActivo,
            nombre: cuenta ? (tipoActivo === "plazo_fijo" ? `Plazo fijo ${nombre}` : nombre || "Dólares") : (conocido ?? (nombre || ticker)),
            ticker: cuenta ? undefined : ticker,
            moneda: monedaDe(tipoActivo),
            proveedorId: cuenta ? proveedores.get(nombre.toLowerCase()) : undefined,
            ...(tipoActivo === "billetera" || tipoActivo === "plazo_fijo" ? { tna, inicio: fecha } : {}),
            ...(vencimiento ? { vencimiento } : {}),
          };
          nuevos.set(id, activo);
        }
        fila.activo = activo;

        // Cuentas y cobros: la cantidad es el monto (si viene un precio, como en lo que exportamos, monto = cantidad × precio).
        if (cuenta || COBROS.includes(tipo)) {
          const monto = d(cantidad).mul(precio ?? "1");
          const p = cuenta ? precioCuenta(activo, fecha) : d(1);
          fila.monto = monto.toDecimalPlaces(2).toString();
          fila.movimiento = { id: nuevoId(), activoId: id, fecha, tipo, cantidad: monto.div(p).toString(), precio: p.toString(), ...(comision && d(comision).gt(0) ? { comision } : {}) };
        } else {
          fila.cantidad = cantidad;
          fila.precio = precio;
          fila.movimiento = { id: nuevoId(), activoId: id, fecha, tipo, cantidad, precio: precio!, ...(comision && d(comision).gt(0) ? { comision } : {}) };
        }
        const nota = celda("nota");
        if (nota && !/^ejemplo/i.test(nota)) fila.movimiento.nota = nota;
      }
    }

    fila.motivos = errores.length ? errores : avisos;
    if (errores.length) fila.estado = "error";
    else if (/^ejemplo/i.test(celda("nota"))) {
      fila.estado = "ejemplo";
      fila.motivos = ["Es una fila de ejemplo de la planilla modelo."];
    } else if (fila.movimiento && yaEstan.has(clave(fila.movimiento))) {
      fila.estado = "repetida";
      fila.motivos = ["Ya está en tu cartera."];
    } else if (avisos.length) fila.estado = "aviso";
    return fila;
  });

  if (!salida.length) return { ok: false, error: "La planilla tiene los títulos pero no tiene movimientos." };
  const usados = new Set(salida.filter((f) => f.estado === "lista" || f.estado === "aviso").map((f) => f.activo!.id));
  return { ok: true, filas: salida, activos: [...nuevos.values()].filter((a) => usados.has(a.id)) };
}

// ───────────────────────── Planilla modelo ─────────────────────────

/** La planilla para completar: los títulos y una fila de ejemplo por tipo (se reconocen y no se importan). */
export function planillaModelo(): string {
  const filas = [
    COLUMNAS,
    ["10/03/2026", "compra", "Apple", "AAPL", "cedear", "ARS", "10", "18500", "150", "Ejemplo: borrá esta fila", "", ""],
    ["02/04/2026", "compra", "Bonar 2030", "AL30", "bono", "USD", "1000", "62,5", "", "Ejemplo: el precio de los bonos va por cada 100 nominales", "", ""],
    ["15/05/2026", "deposito", "Mercado Pago", "", "billetera", "ARS", "500000", "", "", "Ejemplo: en billeteras, cantidad es el monto", "30", ""],
    ["01/06/2026", "deposito", "Galicia", "", "plazo_fijo", "ARS", "1000000", "", "", "Ejemplo: TNA en % y fecha de vencimiento", "35", "01/07/2026"],
    ["20/06/2026", "compra", "Bitcoin", "BTC", "cripto", "USD", "0,005", "65000", "", "Ejemplo: borrá esta fila", "", ""],
  ];
  return "\uFEFF" + filas.map((f) => f.map((c) => (/[";\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(";")).join("\r\n") + "\r\n";
}

// ───────────────────────── Excel ─────────────────────────

/**
 * Las celdas de una hoja de Excel (como las devuelve read-excel-file) a texto, en el mismo formato que un CSV argentino:
 * las fechas como "AAAA-MM-DD" y los números con coma decimal (así "1.234" de una celda numérica no se lee como miles).
 */
export function filasDeExcel(filas: readonly (readonly unknown[])[]): string[][] {
  return filas
    .map((f) =>
      f.map((c) => {
        if (c === null || c === undefined) return "";
        if (c instanceof Date) return Number.isNaN(c.getTime()) ? "" : c.toISOString().slice(0, 10);
        if (typeof c === "number") return Number.isFinite(c) ? String(c).replace(".", ",") : "";
        return String(c);
      }),
    )
    .filter((f) => f.some((x) => x.trim() !== ""));
}
