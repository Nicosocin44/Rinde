import { d } from "./decimal";
import { diasEntre, type FechaISO } from "./fechas";

/**
 * Balances y resultados de una empresa a partir de lo que presenta ante la SEC (XBRL de EDGAR). Puro: recibe los
 * "hechos" de la empresa tal como los publica la SEC y devuelve series anuales, trimestrales, el último balance y los
 * indicadores. Nunca inventa: si un concepto no está, queda en null.
 *
 * Reglas (verificadas con Apple, Mercado Libre, YPF, Galicia, TSMC, Nebius y Nu el 18/11/2026):
 * - Cada concepto se busca en una lista de nombres posibles (las empresas cambian de nombre de concepto con los años y
 *   las extranjeras usan IFRS). Para cada período se usa el primer nombre de la lista que tenga dato.
 * - La moneda es la del período más reciente (YPF pasó de pesos a dólares; TSMC informa en dólares taiwaneses y suma
 *   una traducción a dólares solo del último año: se elige la que tiene más datos).
 * - Si un mismo período aparece en varios balances, gana el presentado más tarde (las correcciones).
 * - En monedas con alta inflación (pesos), solo se comparan períodos del mismo balance: cada balance reexpresa los
 *   anteriores en moneda de su fecha, y mezclar balances distintos engaña.
 * - El cuarto trimestre no se informa: es el año menos los primeros nueve meses.
 */

export type HechoXbrl = {
  start?: string;
  end: string;
  val: number;
  accn: string;
  fy?: number | null;
  fp?: string | null;
  form: string;
  filed: string;
  frame?: string;
};

export type Concepto = { units: Record<string, HechoXbrl[]> };
export type HechosEmpresa = { cik: number; entityName: string; facts: Record<string, Record<string, Concepto>> };

type Nombre = [taxonomia: string, concepto: string];

/** Nombres posibles de cada concepto, en orden de preferencia. */
export const CONCEPTOS = {
  ingresos: [
    ["us-gaap", "Revenues"],
    ["us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax"],
    ["us-gaap", "RevenueFromContractWithCustomerIncludingAssessedTax"],
    ["us-gaap", "SalesRevenueNet"],
    ["us-gaap", "SalesRevenueGoodsNet"],
    ["ifrs-full", "Revenue"],
    ["ifrs-full", "RevenueFromContractsWithCustomers"],
  ],
  gananciaNeta: [
    ["us-gaap", "NetIncomeLoss"],
    ["us-gaap", "ProfitLoss"],
    ["us-gaap", "NetIncomeLossAvailableToCommonStockholdersBasic"],
    ["ifrs-full", "ProfitLossAttributableToOwnersOfParent"],
    ["ifrs-full", "ProfitLoss"],
  ],
  gananciaOperativa: [
    ["us-gaap", "OperatingIncomeLoss"],
    ["ifrs-full", "ProfitLossFromOperatingActivities"],
  ],
  flujoOperativo: [
    ["us-gaap", "NetCashProvidedByUsedInOperatingActivities"],
    ["us-gaap", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"],
    ["ifrs-full", "CashFlowsFromUsedInOperatingActivities"],
  ],
  inversion: [
    ["us-gaap", "PaymentsToAcquirePropertyPlantAndEquipment"],
    ["us-gaap", "PaymentsToAcquireProductiveAssets"],
    ["ifrs-full", "PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"],
    ["ifrs-full", "PurchaseOfPropertyPlantAndEquipmentIntangibleAssetsOtherThanGoodwillInvestmentPropertyAndOtherNoncurrentAssets"],
    ["ifrs-full", "PurchaseOfPropertyPlantAndEquipment"],
  ],
  bpa: [
    ["us-gaap", "EarningsPerShareDiluted"],
    ["us-gaap", "EarningsPerShareBasicAndDiluted"],
    ["us-gaap", "EarningsPerShareBasic"],
    ["ifrs-full", "DilutedEarningsLossPerShare"],
    ["ifrs-full", "BasicEarningsLossPerShare"],
  ],
  dividendoPorAccion: [
    ["us-gaap", "CommonStockDividendsPerShareDeclared"],
    ["us-gaap", "CommonStockDividendsPerShareCashPaid"],
  ],
  activos: [
    ["us-gaap", "Assets"],
    ["ifrs-full", "Assets"],
  ],
  pasivos: [
    ["us-gaap", "Liabilities"],
    ["ifrs-full", "Liabilities"],
  ],
  patrimonio: [
    ["us-gaap", "StockholdersEquity"],
    ["us-gaap", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
    ["ifrs-full", "EquityAttributableToOwnersOfParent"],
    ["ifrs-full", "Equity"],
  ],
  pasivosYPatrimonio: [
    ["us-gaap", "LiabilitiesAndStockholdersEquity"],
    ["ifrs-full", "EquityAndLiabilities"],
  ],
  caja: [
    ["us-gaap", "CashAndCashEquivalentsAtCarryingValue"],
    ["us-gaap", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
    ["us-gaap", "Cash"],
    ["ifrs-full", "CashAndCashEquivalents"],
  ],
  deuda: [
    ["us-gaap", "LongTermDebt"],
    ["us-gaap", "LongTermDebtNoncurrent"],
    ["ifrs-full", "Borrowings"],
  ],
  acciones: [["us-gaap", "WeightedAverageNumberOfDilutedSharesOutstanding"]],
} as const satisfies Record<string, readonly Nombre[]>;

/** Monedas con inflación alta: sus balances se reexpresan y no se comparan entre sí. */
const INFLACIONARIAS = new Set(["ARS", "TRY", "VES"]);
/** Solo los formularios con estados contables (la SEC también repite cifras en convocatorias a asamblea, prospectos, etc.). */
const CONTABLES = new Set(["10-K", "10-K/A", "10-Q", "10-Q/A", "20-F", "20-F/A", "40-F", "40-F/A", "6-K", "6-K/A"]);
const esMoneda = (u: string) => /^[A-Z]{3}$/.test(u);
const duracion = (h: HechoXbrl) => (h.start ? diasEntre(h.start, h.end) : 0);
const esAnual = (h: HechoXbrl) => duracion(h) >= 350 && duracion(h) <= 380;
const esTrimestre = (h: HechoXbrl) => duracion(h) >= 80 && duracion(h) <= 100;
const esNueveMeses = (h: HechoXbrl) => duracion(h) >= 260 && duracion(h) <= 285;
const esInstante = (h: HechoXbrl) => !h.start;

/** La moneda de los estados contables: la del período más reciente; si hay dos (traducción de cortesía), la que tiene más datos. */
export function monedaDe(hechos: HechosEmpresa): string | null {
  const conteo = new Map<string, { ultimo: string; cantidad: number }>();
  for (const [tax, concepto] of [...CONCEPTOS.ingresos, ...CONCEPTOS.activos, ...CONCEPTOS.gananciaNeta]) {
    const unidades = hechos.facts[tax]?.[concepto]?.units ?? {};
    for (const [u, lista] of Object.entries(unidades)) {
      if (!esMoneda(u)) continue;
      const c = conteo.get(u) ?? { ultimo: "", cantidad: 0 };
      for (const h of lista) if (h.end > c.ultimo) c.ultimo = h.end;
      c.cantidad += lista.length;
      conteo.set(u, c);
    }
  }
  const ordenadas = [...conteo.entries()].sort((a, b) => b[1].ultimo.localeCompare(a[1].ultimo) || b[1].cantidad - a[1].cantidad);
  return ordenadas[0]?.[0] ?? null;
}

/** Todos los hechos de un concepto en una unidad, con la prioridad del nombre (0 = el preferido). */
function hechosDe(hechos: HechosEmpresa, nombres: readonly Nombre[], unidad: string): (HechoXbrl & { prioridad: number })[] {
  return nombres.flatMap(([tax, concepto], prioridad) => (hechos.facts[tax]?.[concepto]?.units[unidad] ?? []).filter((h) => CONTABLES.has(h.form)).map((h) => ({ ...h, prioridad })));
}

/** Un valor por fecha de cierre: el del nombre preferido y, entre esos, el presentado más tarde. */
function porCierre<T extends HechoXbrl & { prioridad: number }>(lista: T[]): Map<string, T> {
  const salida = new Map<string, T>();
  for (const h of lista) {
    const previo = salida.get(h.end);
    if (!previo || h.prioridad < previo.prioridad || (h.prioridad === previo.prioridad && h.filed > previo.filed)) salida.set(h.end, h);
  }
  return salida;
}

export type FilaAnual = {
  /** Fecha de cierre del ejercicio. */
  fin: FechaISO;
  ingresos: number | null;
  gananciaNeta: number | null;
  gananciaOperativa: number | null;
  flujoOperativo: number | null;
  inversion: number | null;
  /** Flujo de caja libre: flujo operativo − inversión en bienes de uso. */
  flujoLibre: number | null;
  /** Ganancia por acción (diluida si la informa). */
  bpa: number | null;
  dividendoPorAccion: number | null;
  margenNeto: number | null;
};

export type FilaTrimestral = { fin: FechaISO; ingresos: number | null; gananciaNeta: number | null; derivado: boolean };

export type Documento = { fin: FechaISO; formulario: string; presentado: FechaISO; accn: string };

export type ResumenBalances = {
  empresa: string;
  cik: number;
  moneda: string;
  /** El documento más reciente con resultados (anual o trimestral). */
  ultimo: Documento;
  /** El formulario del último balance anual: 10-K (empresas de EE.UU.), 20-F (extranjeras) o 6-K. */
  formularioAnual: string;
  /** Bancos y financieras: no informan "ingresos" como el resto; el flujo de caja libre no aplica. */
  financiera: boolean;
  /** Últimos ejercicios, del más viejo al más nuevo (hasta 5). */
  anuales: FilaAnual[];
  /** Últimos trimestres, del más viejo al más nuevo (hasta 8). Vacío en monedas con inflación alta. */
  trimestres: FilaTrimestral[];
  /** Últimos 12 meses: suma de los últimos 4 trimestres seguidos o, si no hay, el último ejercicio. */
  ultimos12: { ingresos: number | null; gananciaNeta: number | null; hasta: FechaISO; fuente: "trimestres" | "ejercicio" } | null;
  balance: { fecha: FechaISO; activos: number | null; pasivos: number | null; patrimonio: number | null; caja: number | null; deuda: number | null } | null;
  crecimiento: { ingresos: number | null; gananciaNeta: number | null };
  margenNeto: number | null;
  margenOperativo: number | null;
  /** Ganancia de los últimos 12 meses sobre el patrimonio. */
  roe: number | null;
  /** Pasivos sobre patrimonio. */
  endeudamiento: number | null;
  /** Acciones (promedio diluido del último período informado). */
  acciones: number | null;
  /** Los pesos se reexpresan por inflación: solo se compara dentro del mismo balance. */
  ajustadoPorInflacion: boolean;
  /** El último balance cerró hace más de 15 meses. */
  desactualizado: boolean;
};

const div = (a: number | null, b: number | null) => (a === null || b === null || b === 0 ? null : d(a).div(b).toNumber());
const resta = (a: number | null, b: number | null) => (a === null || b === null ? null : d(a).minus(b).toNumber());
const variacion = (nuevo: number | null, viejo: number | null) => (nuevo === null || viejo === null || viejo <= 0 ? null : d(nuevo).div(viejo).minus(1).toNumber());

/** Arma el resumen. `hoy` define si el último balance está desactualizado. null si no hay ni ingresos ni ganancia anual. */
export function resumirBalances(hechos: HechosEmpresa, hoy: FechaISO): ResumenBalances | null {
  const moneda = monedaDe(hechos);
  if (!moneda) return null;
  const inflacionaria = INFLACIONARIAS.has(moneda);
  const porAccion = `${moneda}/shares`;
  const unidadDe = (c: keyof typeof CONCEPTOS) => (c === "bpa" || c === "dividendoPorAccion" ? porAccion : c === "acciones" ? "shares" : moneda);
  const todos = (c: keyof typeof CONCEPTOS) => hechosDe(hechos, CONCEPTOS[c], unidadDe(c));

  // El balance anual de referencia: el último ejercicio con ingresos o ganancia, y el documento más nuevo que lo trae.
  const anualesBase = [...todos("ingresos"), ...todos("gananciaNeta")].filter(esAnual);
  if (anualesBase.length === 0) return null;
  const finUltimo = anualesBase.reduce((m, h) => (h.end > m ? h.end : m), "");
  const docAnual = anualesBase.filter((h) => h.end === finUltimo).sort((a, b) => b.filed.localeCompare(a.filed))[0]!;
  // Solo los ejercicios que traen los dos últimos documentos con resultados anuales (unos cuatro años): más atrás aparecen
  // cifras de antes de reestructuraciones o mal cargadas. En pesos, solo el último (cada balance reexpresa los
  // anteriores en moneda de su fecha y mezclar balances distintos engaña).
  const docs = [...new Map(anualesBase.map((h) => [h.accn, h.filed])).entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([accn]) => accn);
  const docsUsados = new Set(docs.slice(0, inflacionaria ? 1 : 2));
  docsUsados.add(docAnual.accn);
  const filtroAnual = (h: HechoXbrl) => esAnual(h) && docsUsados.has(h.accn);

  const anual = (c: keyof typeof CONCEPTOS) => porCierre(todos(c).filter(filtroAnual));
  const series = {
    ingresos: anual("ingresos"),
    gananciaNeta: anual("gananciaNeta"),
    gananciaOperativa: anual("gananciaOperativa"),
    flujoOperativo: anual("flujoOperativo"),
    inversion: anual("inversion"),
    bpa: anual("bpa"),
    dividendoPorAccion: anual("dividendoPorAccion"),
  };
  // Cierres de ejercicio: los que tienen ingresos o ganancia, sin repetir (tolerancia de una semana por años de 52/53 semanas).
  const cierres = [...new Set([...series.ingresos.keys(), ...series.gananciaNeta.keys()])].sort();
  const valorEn = (m: Map<string, HechoXbrl>, fin: string) => m.get(fin)?.val ?? null;
  const anuales: FilaAnual[] = cierres.slice(-5).map((fin) => {
    const ingresos = valorEn(series.ingresos, fin);
    const gananciaNeta = valorEn(series.gananciaNeta, fin);
    const flujoOperativo = valorEn(series.flujoOperativo, fin);
    const inversion = valorEn(series.inversion, fin);
    return {
      fin,
      ingresos,
      gananciaNeta,
      gananciaOperativa: valorEn(series.gananciaOperativa, fin),
      flujoOperativo,
      inversion,
      flujoLibre: ingresos === null ? null : resta(flujoOperativo, inversion),
      bpa: valorEn(series.bpa, fin),
      dividendoPorAccion: valorEn(series.dividendoPorAccion, fin),
      margenNeto: div(gananciaNeta, ingresos),
    };
  });

  // Trimestres (no en monedas con inflación alta). El cuarto se deriva: año − nueve meses con el mismo inicio.
  const trimestres: FilaTrimestral[] = [];
  if (!inflacionaria) {
    const trimestral = (c: "ingresos" | "gananciaNeta") => {
      const lista = todos(c);
      const directos = porCierre(lista.filter(esTrimestre));
      const nueve = lista.filter(esNueveMeses);
      const salida = new Map<string, { val: number; derivado: boolean }>([...directos].map(([fin, h]) => [fin, { val: h.val, derivado: false }]));
      for (const a of porCierre(lista.filter(esAnual)).values()) {
        if (salida.has(a.end)) continue;
        const n = nueve.filter((h) => h.start === a.start && h.prioridad === a.prioridad).sort((x, y) => y.filed.localeCompare(x.filed))[0];
        if (n) salida.set(a.end, { val: d(a.val).minus(n.val).toNumber(), derivado: true });
      }
      return salida;
    };
    const ti = trimestral("ingresos");
    const tg = trimestral("gananciaNeta");
    const fines = [...new Set([...ti.keys(), ...tg.keys()])].sort().slice(-8);
    for (const fin of fines) trimestres.push({ fin, ingresos: ti.get(fin)?.val ?? null, gananciaNeta: tg.get(fin)?.val ?? null, derivado: !!(ti.get(fin)?.derivado || tg.get(fin)?.derivado) });
  }

  // Últimos 12 meses: los últimos 4 trimestres si son seguidos y llegan más lejos que el último ejercicio.
  const ultimoAnual = anuales.at(-1)!;
  let ultimos12: ResumenBalances["ultimos12"] = { ingresos: ultimoAnual.ingresos, gananciaNeta: ultimoAnual.gananciaNeta, hasta: ultimoAnual.fin, fuente: "ejercicio" };
  const cuatro = trimestres.slice(-4);
  const seguidos = cuatro.length === 4 && cuatro.every((t, i) => i === 0 || (diasEntre(cuatro[i - 1]!.fin, t.fin) >= 80 && diasEntre(cuatro[i - 1]!.fin, t.fin) <= 100));
  if (seguidos && cuatro.at(-1)!.fin > ultimoAnual.fin) {
    const suma = (k: "ingresos" | "gananciaNeta") => (cuatro.every((t) => t[k] !== null) ? cuatro.reduce((s, t) => s.plus(t[k]!), d(0)).toNumber() : null);
    ultimos12 = { ingresos: suma("ingresos"), gananciaNeta: suma("gananciaNeta"), hasta: cuatro.at(-1)!.fin, fuente: "trimestres" };
  }

  // Último balance (foto a una fecha). En pesos, el del mismo documento que el ejercicio de referencia o uno posterior.
  const instantes = (c: keyof typeof CONCEPTOS) => porCierre(todos(c).filter(esInstante));
  const activos = instantes("activos");
  const fechaBalance = [...activos.keys()].sort().at(-1) ?? null;
  let balance: ResumenBalances["balance"] = null;
  if (fechaBalance) {
    const en = (c: keyof typeof CONCEPTOS) => instantes(c).get(fechaBalance)?.val ?? null;
    const patrimonio = en("patrimonio");
    const pasivos = en("pasivos") ?? resta(en("pasivosYPatrimonio"), patrimonio);
    balance = { fecha: fechaBalance, activos: en("activos"), pasivos, patrimonio, caja: en("caja"), deuda: en("deuda") };
  }

  // El documento más reciente con resultados: puede ser un trimestral posterior al anual.
  const conResultados = [...todos("ingresos"), ...todos("gananciaNeta")].filter((h) => (esAnual(h) || esTrimestre(h) || esNueveMeses(h) || duracion(h) > 150) && h.end >= finUltimo);
  const ultimoDoc = conResultados.sort((a, b) => b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed))[0] ?? docAnual;
  const ultimo: Documento = { fin: ultimoDoc.end, formulario: ultimoDoc.form, presentado: ultimoDoc.filed, accn: ultimoDoc.accn };

  const accionesLista = todos("acciones").filter((h) => !esInstante(h));
  const acciones = accionesLista.sort((a, b) => b.end.localeCompare(a.end) || duracion(a) - duracion(b) || b.filed.localeCompare(a.filed))[0]?.val ?? null;

  // Crecimiento: último ejercicio contra el anterior, los dos del mismo documento (así las correcciones no mezclan).
  const delMismo = (c: "ingresos" | "gananciaNeta") => {
    const anuales = todos(c).filter(esAnual);
    const ultimoFin = anuales.reduce((m, h) => (h.end > m ? h.end : m), "");
    // El documento más nuevo que trae el último ejercicio y el anterior.
    const candidatos = [...new Set(anuales.filter((h) => h.end === ultimoFin).map((h) => h.accn))]
      .map((accn) => anuales.filter((h) => h.accn === accn))
      .filter((l) => l.some((h) => h.end < ultimoFin && diasEntre(h.end, ultimoFin) >= 350 && diasEntre(h.end, ultimoFin) <= 380))
      .sort((a, b) => b[0]!.filed.localeCompare(a[0]!.filed));
    const lista = candidatos[0];
    if (!lista) return null;
    const v = (fin: string) => lista.filter((h) => h.end === fin).sort((a, b) => a.prioridad - b.prioridad)[0]?.val ?? null;
    const anterior = lista.find((h) => h.end < ultimoFin && diasEntre(h.end, ultimoFin) >= 350 && diasEntre(h.end, ultimoFin) <= 380)!.end;
    return variacion(v(ultimoFin), v(anterior));
  };

  return {
    empresa: hechos.entityName,
    cik: hechos.cik,
    moneda,
    ultimo,
    formularioAnual: docAnual.form,
    financiera: anuales.every((a) => a.ingresos === null),
    anuales,
    trimestres,
    ultimos12,
    balance,
    crecimiento: { ingresos: delMismo("ingresos"), gananciaNeta: delMismo("gananciaNeta") },
    margenNeto: div(ultimos12?.gananciaNeta ?? null, ultimos12?.ingresos ?? null),
    margenOperativo: div(ultimoAnual.gananciaOperativa, ultimoAnual.ingresos),
    roe: div(ultimos12?.gananciaNeta ?? null, balance?.patrimonio && balance.patrimonio > 0 ? balance.patrimonio : null),
    endeudamiento: div(balance?.pasivos ?? null, balance?.patrimonio && balance.patrimonio > 0 ? balance.patrimonio : null),
    acciones,
    ajustadoPorInflacion: inflacionaria,
    desactualizado: diasEntre(ultimo.fin, hoy) > 456,
  };
}

export type Valuacion = {
  capitalizacion: number;
  /** Precio / ganancia de los últimos 12 meses. null si la ganancia es negativa o cero. */
  per: number | null;
  /** Precio / ingresos de los últimos 12 meses. */
  precioVentas: number | null;
  /** Precio / patrimonio. */
  precioValorLibro: number | null;
  /** Dividendo del último ejercicio / precio. */
  rendimientoDividendo: number | null;
};

/**
 * Múltiplos con el precio de hoy de una acción. Solo tiene sentido si el precio y el balance están en la misma moneda
 * y el precio es de una acción (no de un ADR, que puede representar varias): quien llama lo garantiza.
 */
export function valuar(r: ResumenBalances, precioAccion: number): Valuacion | null {
  if (!(precioAccion > 0) || !r.acciones || r.acciones <= 0) return null;
  const capitalizacion = d(precioAccion).mul(r.acciones).toNumber();
  const ganancia = r.ultimos12?.gananciaNeta ?? null;
  const dividendo = r.anuales.at(-1)?.dividendoPorAccion ?? null;
  return {
    capitalizacion,
    per: ganancia !== null && ganancia > 0 ? d(capitalizacion).div(ganancia).toNumber() : null,
    precioVentas: div(capitalizacion, r.ultimos12?.ingresos ?? null),
    precioValorLibro: r.balance?.patrimonio && r.balance.patrimonio > 0 ? d(capitalizacion).div(r.balance.patrimonio).toNumber() : null,
    rendimientoDividendo: dividendo !== null && dividendo > 0 ? d(dividendo).div(precioAccion).toNumber() : null,
  };
}
