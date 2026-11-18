import { z } from "zod";

/**
 * Schemas Zod de cada fuente, tal como respondieron el 16/11/2026 (ver docs/PROGRESO.md).
 * Solo se declaran los campos que usamos; el resto se ignora.
 */

const num = z.number().finite();
const numNulo = z.number().finite().nullable();

// ───────── DolarAPI ─────────
export const dolarApiSchema = z.array(
  z.object({
    casa: z.string(),
    nombre: z.string(),
    compra: numNulo,
    venta: num,
    fechaActualizacion: z.string(),
  }),
);

// ───────── ArgentinaDatos ─────────
export const adHistoricoDolarSchema = z.array(z.object({ casa: z.string(), compra: numNulo, venta: num, fecha: z.string() }));

export const adSerieSchema = z.array(z.object({ fecha: z.string(), valor: num }));

export const adRiesgoPaisSchema = z.array(z.object({ fecha: z.string(), valor: num }));

export const adPlazoFijoSchema = z.array(
  z.object({
    entidad: z.string(),
    tnaClientes: numNulo,
    tnaNoClientes: numNulo,
    enlace: z.string().nullable().optional(),
    tasas: z
      .array(z.object({ plazoMinDias: numNulo, plazoMaxDias: numNulo, tna: numNulo }))
      .nullable()
      .optional(),
  }),
);

/** /v1/finanzas/fci/otros/ultimo: billeteras y cuentas remuneradas. */
export const adCuentasSchema = z.array(
  z.object({
    fondo: z.string(),
    tna: num,
    tope: numNulo,
    fecha: z.string(),
    condiciones: z.string().nullable().optional(),
    condicionesCorto: z.string().nullable().optional(),
  }),
);

/** /v1/finanzas/fci/mercadoDinero/{fecha}: cuotapartes por fondo y clase. */
export const adFciSchema = z.array(
  z.object({
    fondo: z.string(),
    fecha: z.string().nullable(),
    vcp: numNulo,
    patrimonio: numNulo.optional(),
  }),
);

export const adCaucionesSchema = z.array(
  z.object({
    plazo: num,
    montoContado: numNulo,
    tasaActual: numNulo,
    fechaOperacion: z.string(),
    fechaActualizacion: z.string(),
  }),
);

export const adLetrasSchema = z.object({
  fechaActualizacion: z.string(),
  letras: z.array(
    z.object({
      ticker: z.string(),
      precioArs: numNulo,
      teaPorcentaje: numNulo,
      tnaPorcentaje: numNulo,
      fechaVencimiento: z.string(),
      diasAlVencimiento: numNulo,
    }),
  ),
});

export const adBonosCerSchema = z.object({
  fechaActualizacion: z.string(),
  bonos: z.array(z.object({ ticker: z.string(), precioArs: numNulo, tirPorcentaje: numNulo, fechaVencimiento: z.string(), volumen: numNulo.optional() })),
});

export const adRemSchema = z.array(
  z.object({
    informe: z.string(),
    /** "todos" (todos los participantes) o "top10". */
    muestra: z.string().optional(),
    indicador: z.string(),
    periodo: z.string(),
    periodoTipo: z.string(),
    periodoDesde: z.string().optional(),
    mediana: numNulo,
    publicacionUrl: z.string().optional(),
  }),
);

export const adFeriadosSchema = z.array(z.object({ fecha: z.string(), nombre: z.string().optional() }));

// ───────── data912 ─────────
export const d912PanelSchema = z.array(
  z.object({
    symbol: z.string(),
    px_bid: numNulo,
    px_ask: numNulo,
    v: numNulo,
    q_op: numNulo,
    c: numNulo,
    pct_change: numNulo,
  }),
);

export const d912MepSchema = z.array(
  z.object({
    ticker: z.string(),
    mark: numNulo,
    close: numNulo,
    v_ars: numNulo,
    ars_bid: numNulo,
    ars_ask: numNulo,
    usd_bid: numNulo,
    usd_ask: numNulo,
    panel: z.string(),
  }),
);

export const d912CclSchema = z.array(z.object({ ticker_ar: z.string(), CCL_mark: numNulo, arg_panel: z.string().optional() }));

/** Cierres diarios. Verificado el 18/11/2026: además del cierre trae apertura, máximo, mínimo y volumen (nominales). */
export const d912HistoricoSchema = z.array(z.object({ date: z.string(), c: num, o: numNulo.optional(), h: numNulo.optional(), l: numNulo.optional(), v: numNulo.optional() }));

// ───────── Wikipedia ─────────
/** Resumen de un artículo (API REST de Wikipedia en castellano). Solo aceptamos artículos, no desambiguaciones. */
export const wikipediaResumenSchema = z.object({
  type: z.string(),
  title: z.string(),
  description: z.string().optional(),
  extract: z.string(),
  content_urls: z.object({ desktop: z.object({ page: z.string() }) }).optional(),
});

// ───────── CriptoYa ─────────
const punta = z.object({ ask: num, totalAsk: num, bid: num, totalBid: num, time: num });
export const criptoyaExchangesSchema = z.record(z.string(), punta);

const cotiz = z.object({ price: num.optional(), ask: num.optional(), bid: num.optional(), variation: numNulo.optional(), timestamp: num });
export const criptoyaDolarSchema = z.object({
  oficial: cotiz,
  blue: cotiz,
  mayorista: cotiz,
  tarjeta: cotiz,
  cripto: z.object({ usdt: cotiz, usdc: cotiz }),
  mep: z.object({ al30: z.object({ "24hs": cotiz, ci: cotiz }) }),
  ccl: z.object({ al30: z.object({ "24hs": cotiz, ci: cotiz }) }),
});

// ───────── BCRA ─────────
export const bcraSerieSchema = z.object({
  results: z.array(z.object({ idVariable: num, detalle: z.array(z.object({ fecha: z.string(), valor: num })) })),
});
