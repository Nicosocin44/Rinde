import { d } from "@/lib/calculos/decimal";
import { sumarDias } from "@/lib/calculos/fechas";
import { COLUMNAS, fechaDe, numeroDe } from "../importar";
import type { ArchivoConvertido } from "./tipos";

/**
 * Los dos Excel que exporta Balanz, pasados a las filas de nuestra planilla (así la vista previa, los avisos y lo
 * repetido son los mismos que con la planilla). Lo que no se puede sumar queda como "omitida", con el motivo.
 *
 * - "Movimientos" (movimientos.xlsx): una fila por boleto, depósito, retiro o dividendo, de un período.
 * - "Mis Instrumentos" ([MisInstrumentos][…][AAAAMMDD]_[…].xlsx): lo que tenés hoy, con el precio promedio de compra.
 *
 * Formato leído de archivos reales de noviembre de 2026 (solo CEDEARs y acciones: el resto de los tipos todavía no se
 * lee, para no cargar mal un precio).
 */

const normal = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Los tipos de instrumento de Balanz que sabemos leer. */
const TIPOS: Record<string, "cedear" | "accion"> = { cedears: "cedear", cedear: "cedear", acciones: "accion", accion: "accion" };

/** "Pesos" → ARS; "Dólares", "Dólares C.V. 7000" (cable) → USD. */
const monedaDe = (texto: string): "ARS" | "USD" | null => (/^pesos/i.test(texto.trim()) ? "ARS" : /^d[oó]lares/i.test(texto.trim()) ? "USD" : null);

/** Un número para la planilla: con coma decimal y sin miles (así "1.125" no se lee como mil ciento veinticinco). */
const celdaNumero = (x: ReturnType<typeof d>) => x.toString().replace(".", ",");

const columnas = (encabezado: string[]) => {
  const indice = new Map(encabezado.map((c, i) => [normal(c), i]));
  return (fila: string[], nombre: string) => (fila[indice.get(normal(nombre)) ?? -1] ?? "").trim();
};

/** ¿Es un Excel de Balanz? Por los títulos de la primera fila. */
export function formatoBalanz(filas: string[][]): "movimientos" | "tenencia" | null {
  const titulos = new Set((filas[0] ?? []).map(normal));
  if (["descripcion", "ticker", "tipo de instrumento", "concertacion", "liquidacion", "importe"].every((t) => titulos.has(t))) return "movimientos";
  if (["ticker", "tipo de instrumento", "nominales", "precio promedio de compra", "dias promedio de tenencia"].every((t) => titulos.has(t))) return "tenencia";
  return null;
}

/** La fecha de la tenencia, del nombre del archivo ("…[20261125]_[223712hs].xlsx"). */
export function fechaDelNombre(nombre: string): string | null {
  const m = /\[(\d{4})(\d{2})(\d{2})\]/.exec(nombre);
  return m ? fechaDe(`${m[1]}-${m[2]}-${m[3]}`) : null;
}

/** Nota de las compras que salen de "Mis Instrumentos": de acá se sabe hasta qué fecha ya está contada la tenencia. */
export const notaTenencia = (fecha: string) => `Tenencia de Balanz al ${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}`;

/** La fecha más reciente de una tenencia de Balanz ya importada (por la nota), o null. */
export function tenenciaImportadaHasta(notas: (string | undefined)[]): string | null {
  const fechas = notas.flatMap((n) => {
    const m = /^Tenencia de Balanz al (\d{2}\/\d{2}\/\d{4})/.exec(n ?? "");
    const f = m ? fechaDe(m[1]!) : null;
    return f ? [f] : [];
  });
  return fechas.sort().at(-1) ?? null;
}

/**
 * "Mis Instrumentos": una compra por instrumento, por los nominales, al precio promedio de compra y con fecha = el día
 * de la tenencia menos los días promedio de tenencia. Es una aproximación (Balanz no da cada compra), y así se aclara
 * en la nota. `fecha` es el día de la tenencia.
 */
export function balanzTenencia(filas: string[][], fecha: string): ArchivoConvertido {
  const col = columnas(filas[0] ?? []);
  const salida: ArchivoConvertido = { filas: [COLUMNAS], origen: [], omitidas: [] };
  filas.slice(1).forEach((f, k) => {
    const n = k + 2;
    const ticker = col(f, "ticker").toUpperCase();
    const texto = ticker || col(f, "descripcion");
    const tipoTexto = col(f, "tipo de instrumento");
    const tipo = TIPOS[normal(tipoTexto)];
    const nominales = numeroDe(col(f, "nominales"));
    if (!tipo) return salida.omitidas.push({ n, texto, fecha: null, motivo: `Todavía no sabemos leer ${tipoTexto || "este tipo de instrumento"} de Balanz: cargalo con la planilla.` });
    if (!nominales || d(nominales).lte(0)) return salida.omitidas.push({ n, texto, fecha: null, motivo: "No tiene nominales." });
    const dias = Math.max(0, Math.round(Number(numeroDe(col(f, "dias promedio de tenencia")) ?? "0")));
    const compra = sumarDias(fecha, -dias);
    const moneda = monedaDe(col(f, "moneda")) ?? "ARS";
    const precio = numeroDe(col(f, "precio promedio de compra"));
    salida.filas.push([compra, "compra", col(f, "descripcion"), ticker, tipo, moneda, celdaNumero(d(nominales)), precio ? celdaNumero(d(precio)) : "", "", notaTenencia(fecha), "", ""]);
    salida.origen.push(n);
  });
  return salida;
}

/**
 * "Movimientos": las compras y ventas (boletos) de CEDEARs y acciones, con su comisión, y los dividendos en pesos. Lo
 * demás queda omitido, con el motivo:
 * - depósitos y retiros de la cuenta (la cartera suma lo que compraste, no el saldo en el broker);
 * - dividendos en dólares de CEDEARs (la cartera cuenta los CEDEARs en pesos) y los débitos en pesos que los acompañan;
 * - lo que ya está contado en una tenencia importada (`tenenciaHasta`: movimientos hasta ese día).
 */
export function balanzMovimientos(filas: string[][], tenenciaHasta: string | null): ArchivoConvertido {
  const col = columnas(filas[0] ?? []);
  const salida: ArchivoConvertido = { filas: [COLUMNAS], origen: [], omitidas: [] };
  filas.slice(1).forEach((f, k) => {
    const n = k + 2;
    const descripcion = col(f, "descripcion");
    const partes = descripcion.split("/").map((p) => p.trim());
    const clase = normal(partes[0] ?? "");
    const ticker = (col(f, "ticker") || (clase.startsWith("dividendo") ? (partes[1] ?? "") : "")).toUpperCase();
    const fecha = fechaDe(col(f, "concertacion"));
    const moneda = monedaDe(col(f, "moneda"));
    const importe = numeroDe(col(f, "importe"));
    const texto = ticker || partes[0] || descripcion;
    const omitir = (motivo: string) => salida.omitidas.push({ n, texto, fecha, motivo });

    if (clase === "recibo de cobro" || clase === "comprobante de pago") {
      return omitir(`${clase === "recibo de cobro" ? "Plata que entró a" : "Plata que salió de"} tu cuenta de Balanz: la cartera suma lo que compraste con ella, no el saldo.`);
    }
    if (fecha && tenenciaHasta && fecha <= tenenciaHasta) {
      return omitir(`Ya está contado en la tenencia de Balanz al ${tenenciaHasta.slice(8, 10)}/${tenenciaHasta.slice(5, 7)}.`);
    }
    if (clase.startsWith("dividendo")) {
      if (moneda === "USD") return omitir(`Dividendo en dólares de ${ticker}: la cartera cuenta los CEDEARs en pesos, así que no lo sumamos.`);
      if (!importe || d(importe).lte(0)) return omitir(`Débito en pesos del dividendo de ${ticker} (gastos o retención): no se suma.`);
      salida.filas.push([fecha ?? col(f, "concertacion"), "dividendo", "", ticker, TIPOS[normal(col(f, "tipo de instrumento"))] ?? "cedear", "ARS", celdaNumero(d(importe)), "", "", `Balanz · ${descripcion}`, "", ""]);
      salida.origen.push(n);
      return;
    }
    if (clase !== "boleto") return omitir(`Todavía no sabemos leer este movimiento de Balanz (${partes[0] || "sin descripción"}).`);

    const operacion = normal(partes[2] ?? "");
    const tipoTexto = col(f, "tipo de instrumento");
    const tipo = TIPOS[normal(tipoTexto)];
    if (operacion !== "compra" && operacion !== "venta") return omitir(`Todavía no sabemos leer esta operación de Balanz (${partes[2] || "sin tipo"}).`);
    if (!tipo) return omitir(`Todavía no sabemos leer ${tipoTexto || "este tipo de instrumento"} de Balanz: cargalo con la planilla.`);
    const cantidad = numeroDe(col(f, "cantidad"));
    const precio = numeroDe(col(f, "precio"));
    if (!cantidad || !precio) return omitir("Le falta la cantidad o el precio.");
    const nominales = d(cantidad).abs();
    // El importe trae la comisión y los derechos: en la compra se paga más, en la venta se cobra menos.
    const bruto = nominales.mul(precio);
    const comision = importe ? (operacion === "compra" ? d(importe).abs().minus(bruto) : bruto.minus(d(importe).abs())) : d(0);
    const numeroBoleto = partes[1] ? ` ${partes[1]}` : "";
    salida.filas.push([
      fecha ?? col(f, "concertacion"),
      operacion,
      "",
      ticker,
      tipo,
      moneda ?? "",
      celdaNumero(nominales),
      celdaNumero(d(precio)),
      comision.gt(0) ? celdaNumero(comision.toDecimalPlaces(2)) : "",
      `Balanz · boleto${numeroBoleto}`,
      "",
      "",
    ]);
    salida.origen.push(n);
  });
  return salida;
}
