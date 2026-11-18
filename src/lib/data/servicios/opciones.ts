import { SUBYACENTES_OPCIONES } from "@data/ar/opciones";
import {
  deltaBS,
  diasEntre,
  fechaLiquidacion,
  hoyAR,
  MESES_OPCION,
  parsearSimbolo,
  sumarHabiles,
  tasaContinua,
  teaDesdeTna,
  valorIntrinseco,
  volatilidadAnual,
  volatilidadImplicita,
  vencimientoOpcion,
  type TipoOpcion,
} from "@/lib/calculos";
import * as d912 from "../adapters/data912";
import { conRespaldo } from "../cache";
import { mercadoAbierto } from "../freshness";
import { FUENTES, type CadenaOpciones, type ComparableTasa, type Excluido, type FilaOpciones, type LadoOpcion, type VencimientoOpciones } from "../types";
import { cargarFeriados } from "./feriados";
import { cargarPesos, type DatosPesos } from "./pesos";
import type { z } from "zod";
import type { d912OpcionesSchema } from "../schemas";

type PanelOpciones = z.infer<typeof d912OpcionesSchema>;
type Tasa = { nombre: string; tna: number; tea: number };

/** Volatilidad implícita plausible: fuera de 5 %–300 % anual es un precio roto, no una expectativa. */
const BANDA_VI: [number, number] = [0.05, 3];
/** Puntas con una diferencia mayor a esto (sobre el punto medio) se marcan como abiertas. */
const PUNTAS_ABIERTAS = 0.25;

const positivo = (x: number | null | undefined) => (x && x > 0 ? x : null);
const codigoDeFecha = (fecha: string) => Object.keys(MESES_OPCION).find((k) => MESES_OPCION[k] === Number(fecha.slice(5, 7))) ?? fecha.slice(5, 7);

export type Subyacente = { precio: number; compra: number | null; venta: number | null };

/**
 * Arma la cadena de opciones de un subyacente: agrupa por vencimiento y base, descarta las vencidas y las puntas
 * cruzadas, y calcula volatilidad implícita y delta. Las tasas (lanzamiento cubierto, cajas) se arman en la pantalla,
 * con la comisión que elija cada persona (src/lib/opciones/tasas.ts).
 * `tasa(dias)` devuelve la tasa en pesos para ese plazo (la usa el modelo); null = 0 %.
 */
export function normalizarOpciones(p: {
  panel: PanelOpciones;
  prefijo: string;
  subyacente: Subyacente;
  hoy: string;
  feriados: ReadonlySet<string>;
  tasa: (dias: number) => Tasa | null;
}): { vencimientos: Omit<VencimientoOpciones, "comparables">[]; excluidos: Excluido[] } {
  const excluidos: Excluido[] = [];
  const unicas = [...new Map(p.panel.map((o) => [o.symbol, o])).values()];
  const propias = unicas.map((o) => ({ o, s: parsearSimbolo(o.symbol) })).filter((x) => x.s?.prefijo === p.prefijo);
  const presentes = new Set(propias.map((x) => x.s!.codigoMes).filter((c) => c.length === 2));

  // Precio de la acción para el modelo: punto medio de las puntas, si no el último.
  const { compra: sc, venta: sv } = p.subyacente;
  const s = sc && sv && sc <= sv ? (sc + sv) / 2 : p.subyacente.precio;
  const liquidacion = fechaLiquidacion(p.hoy, "24hs", p.feriados);

  const porFecha = new Map<string, Map<number, FilaOpciones>>();
  for (const { o, s: sim } of propias) {
    const fecha = vencimientoOpcion(sim!.codigoMes, p.hoy, p.feriados, presentes);
    if (!fecha || fecha < p.hoy) {
      excluidos.push({ id: o.symbol, reason: "Vencida" });
      continue;
    }
    let compra = positivo(o.px_bid);
    let venta = positivo(o.px_ask);
    if (compra && venta && compra > venta) {
      excluidos.push({ id: o.symbol, reason: "Puntas cruzadas (la compra supera a la venta)" });
      compra = null;
      venta = null;
    }
    const ultimo = positivo(o.c);
    const volumen = o.v ?? 0;
    const referencia = compra && venta ? (compra + venta) / 2 : volumen > 0 ? ultimo : null;
    const dias = diasEntre(p.hoy, fecha);
    const t = dias / 365;
    const tasa = p.tasa(dias);
    const r = tasa ? tasaContinua(tasa.tea) : 0;
    const tipo: TipoOpcion = sim!.tipo;
    const k = sim!.base;
    const viCalculada = referencia && t > 0 ? volatilidadImplicita(referencia, { tipo, s, k, t, r }) : null;
    const vi = viCalculada !== null && viCalculada >= BANDA_VI[0] && viCalculada <= BANDA_VI[1] ? viCalculada : null;
    const intrinseco = valorIntrinseco(tipo, s, k);
    const lado: LadoOpcion = {
      simbolo: o.symbol,
      compra,
      venta,
      cantCompra: compra ? (o.q_bid ?? null) : null,
      cantVenta: venta ? (o.q_ask ?? null) : null,
      ultimo,
      variacion: o.pct_change !== null && o.pct_change !== undefined && ultimo ? o.pct_change / 100 : null,
      volumen,
      operaciones: o.q_op ?? 0,
      referencia,
      vi,
      delta: vi !== null ? deltaBS({ tipo, s, k, t, r, sigma: vi }) : null,
      intrinseco,
      extrinseco: referencia !== null ? referencia - intrinseco : null,
      puntasAbiertas: !!(compra && venta && (venta - compra) / ((compra + venta) / 2) > PUNTAS_ABIERTAS),
    };
    const filas = porFecha.get(fecha) ?? new Map<number, FilaOpciones>();
    const fila = filas.get(k) ?? { base: k, call: null, put: null };
    if (tipo === "call") fila.call = lado;
    else fila.put = lado;
    filas.set(k, fila);
    porFecha.set(fecha, filas);
  }

  const conDatos = (l: LadoOpcion | null) => !!l && (l.compra !== null || l.venta !== null || l.ultimo !== null);

  const vencimientos = [...porFecha.entries()]
    .map(([fecha, mapa]) => {
      const filas = [...mapa.values()].filter((f) => conDatos(f.call) || conDatos(f.put)).sort((a, b) => a.base - b.base);
      const dias = diasEntre(p.hoy, fecha);
      const diasCobro = diasEntre(liquidacion, sumarHabiles(fecha, 1, p.feriados));
      const conVi = filas.filter((f) => f.call?.vi != null || f.put?.vi != null);
      const cercana = conVi.reduce<FilaOpciones | null>((m, f) => (!m || Math.abs(f.base - s) < Math.abs(m.base - s) ? f : m), null);
      const vis = cercana ? [cercana.call?.vi, cercana.put?.vi].filter((x): x is number => x != null) : [];
      return {
        codigo: codigoDeFecha(fecha),
        fecha,
        dias,
        diasCobro,
        filas,
        volumen: filas.reduce((t, f) => t + (f.call?.volumen ?? 0) + (f.put?.volumen ?? 0), 0),
        baseCercana: cercana?.base ?? null,
        viCercana: vis.length ? vis.reduce((a, b) => a + b, 0) / vis.length : null,
        tasaModelo: p.tasa(dias),
      };
    })
    .filter((v) => v.filas.length > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  return { vencimientos, excluidos };
}

const masCercano = <T,>(lista: T[], valor: (x: T) => number, objetivo: number): T | null =>
  lista.reduce<T | null>((m, x) => (!m || Math.abs(valor(x) - objetivo) < Math.abs(valor(m) - objetivo) ? x : m), null);

/** Tasa en pesos para el modelo: la caución al plazo más parecido; si no está al día, la LECAP más parecida. */
export function tasaParaPlazo(pesos: DatosPesos | null, dias: number): Tasa | null {
  if (!pesos) return null;
  const c = pesos.cauciones.vigente ? masCercano(pesos.cauciones.lista, (x) => x.plazoDias, dias) : null;
  if (c) return { nombre: `Caución a ${c.plazoDias} días`, tna: c.tna, tea: teaDesdeTna(c.tna, c.plazoDias).toNumber() };
  const l = masCercano(
    pesos.curva.letras.filter((x) => x.enCurva),
    (x) => x.dias,
    dias,
  );
  return l ? { nombre: `LECAP ${l.ticker}`, tna: l.tna, tea: l.tea } : null;
}

/** Tasas en pesos a un plazo parecido, ordenadas por TNA (solo la métrica, nada más). */
export function comparablesTasa(pesos: DatosPesos | null, dias: number): ComparableTasa[] {
  if (!pesos) return [];
  const lista: ComparableTasa[] = [];
  const c = pesos.cauciones.vigente ? masCercano(pesos.cauciones.lista, (x) => x.plazoDias, dias) : null;
  if (c) lista.push({ id: "caucion", nombre: "Caución colocadora", detalle: `a ${c.plazoDias} días`, tna: c.tna });
  const l = masCercano(
    pesos.curva.letras.filter((x) => x.enCurva),
    (x) => x.dias,
    dias,
  );
  if (l) lista.push({ id: `lecap-${l.ticker}`, nombre: `${l.tipo} ${l.ticker}`, detalle: `a ${l.dias} días`, tna: l.tna });
  // Plazo fijo: el plazo más parecido que se ofrezca y, en ese plazo, la TNA más alta.
  const pfs = pesos.opciones.filter((o) => o.tipo === "plazo_fijo" && !o.condicionEspecial);
  const plazoPf = masCercano(pfs, (o) => o.plazoDias ?? 30, dias)?.plazoDias ?? 30;
  const pf = pfs.filter((o) => (o.plazoDias ?? 30) === plazoPf).sort((a, b) => b.tna - a.tna)[0];
  if (pf) lista.push({ id: `pf-${pf.id}`, nombre: "Plazo fijo", detalle: `${pf.nombre}, a ${pf.plazoDias ?? 30} días`, tna: pf.tna });
  return lista.sort((a, b) => b.tna - a.tna);
}

export async function cargarOpciones(ticker = "GGAL") {
  const def = SUBYACENTES_OPCIONES[ticker];
  if (!def) return { ok: false as const, error: `No seguimos opciones de ${ticker}.`, source: [FUENTES.data912] };
  return conRespaldo<CadenaOpciones>(`opciones-${ticker}`, [FUENTES.data912, FUENTES.argentinadatos], async () => {
    const hoy = hoyAR();
    const [panel, acciones, feriados, pesosR, historico] = await Promise.all([
      d912.opciones(),
      d912.panel(def.panel),
      cargarFeriados(),
      cargarPesos().catch(() => null),
      d912.historico("stocks", def.ticker).catch(() => []),
    ]);
    const accion = acciones.find((a) => a.symbol === def.ticker);
    const precio = positivo(accion?.c);
    if (!accion || !precio) throw new Error(`Sin precio de ${def.ticker}`);
    const pesos = pesosR?.ok ? pesosR.data : null;
    const subyacente = { precio, compra: positivo(accion.px_bid), venta: positivo(accion.px_ask) };
    const { vencimientos, excluidos } = normalizarOpciones({ panel, prefijo: def.prefijo, subyacente, hoy, feriados, tasa: (dias) => tasaParaPlazo(pesos, dias) });
    if (vencimientos.length === 0) throw new Error(`Sin opciones vigentes de ${def.ticker}`);
    const cierres = historico.map((h) => ({ cierre: h.c }));
    return {
      data: {
        subyacente: { ticker: def.ticker, nombre: def.nombre, ...subyacente, variacion: accion.pct_change !== null && accion.pct_change !== undefined ? accion.pct_change / 100 : null },
        lote: def.lote,
        vencimientos: vencimientos.map((v) => ({ ...v, comparables: comparablesTasa(pesos, v.diasCobro) })),
        volHistorica: { d20: volatilidadAnual(cierres, 20), d60: volatilidadAnual(cierres, 60) },
        liquidacion: fechaLiquidacion(hoy, "24hs", feriados),
      },
      asOf: new Date().toISOString(),
      status: mercadoAbierto() ? "delayed" : "close",
      excluded: excluidos,
    };
  });
}
