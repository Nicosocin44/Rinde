import { armarEstados, derivar, indicadoresDe, ultimosDoce, type Clave, type ClaveCuenta, type DetalleFormulario, type Estados, type LineaFormulario, type Periodo, type ResumenBalances } from "./balances";
import { d } from "./decimal";
import { diasEntre, type FechaISO } from "./fechas";
import { nivelEnFecha, type PuntoIndice } from "./inflacion";

/**
 * Estados contables de una empresa argentina a partir de los formularios que presenta ante la CNV. Puro.
 *
 * Reglas (verificadas con YPF, Pampa y Banco Galicia el 19/11/2026):
 * - Cada rubro tiene un código fijo en el formulario (1999999 = total del activo, 3049999 = ganancia del período…). Los
 *   bancos usan otro formulario: algunos códigos significan otra cosa, así que tienen su propio mapa.
 * - Los resultados y los flujos vienen acumulados desde el inicio del ejercicio. Cada trimestre es la diferencia entre
 *   dos acumulados; el cuarto, el ejercicio menos nueve meses.
 * - Todo se pasa a dólares al tipo de cambio oficial mayorista del día de cierre de cada balance. Así se pueden comparar
 *   balances distintos: en pesos, cada uno está en moneda de su propia fecha (ajuste por inflación) y algunas empresas
 *   llevan su contabilidad en dólares y la convierten a pesos para presentarla.
 * - Los trimestres se restan en pesos, ANTES de pasar a dólares: el acumulado anterior se lleva a la moneda del cierre
 *   nuevo con el IPC (como hace el ajuste por inflación) y la diferencia se pasa a dólares al cierre. Restar acumulados ya
 *   pasados a dólares a dos tipos de cambio distintos deforma el trimestre cuando el dólar salta (YPF daba +76 %
 *   interanual en el tercer trimestre de 2026).
 */

export type FormularioEntrada = {
  cierre: FechaISO;
  periodicidad: "anual" | "trimestral";
  /** Por cuánto multiplicar los montos (1e6 si es "Millones de $"). */
  factor: number;
  acciones: number | null;
  cuentas: Record<string, number | null>;
  presentada: FechaISO;
  guid: string;
  /** Los rubros en el orden del formulario, con su nombre (para las tablas completas). */
  rubros?: { codigo: string; nombre: string }[];
};

type Mapa = Partial<Record<ClaveCuenta, (c: Record<string, number | null>) => number | null>>;

const de = (codigo: string) => (c: Record<string, number | null>) => c[codigo] ?? null;
const abs = (codigo: string) => (c: Record<string, number | null>) => (c[codigo] == null ? null : Math.abs(c[codigo]!));
const opuesto = (codigo: string) => (c: Record<string, number | null>) => (c[codigo] == null ? null : -c[codigo]!);
const sumaAbs =
  (...codigos: string[]) =>
  (c: Record<string, number | null>) =>
    codigos.every((k) => c[k] == null) ? null : codigos.reduce((s, k) => s + Math.abs(c[k] ?? 0), 0);

/** Amortizaciones: EBITDA − EBIT (los dos vienen calculados en el formulario; la línea de amortizaciones del estado de resultados suele ser parcial). */
const amortizaciones = (c: Record<string, number | null>) => (c["8000004"] == null || c["8000003"] == null ? null : c["8000004"]! - c["8000003"]!);

const COMUNES: Mapa = {
  gananciaAntesImpuestos: de("3029999"),
  impuestos: opuesto("3031100"),
  gananciaNeta: de("3049999"),
  flujoOperativo: de("3241100"),
  flujoInversion: de("3241200"),
  flujoFinanciacion: de("3241300"),
  caja: de("1122500"),
  activos: de("1999999"),
  pasivos: de("2399999"),
  patrimonio: de("2299999"),
  pasivosYPatrimonio: de("2999999"),
};

/** Empresas (formulario "Estados Contables - NIIF"). */
export const MAPA_EMPRESAS: Mapa = {
  ...COMUNES,
  ingresos: de("3000100"),
  costoVentas: abs("3000200"),
  gananciaBruta: de("3009999"),
  gastosComerciales: sumaAbs("3011200", "3011300", "3011301"),
  gananciaOperativa: de("3019999"),
  depreciacion: amortizaciones,
  inversionesCortoPlazo: de("1122300"),
  cuentasPorCobrar: de("1121999"),
  inventarios: de("1120100"),
  activoCorriente: de("1139999"),
  bienesDeUso: de("1110100"),
  intangibles: de("1110200"),
  cuentasPorPagar: de("2321999"),
  deudaCorrienteInformada: de("2322200"),
  pasivoCorriente: de("2339999"),
  deudaLargoPlazo: de("2312300"),
};

/** Bancos (formulario "NIIF para bancos y entidades financieras"): no hay "ingresos" ni deuda financiera como en una empresa. */
export const MAPA_BANCOS: Mapa = { ...COMUNES };

const TIPO_SALDO = new Set<ClaveCuenta>(["caja", "inversionesCortoPlazo", "cuentasPorCobrar", "inventarios", "activoCorriente", "bienesDeUso", "intangibles", "activos", "cuentasPorPagar", "deudaCorrienteInformada", "pasivoCorriente", "deudaLargoPlazo", "pasivos", "patrimonio", "pasivosYPatrimonio"]);

/** El dólar oficial mayorista del cierre (o el último día hábil anterior, hasta 10 días antes). */
export function dolarDelCierre(dolar: { fecha: string; valor: number }[], fecha: FechaISO): number | null {
  let mejor: { fecha: string; valor: number } | null = null;
  for (const p of dolar) if (p.fecha <= fecha && p.valor > 0 && (!mejor || p.fecha > mejor.fecha)) mejor = p;
  return mejor && diasEntre(mejor.fecha, fecha) <= 10 ? mejor.valor : null;
}

type Fila = {
  cierre: FechaISO;
  meses: number;
  anual: boolean;
  /** Dólar mayorista del cierre. */
  dolar: number;
  /** En pesos de la fecha de cierre (ya multiplicados por la unidad del formulario). */
  pesos: Partial<Record<ClaveCuenta, number | null>>;
  /** En dólares al cierre. */
  valores: Partial<Record<ClaveCuenta, number | null>>;
  /** Cada rubro del formulario, en pesos de la fecha de cierre. */
  pesosPorCodigo: Record<string, number | null>;
  f: FormularioEntrada;
};

/** Meses entre dos fechas de cierre (fin de mes a fin de mes). */
const mesesEntre = (a: FechaISO, b: FechaISO) => Math.round(diasEntre(a, b) / 30.44);

/**
 * El resumen en dólares. `formularios`: un formulario por fecha de cierre (el consolidado y la versión más nueva, si se
 * corrigió). null si no hay ningún balance anual con dólar para su cierre.
 */
export function resumirCnv(p: {
  empresa: string;
  bancaria: boolean;
  formularios: FormularioEntrada[];
  dolar: { fecha: string; valor: number }[];
  /** Índice de precios (IPC) para llevar el acumulado anterior a la moneda del cierre nuevo. Sin índice, se restan tal cual. */
  ipc?: PuntoIndice[];
  hoy: FechaISO;
}): ResumenBalances | null {
  const mapa = p.bancaria ? MAPA_BANCOS : MAPA_EMPRESAS;
  const claves = Object.keys(mapa) as ClaveCuenta[];

  // Cada formulario, en dólares del día de cierre.
  const filas: Fila[] = [];
  for (const f of [...p.formularios].sort((a, b) => a.cierre.localeCompare(b.cierre))) {
    const dolar = dolarDelCierre(p.dolar, f.cierre);
    if (!dolar) continue;
    const pesos: Partial<Record<ClaveCuenta, number | null>> = {};
    const valores: Partial<Record<ClaveCuenta, number | null>> = {};
    for (const c of claves) {
      const v = mapa[c]!(f.cuentas);
      pesos[c] = v == null ? null : d(v).mul(f.factor).toNumber();
      valores[c] = v == null ? null : d(v).mul(f.factor).div(dolar).toNumber();
    }
    const pesosPorCodigo: Record<string, number | null> = {};
    for (const [codigo, v] of Object.entries(f.cuentas)) pesosPorCodigo[codigo] = v == null ? null : d(v).mul(f.factor).toNumber();
    filas.push({ cierre: f.cierre, meses: 0, anual: f.periodicidad === "anual", dolar, pesos, valores, pesosPorCodigo, f });
  }
  const anuales = filas.filter((x) => x.anual);
  if (anuales.length === 0) return null;

  // Meses acumulados de cada formulario: desde el cierre del ejercicio anterior (el mes de cierre sale de los anuales).
  const mesCierre = Number(anuales.at(-1)!.cierre.slice(5, 7));
  for (const x of filas) {
    if (x.anual) x.meses = 12;
    else {
      const mes = Number(x.cierre.slice(5, 7));
      x.meses = ((mes - mesCierre + 12) % 12) || 12;
    }
  }

  const financiera = p.bancaria || anuales.every((x) => x.valores.ingresos == null);

  // ── Ejercicios (hasta 5) ──
  const ultimosAnuales = anuales.slice(-5);
  const anual = armarEstados(
    ultimosAnuales.map((x) => ({ fin: x.cierre, derivado: false })),
    (c, fin) => ultimosAnuales.find((x) => x.cierre === fin)?.valores[c] ?? null,
    financiera,
  );

  // ── Trimestres (hasta 8): cada acumulado menos el anterior del mismo ejercicio, en pesos del cierre nuevo ──
  const trimestres: { periodo: Periodo; valores: Partial<Record<ClaveCuenta, number | null>>; fila: Fila; previo: Fila | null; reexpresion: ReturnType<typeof d> }[] = [];
  for (const x of filas) {
    if (x.meses % 3 !== 0) continue;
    const previo = x.meses === 3 ? null : filas.find((y) => y.meses === x.meses - 3 && mesesEntre(y.cierre, x.cierre) === 3);
    if (x.meses > 3 && !previo) continue;
    // Cuánto subieron los precios entre los dos cierres (1 si no hay índice).
    const nivelAntes = previo && p.ipc ? nivelEnFecha(p.ipc, previo.cierre) : null;
    const nivelAhora = previo && p.ipc ? nivelEnFecha(p.ipc, x.cierre) : null;
    const reexpresion = nivelAntes && nivelAhora ? nivelAhora.div(nivelAntes) : d(1);
    const valores: Partial<Record<ClaveCuenta, number | null>> = {};
    for (const c of claves) {
      if (TIPO_SALDO.has(c) || !previo) {
        valores[c] = x.valores[c] ?? null;
        continue;
      }
      const ahora = x.pesos[c];
      const antes = previo.pesos[c];
      valores[c] = ahora == null || antes == null ? null : d(ahora).minus(d(antes).mul(reexpresion)).div(x.dolar).toNumber();
    }
    trimestres.push({ periodo: { fin: x.cierre, derivado: !!previo }, valores, fila: x, previo: previo ?? null, reexpresion });
  }
  const ultimos8 = trimestres.slice(-8);
  const trimestral: Estados | null =
    ultimos8.length >= 2
      ? armarEstados(
          ultimos8.map((t) => t.periodo),
          (c, fin) => ultimos8.find((t) => t.periodo.fin === fin)?.valores[c] ?? null,
          financiera,
        )
      : null;

  // ── El balance más reciente ──
  const ultima = filas.at(-1)!;
  const saldos: Partial<Record<Clave, number | null>> = {};
  for (const c of claves) if (TIPO_SALDO.has(c)) saldos[c] = ultima.valores[c] ?? null;
  derivar(saldos, financiera);

  const ultimos12 = ultimosDoce(anual, trimestral);
  const n = anual.periodos.length - 1;
  const crece = (c: "ingresos" | "gananciaNeta") => {
    const nuevo = anual.valores[c][n];
    const viejo = n > 0 ? anual.valores[c][n - 1] : null;
    return nuevo == null || viejo == null || viejo <= 0 ? null : d(nuevo).div(viejo).minus(1).toNumber();
  };
  const acciones = ultima.f.acciones;

  // ── Los tres estados completos, rubro por rubro ──
  const enDolares = (x: Fila, codigo: string) => (x.pesosPorCodigo[codigo] == null ? null : d(x.pesosPorCodigo[codigo]!).div(x.dolar).toNumber());
  const detalleAnual = armarDetalle(
    ultimosAnuales.map((x) => ({ fin: x.cierre, derivado: false })),
    ultimosAnuales.map((x) => (codigo: string) => enDolares(x, codigo)),
    filas,
  );
  const detalleTrimestral =
    ultimos8.length >= 2
      ? armarDetalle(
          ultimos8.map((t) => t.periodo),
          ultimos8.map((t) => (codigo: string) => {
            if (esSaldo(codigo) || !t.previo) return enDolares(t.fila, codigo);
            const ahora = t.fila.pesosPorCodigo[codigo];
            const antes = t.previo.pesosPorCodigo[codigo];
            return ahora == null || antes == null ? null : d(ahora).minus(d(antes).mul(t.reexpresion)).div(t.fila.dolar).toNumber();
          }),
          filas,
        )
      : null;

  return {
    fuente: "cnv",
    empresa: p.empresa,
    cik: null,
    moneda: "USD",
    ultimo: { fin: ultima.cierre, formulario: ultima.anual ? "Estados contables anuales (CNV)" : "Estados contables trimestrales (CNV)", presentado: ultima.f.presentada, accn: ultima.f.guid },
    formularioAnual: "CNV",
    financiera,
    ajustadoPorInflacion: false,
    desactualizado: diasEntre(ultima.cierre, p.hoy) > 456,
    anual,
    trimestral,
    ultimos12,
    balance: { fecha: ultima.cierre, valores: saldos },
    indicadores: indicadoresDe({ ultimos12, balance: { fecha: ultima.cierre, valores: saldos }, trimestral, financiera, acciones, crecimientoIngresos: crece("ingresos"), crecimientoGanancia: crece("gananciaNeta") }),
    acciones,
    detalle: { anual: detalleAnual, trimestral: detalleTrimestral },
  };
}

// ───────────────────────── Tablas completas ─────────────────────────

/** Balance (1xxxxxx activo, 2xxxxxx pasivo y patrimonio): fotos al cierre. Lo demás son flujos del período. */
const esSaldo = (codigo: string) => codigo.startsWith("1") || codigo.startsWith("2");
/** Resultados: 30xxxxx, más EBIT y EBITDA (vienen calculados en el formulario). Flujo de efectivo: 32xxxxx. */
const seccionDe = (codigo: string): keyof Omit<DetalleFormulario, "periodos"> | null =>
  esSaldo(codigo) ? "balance" : codigo.startsWith("30") || codigo === "8000003" || codigo === "8000004" ? "resultados" : codigo.startsWith("32") ? "flujo" : null;

/** Rubros con un nombre poco claro en el formulario de empresas (el de bancos ya los nombra así). */
const NOMBRES_CLAROS: Record<string, string> = {
  "3241100": "Flujo de las actividades operativas",
  "3241200": "Flujo de las actividades de inversión",
  "3241300": "Flujo de las actividades de financiación",
};

/** Palabras que el formulario escribe sin tilde (y algún error de tipeo). */
const TILDES: Record<string, string> = {
  administracion: "administración", comercializacion: "comercialización", distribucion: "distribución", inversion: "inversión", financiacion: "financiación",
  disminucion: "disminución", perdida: "pérdida", periodo: "período", sindicos: "síndicos", accion: "acción", depositos: "depósitos", prestamos: "préstamos",
  titulos: "títulos", credito: "crédito", creditos: "créditos", medicion: "medición", cotizacion: "cotización", operacion: "operación", basica: "básica",
  analisis: "análisis", acida: "ácida", rotacion: "rotación", inmovilizacion: "inmovilización", ganacias: "ganancias", garantia: "garantía",
  depreciacion: "depreciación", emision: "emisión", tecnica: "técnica", deficit: "déficit", reexpresion: "reexpresión", valuacion: "valuación",
  participacion: "participación", produccion: "producción", explotacion: "explotación", realizacion: "realización",
};
const SIGLAS = new Set(["recpam", "ebit", "ebitda", "bcra", "niif", "pn", "y/o"]);

/** "GANANCIA (PERDIDA) DE ACTIVIDADES OPERATIVAS" → "Ganancia (pérdida) de actividades operativas". */
export function nombreRubro(texto: string): string {
  // La CNV manda algunas tildes rotas (MEDICI?N, COTIZACI?N, con el carácter de reemplazo U+FFFD): casi siempre son la ó de -ción.
  const palabras = texto
    .replace(/CI�N/gi, "CIÓN")
    .replace(/�/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .map((w) => {
      const limpia = w.replace(/[^a-záéíóúñ/]/g, "");
      if (SIGLAS.has(limpia)) return w.toUpperCase().replace("Y/O", "y/o");
      const conTilde = TILDES[limpia];
      return conTilde ? w.replace(limpia, conTilde) : w;
    })
    .join(" ");
  return palabras.charAt(0).toUpperCase() + palabras.slice(1);
}

/** Totales y subtotales: los códigos que terminan en 9999 (activo corriente, total del activo, ganancia bruta, operativa, neta…), la variación del efectivo y el EBITDA. */
const esTotal = (codigo: string) => /9999$|^3240000$|^8000004$/.test(codigo);

/**
 * Las tablas completas: cada rubro en el orden del formulario más nuevo (los que solo aparecen en formularios viejos, al
 * final), con su valor en cada período. Los rubros vacíos en todos los períodos no se muestran.
 */
function armarDetalle(periodos: Periodo[], valorDe: ((codigo: string) => number | null)[], filas: Fila[]): DetalleFormulario {
  const nombres = new Map<string, string>();
  for (const x of [...filas].reverse()) for (const r of x.f.rubros ?? []) if (!nombres.has(r.codigo)) nombres.set(r.codigo, r.nombre);
  const detalle: DetalleFormulario = { periodos, resultados: [], balance: [], flujo: [] };
  for (const [codigo, nombre] of nombres) {
    const seccion = seccionDe(codigo);
    if (!seccion) continue;
    const valores = valorDe.map((v) => v(codigo));
    if (valores.every((x) => x === null || x === 0)) continue;
    const linea: LineaFormulario = { codigo, nombre: NOMBRES_CLAROS[codigo] ?? nombreRubro(nombre), total: esTotal(codigo), valores };
    detalle[seccion].push(linea);
  }
  // EBIT y EBITDA al final de los resultados.
  detalle.resultados.sort((a, b) => Number(a.codigo.startsWith("8")) - Number(b.codigo.startsWith("8")));
  return detalle;
}
