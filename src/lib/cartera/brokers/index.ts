import type { Activo, Movimiento } from "@/lib/calculos/cartera";
import { d } from "@/lib/calculos/decimal";
import { interpretarPlanilla, type FilaImportada, type Importacion } from "../importar";
import type { DatosCartera } from "../repositorio";
import { balanzMovimientos, balanzTenencia, fechaDelNombre, formatoBalanz, tenenciaImportadaHasta } from "./balanz";
import { aplicarMapeo, type Mapeo } from "./columnas";
import type { Omitida } from "./tipos";

/**
 * Importar uno o varios archivos a la vez: nuestra planilla, lo que exporta Balanz (que se reconoce por los títulos de
 * las columnas) o el archivo de cualquier broker argentino con un `mapeo` de columnas que indica el usuario. Puro, como
 * `interpretarPlanilla`: nada se guarda acá.
 */

export type Formato = "planilla" | "balanz-movimientos" | "balanz-tenencia" | "columnas";

export function detectarFormato(filas: string[][]): Formato {
  const balanz = formatoBalanz(filas);
  return balanz === "movimientos" ? "balanz-movimientos" : balanz === "tenencia" ? "balanz-tenencia" : "planilla";
}

/** `mapeo`: las columnas que indicó el usuario, para un archivo que no es nuestra planilla ni de Balanz. `broker`: para la nota. */
export type ArchivoLeido = { nombre: string; filas: string[][]; mapeo?: Mapeo; broker?: string };

/**
 * ¿Hay que preguntar qué es cada columna? Sí, si no es de Balanz y no se reconoce como nuestra planilla (no encontramos
 * sus títulos, o faltan columnas).
 */
export function necesitaMapeo(filas: string[][]): boolean {
  return detectarFormato(filas) === "planilla" && !interpretarPlanilla(filas, { activos: [], movimientos: [] }, "2100-01-01", () => "x").ok;
}

export type ImportacionArchivos =
  | { ok: false; error: string }
  | { ok: true; filas: FilaImportada[]; activos: Activo[]; formatos: { nombre: string; formato: Formato }[] };

const omitida = (o: Omitida, archivo: string): FilaImportada => ({
  n: o.n,
  estado: "omitida",
  motivos: [o.motivo],
  fecha: o.fecha,
  tipo: null,
  activo: null,
  movimiento: null,
  monto: null,
  cantidad: null,
  precio: null,
  texto: o.texto,
  archivo,
});

/**
 * Una venta de más de lo que hay en la cartera (contando lo anterior y lo del archivo, en orden de fecha) se marca para
 * revisar: pasa cuando se suben solo los movimientos de un período y lo vendido se compró antes.
 */
function avisarVentasDeMas(filas: FilaImportada[], previos: Movimiento[], consejo: string) {
  const tenencia = new Map<string, ReturnType<typeof d>>();
  const sumar = (id: string, q: ReturnType<typeof d>) => tenencia.set(id, (tenencia.get(id) ?? d(0)).plus(q));
  for (const m of previos) {
    if (m.tipo === "compra") sumar(m.activoId, d(m.cantidad));
    else if (m.tipo === "venta") sumar(m.activoId, d(m.cantidad).neg());
  }
  const ordenadas = filas
    .filter((f) => f.movimiento && (f.estado === "lista" || f.estado === "aviso"))
    .sort((x, y) => x.fecha!.localeCompare(y.fecha!) || Number(x.tipo === "venta") - Number(y.tipo === "venta"));
  for (const f of ordenadas) {
    const m = f.movimiento!;
    if (m.tipo === "compra") sumar(m.activoId, d(m.cantidad));
    if (m.tipo !== "venta") continue;
    sumar(m.activoId, d(m.cantidad).neg());
    if (tenencia.get(m.activoId)!.lt(0)) {
      f.estado = "aviso";
      f.motivos = [...f.motivos, `Vendés más ${f.activo?.ticker ?? f.texto} de lo que hay en tu cartera: si lo compraste antes de este archivo, ${consejo}`];
    }
  }
}

/**
 * Interpreta los archivos en orden: primero las tenencias (su fecha marca qué movimientos ya están contados), después el
 * resto. Cada archivo ve los activos y movimientos que dejaron los anteriores, así lo repetido entre archivos también se
 * marca.
 */
export function interpretarArchivos(archivos: ArchivoLeido[], cartera: Pick<DatosCartera, "activos" | "movimientos">, hoy: string, nuevoId: () => string): ImportacionArchivos {
  const conFormato = archivos.map((a) => ({ ...a, formato: a.mapeo ? ("columnas" as const) : detectarFormato(a.filas) }));
  const ordenados = [...conFormato].sort((a, b) => Number(b.formato === "balanz-tenencia") - Number(a.formato === "balanz-tenencia"));
  let tenenciaHasta = tenenciaImportadaHasta(cartera.movimientos.map((m) => m.nota));
  const conMovimientos = new Set(cartera.movimientos.map((m) => m.activoId));
  const acumulado = { activos: [...cartera.activos], movimientos: [...cartera.movimientos] };
  const filas: FilaImportada[] = [];
  const activos: Activo[] = [];

  for (const a of ordenados) {
    let r: Importacion;
    let omitidas: Omitida[] = [];
    let origen: number[] | null = null;
    if (a.formato === "planilla") {
      r = interpretarPlanilla(a.filas, acumulado, hoy, nuevoId);
    } else if (a.formato === "columnas") {
      const convertido = aplicarMapeo(a.filas, a.mapeo!, a.broker ?? "Broker");
      omitidas = convertido.omitidas;
      origen = convertido.origen;
      r = convertido.filas.length > 1 ? interpretarPlanilla(convertido.filas, acumulado, hoy, nuevoId) : { ok: true, filas: [], activos: [] };
    } else {
      const fechaTenencia = a.formato === "balanz-tenencia" ? (fechaDelNombre(a.nombre) ?? hoy) : null;
      const convertido = fechaTenencia ? balanzTenencia(a.filas, fechaTenencia) : balanzMovimientos(a.filas, tenenciaHasta);
      if (fechaTenencia && (!tenenciaHasta || fechaTenencia > tenenciaHasta)) tenenciaHasta = fechaTenencia;
      omitidas = convertido.omitidas;
      origen = convertido.origen;
      r = convertido.filas.length > 1 ? interpretarPlanilla(convertido.filas, acumulado, hoy, nuevoId) : { ok: true, filas: [], activos: [] };
    }
    if (!r.ok) return { ok: false, error: archivos.length > 1 ? `${a.nombre}: ${r.error}` : r.error };

    const propias = r.filas.map((f) => {
      const fila: FilaImportada = { ...f, n: origen ? (origen[f.n - 2] ?? f.n) : f.n, archivo: a.nombre };
      // Una tenencia de un activo que ya tiene movimientos en la cartera los puede duplicar.
      if (a.formato === "balanz-tenencia" && fila.activo && conMovimientos.has(fila.activo.id) && (fila.estado === "lista" || fila.estado === "aviso")) {
        fila.estado = "aviso";
        fila.motivos = [...fila.motivos, `Ya tenés movimientos de ${fila.activo.ticker ?? fila.activo.nombre} en tu cartera: si son de Balanz, esta tenencia los duplica.`];
      }
      return fila;
    });
    if (a.formato === "balanz-movimientos") avisarVentasDeMas(propias, acumulado.movimientos, "importá primero Mis instrumentos.");
    if (a.formato === "columnas") avisarVentasDeMas(propias, acumulado.movimientos, "cargá primero lo que tenías (con la planilla).");
    filas.push(...[...propias, ...omitidas.map((o) => omitida(o, a.nombre))].sort((x, y) => x.n - y.n));
    activos.push(...r.activos);
    acumulado.activos.push(...r.activos);
    acumulado.movimientos.push(...propias.filter((f) => (f.estado === "lista" || f.estado === "aviso") && f.movimiento).map((f) => f.movimiento!));
  }

  if (!filas.length) return { ok: false, error: archivos.length > 1 ? "Los archivos no tienen movimientos." : "El archivo no tiene movimientos." };
  return { ok: true, filas, activos, formatos: conFormato.map((a) => ({ nombre: a.nombre, formato: a.formato })) };
}
