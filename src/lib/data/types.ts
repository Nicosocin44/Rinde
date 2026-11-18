/**
 * Tipos comunes de la capa de datos. Todo dato externo llega a la UI dentro de un `Envelope`:
 * así cada número viaja con su fuente, su hora y su estado.
 */

export type EstadoDato = "live" | "delayed" | "close" | "stale" | "sample";

export type Fuente = { id: string; name: string; url: string };

export type Excluido = { id: string; reason: string };

export type Envelope<T> = {
  data: T;
  source: Fuente[];
  /** Momento del dato según la fuente (ISO). */
  asOf: string;
  /** Cuándo lo trajimos (ISO). */
  fetchedAt: string;
  status: EstadoDato;
  /** Lo que filtró la validación de sanidad, con su motivo. */
  excluded?: Excluido[];
};

/** Resultado de un servicio: el dato con su envoltorio, o un error tipado que la UI sabe mostrar. */
export type Cargado<T> = ({ ok: true } & Envelope<T>) | { ok: false; error: string; source: Fuente[] };

export const FUENTES = {
  dolarapi: { id: "dolarapi", name: "DolarAPI", url: "https://dolarapi.com" },
  argentinadatos: { id: "argentinadatos", name: "ArgentinaDatos", url: "https://argentinadatos.com" },
  bcra: { id: "bcra", name: "BCRA", url: "https://www.bcra.gob.ar" },
  data912: { id: "data912", name: "data912", url: "https://data912.com" },
  criptoya: { id: "criptoya", name: "CriptoYa", url: "https://criptoya.com" },
  cnv: { id: "cnv", name: "CNV", url: "https://www.argentina.gob.ar/cnv" },
  wikipedia: { id: "wikipedia", name: "Wikipedia", url: "https://es.wikipedia.org" },
  rinde: { id: "propia", name: "Elaboración propia", url: "/metodologia" },
} as const satisfies Record<string, Fuente>;

// ───────────────────────── Dólar ─────────────────────────

export type TipoDolar = "oficial" | "mep" | "ccl" | "blue" | "cripto" | "tarjeta" | "mayorista";

export type CotizacionDolar = {
  id: TipoDolar;
  nombre: string;
  descripcion: string;
  /** Precio al que comprás vos (punta vendedora). */
  venta: number;
  /** Precio al que vendés vos (punta compradora). null si no aplica (tarjeta). */
  compra: number | null;
  /** Variación contra el cierre anterior (fracción). */
  variacion: number | null;
  /** Brecha contra el oficial (fracción). */
  brecha: number | null;
  /** Últimos cierres (venta), del más viejo al más nuevo, para la sparkline. */
  serie: number[];
  asOf: string;
};

export type ActivoDolar = "USD" | "USDT" | "USDC";

export type ProveedorDolar = {
  id: string;
  nombre: string;
  tipo: "banco" | "casa_de_cambio" | "billetera" | "exchange" | "p2p";
  /** Precio final al que comprás, con comisiones. */
  compras: number;
  /** Precio final al que vendés, con comisiones. */
  vendes: number;
  /** Precios de pizarra, sin comisiones. */
  pizarraCompra: number;
  pizarraVenta: number;
  /** (comprás − vendés) / vendés. */
  spread: number;
  /** Cuánto te cuesta comprar 1.000 unidades. */
  costoMil: number;
  /** Cuánto recibís por vender 1.000 unidades. */
  recibisMil: number;
  opera247: boolean;
  asOf: string;
};

export type RankingDolar = {
  activo: ActivoDolar;
  proveedores: ProveedorDolar[];
  /** Precios con condiciones especiales (P2P, cupos, etc.): no comparables. */
  especiales: (ProveedorDolar & { condicion: string })[];
  /** Promedio de costo de comprar 1.000 unidades entre los proveedores comparables. */
  promedioCostoMil: number;
};

export type PuntoSerie = { fecha: string; valor: number };

// ───────────────────────── Pesos ─────────────────────────

export type TipoOpcionPesos = "billetera" | "cuenta" | "fci" | "plazo_fijo" | "caucion" | "lecap";

export type Liquidez = "inmediata" | "24hs" | "al_vencimiento" | "mercado";

export type OpcionPesos = {
  /** Clave única por instrumento (sin duplicados). */
  id: string;
  nombre: string;
  /** Detalle corto: nombre del fondo, plazo, etc. */
  detalle?: string;
  proveedorId: string;
  tipo: TipoOpcionPesos;
  /** Tasas como fracción. */
  tna: number;
  tea: number;
  tem: number;
  /** Plazo en días; null = sin plazo (liquidez inmediata). */
  plazoDias: number | null;
  liquidez: Liquidez;
  /** Tope de saldo que rinde esa tasa. null = sin tope. */
  tope: number | null;
  condicion?: string;
  /** true si la tasa exige condiciones (plan sueldo, consumo mínimo): va aparte, no es comparable. */
  condicionEspecial: boolean;
  garantia: "SEDESA" | "Tesoro nacional" | "Cartera del fondo" | "Garantía de mercado" | "Sin garantía";
  riesgo: "muy bajo" | "bajo" | "medio";
  asOf: string;
  fuenteId: keyof typeof FUENTES;
};

export type PlazoFijoBanco = {
  id: string;
  banco: string;
  proveedorId: string;
  /** TNA a 30 días para clientes y para no clientes (null si no ofrece). */
  tnaClientes: number | null;
  tnaNoClientes: number | null;
  /** TNA por plazo (días → TNA). */
  porPlazo: Partial<Record<30 | 60 | 90 | 180 | 365, number>>;
  enlace: string | null;
};

export type FondoMM = {
  id: string;
  fondo: string;
  clase: string;
  proveedorId: string;
  /** Billetera o app donde se accede al fondo, si se conoce. */
  accesoPor?: string;
  tna: number;
  tea: number;
  vcp: number;
  fechaVcp: string;
  fechaVcpAnterior: string;
  dias: number;
  patrimonio: number;
};

export type Caucion = { plazoDias: number; tna: number; tea: number; monto: number; fecha: string };

export type Lecap = {
  ticker: string;
  tipo: "LECAP" | "BONCAP";
  vencimiento: string;
  /** Días corridos desde la liquidación (24 hs) al vencimiento. */
  dias: number;
  precio: number;
  /** Valor final por 100 VN. */
  vf: number;
  vfEstimado: boolean;
  directo: number;
  tna: number;
  tea: number;
  tem: number;
  /** Variación del precio en el día (fracción). */
  variacion: number | null;
  volumen: number;
  /** false si quedó fuera de la curva (por vencer, sin operaciones, atípica). */
  enCurva: boolean;
  etiqueta?: string;
};

export type CurvaLecaps = {
  letras: Lecap[];
  /** Curva ajustada (TEA contra días), para dibujar. */
  ajuste: { dias: number; tea: number }[];
  liquidacion: string;
};

// ───────────────────────── Macro ─────────────────────────

export type Macro = {
  inflacionMensual: PuntoSerie[];
  inflacionInteranual: number | null;
  riesgoPais: { valor: number; fecha: string; variacion: number | null; serie: PuntoSerie[] } | null;
  rem: {
    informe: string;
    /** Inflación esperada próximos 12 meses (fracción). */
    proximos12m: number | null;
    /** Expectativas mensuales: mes ("2026-11") → fracción. */
    mensual: { mes: string; valor: number }[];
    url: string;
  } | null;
};

export type Pulso = {
  mep: { valor: number; variacion: number | null } | null;
  oficial: { valor: number; variacion: number | null } | null;
  riesgoPais: { valor: number; variacion: number | null } | null;
  mejorTasa: { tna: number; tea: number; nombre: string; tipo: TipoOpcionPesos } | null;
  mercadoAbierto: boolean;
};

// ───────────────────────── Bonos y mercados ─────────────────────────

export type BonoUsd = {
  ticker: string;
  nombre: string;
  ley: "Argentina" | "Nueva York";
  vencimiento: string;
  /** Precio en USD por 100 VN (especie D). */
  precioUsd: number;
  precioArs: number | null;
  variacion: number | null;
  tir: number;
  duration: number;
  paridad: number;
  cuponActual: number;
  residual: number;
  proximoPago: { fecha: string; monto: number } | null;
  volumen: number;
};

export type ObligacionNegociable = {
  ticker: string;
  emisor: string | null;
  precioUsd: number | null;
  precioArs: number | null;
  variacion: number | null;
  volumen: number;
  operaciones: number;
};

export type Cedear = {
  ticker: string;
  nombre: string | null;
  sector: string | null;
  precioArs: number;
  precioUsd: number | null;
  variacion: number | null;
  mepImplicito: number | null;
  cclImplicito: number | null;
  volumenArs: number;
};

export type Accion = { ticker: string; nombre: string | null; panel: "líder" | "general"; precio: number; variacion: number | null; volumen: number };

export type CriptoExchange = { id: string; nombre: string; compras: number; vendes: number; spread: number; asOf: string };
export type Cripto = { simbolo: "BTC" | "ETH" | "USDT" | "USDC"; nombre: string; precioArs: number; precioUsd: number | null; exchanges: CriptoExchange[] };
