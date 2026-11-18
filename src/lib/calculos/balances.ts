import { d } from "./decimal";
import { diasEntre, type FechaISO } from "./fechas";

/**
 * Estados contables de una empresa a partir de lo que presenta ante la SEC (XBRL de EDGAR). Puro: recibe los "hechos"
 * de la empresa tal como los publica la SEC y devuelve el estado de resultados, el balance y el flujo de efectivo, por
 * ejercicio y por trimestre, los últimos 12 meses y los indicadores clave. Nunca inventa: si un concepto no está, queda
 * en null.
 *
 * Reglas (verificadas con Apple, Coca-Cola, Nvidia, Mercado Libre, YPF, Galicia, TSMC, Nebius y Nu el 18/11/2026):
 * - Cada cuenta se busca en una lista de nombres posibles (US GAAP e IFRS; las empresas cambian de nombre con los años).
 *   Para cada período se usa el primer nombre de la lista que tenga dato.
 * - Solo formularios contables (10-K, 10-Q, 20-F, 40-F, 6-K): la SEC también repite cifras en convocatorias a asamblea,
 *   prospectos, etc.
 * - La moneda es la del período más reciente; si hay dos (traducción de cortesía), la que tiene más datos.
 * - Si un mismo período aparece en varios balances, gana el presentado más tarde (las correcciones).
 * - Ejercicios: los que traen los dos últimos balances anuales (unos cuatro años). Más atrás aparecen cifras de antes de
 *   reestructuraciones o mal cargadas.
 * - Trimestres: los resultados vienen por trimestre, pero el flujo de efectivo viene acumulado en el año (3, 6, 9 y 12
 *   meses): cada trimestre es la diferencia entre dos acumulados. El cuarto, que no se informa, es el año menos nueve meses.
 * - En monedas con inflación alta (pesos), solo se comparan ejercicios del mismo balance y no hay trimestres: cada
 *   balance reexpresa los anteriores en moneda de su fecha y mezclar balances distintos engaña.
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

type Nombre = readonly [taxonomia: string, concepto: string];
type Tipo = "flujo" | "saldo" | "porAccion" | "acciones";
type Cuenta = { tipo: Tipo; conceptos: readonly Nombre[] };

const g = (c: string): Nombre => ["us-gaap", c];
const i = (c: string): Nombre => ["ifrs-full", c];

/** Las cuentas de los tres estados, con sus nombres posibles en orden de preferencia. */
export const CUENTAS = {
  // ── Estado de resultados ──
  ingresos: { tipo: "flujo", conceptos: [g("Revenues"), g("RevenueFromContractWithCustomerExcludingAssessedTax"), g("RevenueFromContractWithCustomerIncludingAssessedTax"), g("SalesRevenueNet"), g("SalesRevenueGoodsNet"), i("Revenue"), i("RevenueFromContractsWithCustomers")] },
  costoVentas: { tipo: "flujo", conceptos: [g("CostOfRevenue"), g("CostOfGoodsAndServicesSold"), g("CostOfGoodsSold"), i("CostOfSales")] },
  gananciaBruta: { tipo: "flujo", conceptos: [g("GrossProfit"), i("GrossProfit")] },
  investigacion: { tipo: "flujo", conceptos: [g("ResearchAndDevelopmentExpense"), g("ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost"), i("ResearchAndDevelopmentExpense")] },
  gastosComerciales: { tipo: "flujo", conceptos: [g("SellingGeneralAndAdministrativeExpense"), i("SellingGeneralAndAdministrativeExpense")] },
  gananciaOperativa: { tipo: "flujo", conceptos: [g("OperatingIncomeLoss"), i("ProfitLossFromOperatingActivities")] },
  intereses: { tipo: "flujo", conceptos: [g("InterestExpense"), g("InterestExpenseNonoperating"), g("InterestExpenseDebt"), i("FinanceCosts"), i("InterestExpense")] },
  gananciaAntesImpuestos: {
    tipo: "flujo",
    conceptos: [g("IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest"), g("IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments"), i("ProfitLossBeforeTax")],
  },
  impuestos: { tipo: "flujo", conceptos: [g("IncomeTaxExpenseBenefit"), i("IncomeTaxExpenseContinuingOperations")] },
  gananciaNeta: { tipo: "flujo", conceptos: [g("NetIncomeLoss"), g("ProfitLoss"), g("NetIncomeLossAvailableToCommonStockholdersBasic"), i("ProfitLossAttributableToOwnersOfParent"), i("ProfitLoss")] },
  depreciacion: {
    tipo: "flujo",
    conceptos: [g("DepreciationDepletionAndAmortization"), g("DepreciationAndAmortization"), g("DepreciationAmortizationAndAccretionNet"), g("Depreciation"), i("DepreciationAndAmortisationExpense"), i("AdjustmentsForDepreciationAndAmortisationExpense"), i("DepreciationAmortisationAndImpairmentLossReversalOfImpairmentLossRecognisedInProfitOrLoss")],
  },
  bpa: { tipo: "porAccion", conceptos: [g("EarningsPerShareDiluted"), g("EarningsPerShareBasicAndDiluted"), g("EarningsPerShareBasic"), i("DilutedEarningsLossPerShare"), i("BasicEarningsLossPerShare")] },
  dividendoPorAccion: { tipo: "porAccion", conceptos: [g("CommonStockDividendsPerShareDeclared"), g("CommonStockDividendsPerShareCashPaid")] },
  acciones: { tipo: "acciones", conceptos: [g("WeightedAverageNumberOfDilutedSharesOutstanding")] },
  // ── Flujo de efectivo ──
  flujoOperativo: { tipo: "flujo", conceptos: [g("NetCashProvidedByUsedInOperatingActivities"), g("NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"), i("CashFlowsFromUsedInOperatingActivities")] },
  inversion: {
    tipo: "flujo",
    conceptos: [g("PaymentsToAcquirePropertyPlantAndEquipment"), g("PaymentsToAcquireProductiveAssets"), i("PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"), i("PurchaseOfPropertyPlantAndEquipmentIntangibleAssetsOtherThanGoodwillInvestmentPropertyAndOtherNoncurrentAssets"), i("PurchaseOfPropertyPlantAndEquipment")],
  },
  flujoInversion: { tipo: "flujo", conceptos: [g("NetCashProvidedByUsedInInvestingActivities"), g("NetCashProvidedByUsedInInvestingActivitiesContinuingOperations"), i("CashFlowsFromUsedInInvestingActivities")] },
  flujoFinanciacion: { tipo: "flujo", conceptos: [g("NetCashProvidedByUsedInFinancingActivities"), g("NetCashProvidedByUsedInFinancingActivitiesContinuingOperations"), i("CashFlowsFromUsedInFinancingActivities")] },
  dividendosPagados: { tipo: "flujo", conceptos: [g("PaymentsOfDividends"), g("PaymentsOfDividendsCommonStock"), i("DividendsPaidClassifiedAsFinancingActivities"), i("DividendsPaid")] },
  recompras: { tipo: "flujo", conceptos: [g("PaymentsForRepurchaseOfCommonStock"), i("PaymentsToAcquireOrRedeemEntitysShares"), i("PurchaseOfTreasuryShares")] },
  // ── Balance ──
  caja: { tipo: "saldo", conceptos: [g("CashAndCashEquivalentsAtCarryingValue"), g("CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"), g("Cash"), i("CashAndCashEquivalents")] },
  inversionesCortoPlazo: { tipo: "saldo", conceptos: [g("ShortTermInvestments"), g("MarketableSecuritiesCurrent"), g("AvailableForSaleSecuritiesDebtSecuritiesCurrent"), i("CurrentInvestments"), i("OtherCurrentFinancialAssets")] },
  cuentasPorCobrar: { tipo: "saldo", conceptos: [g("AccountsReceivableNetCurrent"), i("TradeAndOtherCurrentReceivables"), i("CurrentTradeReceivables")] },
  inventarios: { tipo: "saldo", conceptos: [g("InventoryNet"), i("Inventories")] },
  activoCorriente: { tipo: "saldo", conceptos: [g("AssetsCurrent"), i("CurrentAssets")] },
  bienesDeUso: { tipo: "saldo", conceptos: [g("PropertyPlantAndEquipmentNet"), i("PropertyPlantAndEquipment")] },
  llaveDeNegocio: { tipo: "saldo", conceptos: [g("Goodwill"), i("Goodwill")] },
  intangibles: { tipo: "saldo", conceptos: [g("IntangibleAssetsNetExcludingGoodwill"), g("FiniteLivedIntangibleAssetsNet"), i("IntangibleAssetsOtherThanGoodwill")] },
  activos: { tipo: "saldo", conceptos: [g("Assets"), i("Assets")] },
  cuentasPorPagar: { tipo: "saldo", conceptos: [g("AccountsPayableCurrent"), g("AccountsPayableAndAccruedLiabilitiesCurrent"), i("TradeAndOtherCurrentPayables"), i("CurrentTradePayables")] },
  // La deuda se informa en partes que cambian según la empresa: préstamos de corto plazo y papeles comerciales, la porción
  // corriente de la deuda de largo plazo, la de largo plazo y, en IFRS, los bonos por separado. Ver deudaDe().
  deudaCorrienteInformada: { tipo: "saldo", conceptos: [g("DebtCurrent"), i("CurrentBorrowingsAndCurrentPortionOfNoncurrentBorrowings")] },
  prestamosCortoPlazo: { tipo: "saldo", conceptos: [g("CommercialPaper"), g("ShortTermBorrowings"), g("NotesAndLoansPayable"), i("ShorttermBorrowings")] },
  porcionCorrienteDeuda: { tipo: "saldo", conceptos: [g("LongTermDebtCurrent"), g("LongTermDebtAndCapitalLeaseObligationsCurrent"), i("CurrentPortionOfLongtermBorrowings")] },
  bonosCorrientes: { tipo: "saldo", conceptos: [i("CurrentBondsIssuedAndCurrentPortionOfNoncurrentBondsIssued")] },
  pasivoCorriente: { tipo: "saldo", conceptos: [g("LiabilitiesCurrent"), i("CurrentLiabilities")] },
  deudaLargoPlazo: { tipo: "saldo", conceptos: [g("LongTermDebtNoncurrent"), g("LongTermDebtAndCapitalLeaseObligations"), g("LongTermLoansPayable"), i("NoncurrentPortionOfNoncurrentBorrowings"), i("LongtermBorrowings")] },
  bonosNoCorrientes: { tipo: "saldo", conceptos: [i("NoncurrentPortionOfNoncurrentBondsIssued")] },
  /** US GAAP: la deuda de largo plazo con su porción corriente (sin los préstamos de corto plazo), si la informa. */
  deuda: { tipo: "saldo", conceptos: [g("LongTermDebt"), g("LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities")] },
  /** IFRS: los préstamos totales (corto y largo plazo), si los informa. */
  prestamos: { tipo: "saldo", conceptos: [i("Borrowings")] },
  pasivos: { tipo: "saldo", conceptos: [g("Liabilities"), i("Liabilities")] },
  patrimonio: { tipo: "saldo", conceptos: [g("StockholdersEquity"), g("StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"), i("EquityAttributableToOwnersOfParent"), i("Equity")] },
  pasivosYPatrimonio: { tipo: "saldo", conceptos: [g("LiabilitiesAndStockholdersEquity"), i("EquityAndLiabilities")] },
} as const satisfies Record<string, Cuenta>;

export type ClaveCuenta = keyof typeof CUENTAS;
/** Las calculadas a partir de otras: flujo libre, EBITDA y deuda total. */
export type ClaveDerivada = "flujoLibre" | "ebitda" | "deudaCorriente" | "deudaNoCorriente" | "deudaTotal";
export type Clave = ClaveCuenta | ClaveDerivada;

/** Todos los conceptos que usamos (el adaptador de la SEC descarta el resto). */
export const CONCEPTOS_USADOS: Nombre[] = Object.values(CUENTAS).flatMap((c) => [...c.conceptos]);

const CLAVES = Object.keys(CUENTAS) as ClaveCuenta[];
const tipoDe = (c: ClaveCuenta): Tipo => CUENTAS[c].tipo;

/** Monedas con inflación alta: sus balances se reexpresan y no se comparan entre sí. */
const INFLACIONARIAS = new Set(["ARS", "TRY", "VES"]);
const CONTABLES = new Set(["10-K", "10-K/A", "10-Q", "10-Q/A", "20-F", "20-F/A", "40-F", "40-F/A", "6-K", "6-K/A"]);
const esMoneda = (u: string) => /^[A-Z]{3}$/.test(u);
const duracion = (h: HechoXbrl) => (h.start ? diasEntre(h.start, h.end) : 0);
const entre = (x: number, a: number, b: number) => x >= a && x <= b;
const esAnual = (h: HechoXbrl) => entre(duracion(h), 350, 380);
const esTrimestre = (h: HechoXbrl) => entre(duracion(h), 80, 100);
const esAcumulado = (h: HechoXbrl) => [esTrimestre(h), entre(duracion(h), 170, 195), entre(duracion(h), 260, 285), esAnual(h)].some(Boolean);
const esInstante = (h: HechoXbrl) => !h.start;
const unTrimestreDespues = (a: string, b: string) => entre(diasEntre(a, b), 80, 100);
const unAnioDespues = (a: string, b: string) => entre(diasEntre(a, b), 350, 380);

/** La moneda de los estados contables: la del período más reciente; si hay dos (traducción de cortesía), la que tiene más datos. */
export function monedaDe(hechos: HechosEmpresa): string | null {
  const conteo = new Map<string, { ultimo: string; cantidad: number }>();
  for (const [tax, concepto] of [...CUENTAS.ingresos.conceptos, ...CUENTAS.activos.conceptos, ...CUENTAS.gananciaNeta.conceptos]) {
    for (const [u, lista] of Object.entries(hechos.facts[tax]?.[concepto]?.units ?? {})) {
      if (!esMoneda(u)) continue;
      const c = conteo.get(u) ?? { ultimo: "", cantidad: 0 };
      for (const h of lista) if (h.end > c.ultimo) c.ultimo = h.end;
      c.cantidad += lista.length;
      conteo.set(u, c);
    }
  }
  return [...conteo.entries()].sort((a, b) => b[1].ultimo.localeCompare(a[1].ultimo) || b[1].cantidad - a[1].cantidad)[0]?.[0] ?? null;
}

type HechoP = HechoXbrl & { prioridad: number };

/** Un valor por fecha de cierre: el del nombre preferido y, entre esos, el presentado más tarde. */
function porCierre(lista: HechoP[]): Map<string, HechoP> {
  const salida = new Map<string, HechoP>();
  for (const h of lista) {
    const previo = salida.get(h.end);
    if (!previo || h.prioridad < previo.prioridad || (h.prioridad === previo.prioridad && h.filed > previo.filed)) salida.set(h.end, h);
  }
  return salida;
}

/**
 * Trimestres de una cuenta de flujo: los informados por trimestre y, si no, la diferencia entre dos acumulados del mismo
 * ejercicio (6 meses − 3, 9 − 6, 12 − 9). Así salen el flujo de efectivo trimestral y el cuarto trimestre.
 */
function trimestresDe(lista: HechoP[]): Map<string, { val: number; derivado: boolean }> {
  const salida = new Map<string, { val: number; derivado: boolean }>([...porCierre(lista.filter(esTrimestre))].map(([fin, h]) => [fin, { val: h.val, derivado: false }]));
  const grupos = new Map<string, HechoP[]>();
  for (const h of lista.filter(esAcumulado)) grupos.set(`${h.prioridad}|${h.start}`, [...(grupos.get(`${h.prioridad}|${h.start}`) ?? []), h]);
  for (const grupo of [...grupos.values()].sort((a, b) => a[0]!.prioridad - b[0]!.prioridad)) {
    const acumulados = [...porCierre(grupo).values()].sort((a, b) => a.end.localeCompare(b.end));
    for (let k = 1; k < acumulados.length; k++) {
      const antes = acumulados[k - 1]!;
      const ahora = acumulados[k]!;
      if (salida.has(ahora.end) || !unTrimestreDespues(antes.end, ahora.end)) continue;
      salida.set(ahora.end, { val: d(ahora.val).minus(antes.val).toNumber(), derivado: true });
    }
  }
  return salida;
}

export type Periodo = { fin: FechaISO; /** Algún valor sale de restar acumulados (no lo informó así la empresa). */ derivado: boolean };
/** Un estado por período: `valores[clave][i]` es el valor del período `periodos[i]`. */
export type Estados = { periodos: Periodo[]; valores: Record<Clave, (number | null)[]> };
export type Documento = { fin: FechaISO; formulario: string; presentado: FechaISO; accn: string };

export type Indicadores = {
  // Rentabilidad (últimos 12 meses)
  margenBruto: number | null;
  margenOperativo: number | null;
  margenEbitda: number | null;
  margenNeto: number | null;
  /** Ganancia de 12 meses / patrimonio del último balance. */
  roe: number | null;
  /** Ganancia de 12 meses / activos del último balance. */
  roa: number | null;
  // Crecimiento
  /** Último ejercicio contra el anterior, los dos del mismo balance. */
  crecimientoIngresos: number | null;
  crecimientoGanancia: number | null;
  /** Último trimestre contra el mismo trimestre del año anterior. */
  ingresosInteranual: number | null;
  gananciaInteranual: number | null;
  // Salud financiera (último balance)
  liquidezCorriente: number | null;
  pruebaAcida: number | null;
  deudaNeta: number | null;
  deudaPatrimonio: number | null;
  pasivosPatrimonio: number | null;
  deudaNetaEbitda: number | null;
  /** Ganancia operativa / intereses (12 meses). */
  coberturaIntereses: number | null;
  // Por acción y accionistas
  bpa12m: number | null;
  /** Dividendos pagados / ganancia neta (12 meses). */
  payout: number | null;
};

export type ResumenBalances = {
  empresa: string;
  cik: number;
  moneda: string;
  /** El documento más reciente con resultados (anual o trimestral). */
  ultimo: Documento;
  /** El formulario del último balance anual: 10-K (EE.UU.), 20-F (extranjeras) o 6-K. */
  formularioAnual: string;
  /** Bancos y financieras: no informan "ingresos" como el resto; el flujo de caja libre no aplica. */
  financiera: boolean;
  /** Los pesos se reexpresan por inflación: solo se compara dentro del mismo balance. */
  ajustadoPorInflacion: boolean;
  /** El último balance cerró hace más de 15 meses. */
  desactualizado: boolean;
  /** Ejercicios, del más viejo al más nuevo (hasta 5). */
  anual: Estados;
  /** Trimestres, del más viejo al más nuevo (hasta 8). null en monedas con inflación alta o si la empresa no los carga. */
  trimestral: Estados | null;
  /** Últimos 12 meses: la suma de los últimos 4 trimestres seguidos o, si no hay, el último ejercicio. */
  ultimos12: { hasta: FechaISO; fuente: "trimestres" | "ejercicio"; valores: Partial<Record<Clave, number | null>> };
  /** El balance más reciente. */
  balance: { fecha: FechaISO; valores: Partial<Record<Clave, number | null>> } | null;
  indicadores: Indicadores;
  /** Acciones (promedio diluido del último período informado). */
  acciones: number | null;
};

const div = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null || b === 0 ? null : d(a).div(b).toNumber());
const suma = (...xs: (number | null | undefined)[]) => (xs.every((x) => x == null) ? null : xs.reduce<ReturnType<typeof d>>((s, x) => s.plus(x ?? 0), d(0)).toNumber());
const resta = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null ? null : d(a).minus(b).toNumber());
const variacion = (nuevo: number | null | undefined, viejo: number | null | undefined) => (nuevo == null || viejo == null || viejo <= 0 ? null : d(nuevo).div(viejo).minus(1).toNumber());
const positivo = (x: number | null | undefined) => (x != null && x > 0 ? x : null);

/** Completa las derivadas de un período: ganancia bruta si falta, flujo libre, EBITDA, deuda total y pasivos si faltan. */
function derivar(v: Partial<Record<Clave, number | null>>, financiera: boolean): void {
  v.gananciaBruta ??= resta(v.ingresos, v.costoVentas);
  v.flujoLibre = financiera ? null : resta(v.flujoOperativo, v.inversion);
  // En bancos el EBITDA no se usa (los intereses son su negocio).
  v.ebitda = financiera || v.gananciaOperativa == null || v.depreciacion == null ? null : d(v.gananciaOperativa).plus(v.depreciacion).toNumber();
  // Corriente: el total si la empresa lo informa; si no, la suma de sus partes. No corriente: largo plazo + bonos.
  v.deudaCorriente = v.deudaCorrienteInformada ?? suma(v.prestamosCortoPlazo, v.porcionCorrienteDeuda, v.bonosCorrientes);
  v.deudaNoCorriente = suma(v.deudaLargoPlazo, v.bonosNoCorrientes);
  // Total: en US GAAP, la deuda de largo plazo con su porción corriente más los papeles comerciales (las partes a veces
  // cambian de nombre entre un trimestre y otro). En IFRS, los préstamos totales, salvo que informe los bonos aparte
  // (ahí "préstamos" no los incluye). Si no hay totales, la suma de las partes.
  const conBonos = v.bonosCorrientes != null || v.bonosNoCorrientes != null;
  v.deudaTotal =
    v.deuda != null
      ? suma(v.deuda, v.prestamosCortoPlazo)
      : v.prestamos != null && !conBonos
        ? v.prestamos
        : v.deudaCorriente != null || v.deudaNoCorriente != null
          ? suma(v.deudaCorriente, v.deudaNoCorriente)
          : null;
  v.pasivos ??= resta(v.pasivosYPatrimonio, v.patrimonio);
}

/** Arma el resumen. `hoy` define si el último balance está desactualizado. null si no hay resultados anuales. */
export function resumirBalances(hechos: HechosEmpresa, hoy: FechaISO): ResumenBalances | null {
  const moneda = monedaDe(hechos);
  if (!moneda) return null;
  const inflacionaria = INFLACIONARIAS.has(moneda);
  const unidad = (t: Tipo) => (t === "porAccion" ? `${moneda}/shares` : t === "acciones" ? "shares" : moneda);
  const listas = new Map<ClaveCuenta, HechoP[]>(
    CLAVES.map((c) => [
      c,
      CUENTAS[c].conceptos.flatMap(([tax, concepto], prioridad) =>
        (hechos.facts[tax]?.[concepto]?.units[unidad(tipoDe(c))] ?? []).filter((h) => CONTABLES.has(h.form)).map((h) => ({ ...h, prioridad })),
      ),
    ]),
  );
  const de = (c: ClaveCuenta) => listas.get(c)!;

  // El balance anual de referencia: el último ejercicio con ingresos o ganancia, y el documento más nuevo que lo trae.
  const anualesBase = [...de("ingresos"), ...de("gananciaNeta")].filter(esAnual);
  if (anualesBase.length === 0) return null;
  const finUltimo = anualesBase.reduce((m, h) => (h.end > m ? h.end : m), "");
  const docAnual = anualesBase.filter((h) => h.end === finUltimo).sort((a, b) => b.filed.localeCompare(a.filed))[0]!;
  const docs = [...new Map(anualesBase.map((h) => [h.accn, h.filed])).entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([accn]) => accn);
  const docsUsados = new Set([...docs.slice(0, inflacionaria ? 1 : 2), docAnual.accn]);

  // ── Ejercicios ──
  const cierres = [...new Set([...de("ingresos"), ...de("gananciaNeta")].filter((h) => esAnual(h) && docsUsados.has(h.accn)).map((h) => h.end))].sort().slice(-5);
  const financiera = !de("ingresos").some((h) => esAnual(h) && docsUsados.has(h.accn));
  const anualPorCuenta = new Map<ClaveCuenta, Map<string, HechoP>>(
    CLAVES.map((c) => [c, porCierre(de(c).filter((h) => (tipoDe(c) === "saldo" ? esInstante(h) && (!inflacionaria || h.accn === docAnual.accn) : esAnual(h) && docsUsados.has(h.accn))))]),
  );
  const anual = armarEstados(
    cierres.map((fin) => ({ fin, derivado: false })),
    (c, fin) => anualPorCuenta.get(c)!.get(fin)?.val ?? null,
    financiera,
  );

  // ── Trimestres ──
  let trimestral: Estados | null = null;
  if (!inflacionaria) {
    const porCuenta = new Map<ClaveCuenta, Map<string, { val: number; derivado: boolean }>>(
      CLAVES.map((c) => {
        const t = tipoDe(c);
        if (t === "flujo") return [c, trimestresDe(de(c))];
        const m = porCierre(de(c).filter(t === "saldo" ? esInstante : esTrimestre));
        return [c, new Map([...m].map(([fin, h]) => [fin, { val: h.val, derivado: false }]))];
      }),
    );
    const fines = [...new Set([...porCuenta.get("ingresos")!.keys(), ...porCuenta.get("gananciaNeta")!.keys()])].sort().slice(-8);
    if (fines.length > 0) {
      trimestral = armarEstados(
        fines.map((fin) => ({ fin, derivado: !!(porCuenta.get("ingresos")!.get(fin)?.derivado || porCuenta.get("gananciaNeta")!.get(fin)?.derivado) })),
        (c, fin) => porCuenta.get(c)!.get(fin)?.val ?? null,
        financiera,
      );
    }
  }

  // ── Últimos 12 meses ──
  const n = anual.periodos.length - 1;
  const delAnio = (c: Clave) => anual.valores[c][n] ?? null;
  let ultimos12: ResumenBalances["ultimos12"] = { hasta: anual.periodos[n]!.fin, fuente: "ejercicio", valores: {} };
  const tp = trimestral?.periodos ?? [];
  const cuatro = tp.slice(-4);
  const seguidos = cuatro.length === 4 && cuatro.every((p, k) => k === 0 || unTrimestreDespues(cuatro[k - 1]!.fin, p.fin));
  const usarTrimestres = seguidos && cuatro.at(-1)!.fin > anual.periodos[n]!.fin;
  if (usarTrimestres) ultimos12 = { hasta: cuatro.at(-1)!.fin, fuente: "trimestres", valores: {} };
  for (const c of [...CLAVES.filter((c) => tipoDe(c) === "flujo"), "flujoLibre", "ebitda"] as Clave[]) {
    if (!usarTrimestres) ultimos12.valores[c] = delAnio(c);
    else {
      const ultimos = trimestral!.valores[c].slice(-4);
      ultimos12.valores[c] = ultimos.every((x) => x !== null) ? ultimos.reduce<ReturnType<typeof d>>((s, x) => s.plus(x!), d(0)).toNumber() : null;
    }
  }

  // ── Último balance: la foto más reciente ──
  const fechaBalance = [...porCierre(de("activos").filter(esInstante)).keys()].sort().at(-1) ?? null;
  let balance: ResumenBalances["balance"] = null;
  if (fechaBalance) {
    const valores: Partial<Record<Clave, number | null>> = {};
    for (const c of CLAVES.filter((c) => tipoDe(c) === "saldo")) valores[c] = porCierre(de(c).filter(esInstante)).get(fechaBalance)?.val ?? null;
    derivar(valores, financiera);
    balance = { fecha: fechaBalance, valores };
  }

  // ── Documento más reciente y acciones ──
  const conResultados = [...de("ingresos"), ...de("gananciaNeta")].filter((h) => duracion(h) >= 80 && h.end >= finUltimo);
  const ultimoDoc = conResultados.sort((a, b) => b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed))[0] ?? docAnual;
  const acciones = de("acciones").filter((h) => !esInstante(h)).sort((a, b) => b.end.localeCompare(a.end) || duracion(a) - duracion(b) || b.filed.localeCompare(a.filed))[0]?.val ?? null;

  // ── Indicadores ──
  const u = ultimos12.valores;
  const b = balance?.valores ?? {};
  const patrimonio = positivo(b.patrimonio);
  // En bancos la deuda neta no significa nada (la caja es la plata de los depositantes).
  const deudaNeta = financiera || b.deudaTotal == null ? null : d(b.deudaTotal).minus(b.caja ?? 0).minus(b.inversionesCortoPlazo ?? 0).toNumber();
  const interanual = (c: Clave) => {
    if (!trimestral || tp.length < 5) return null;
    const ultimo = tp.length - 1;
    const anterior = tp.findIndex((p) => unAnioDespues(p.fin, tp[ultimo]!.fin));
    return anterior < 0 ? null : variacion(trimestral.valores[c][ultimo], trimestral.valores[c][anterior]);
  };
  const delMismo = (c: "ingresos" | "gananciaNeta") => {
    const anuales = de(c).filter(esAnual);
    const ultimoFin = anuales.reduce((m, h) => (h.end > m ? h.end : m), "");
    // El documento más nuevo que trae el último ejercicio y el anterior (así las correcciones no se mezclan).
    const lista = [...new Set(anuales.filter((h) => h.end === ultimoFin).map((h) => h.accn))]
      .map((accn) => anuales.filter((h) => h.accn === accn))
      .filter((l) => l.some((h) => unAnioDespues(h.end, ultimoFin)))
      .sort((a, x) => x[0]!.filed.localeCompare(a[0]!.filed))[0];
    if (!lista) return null;
    const v = (fin: string) => lista.filter((h) => h.end === fin).sort((a, x) => a.prioridad - x.prioridad)[0]?.val ?? null;
    return variacion(v(ultimoFin), v(lista.find((h) => unAnioDespues(h.end, ultimoFin))!.end));
  };

  const indicadores: Indicadores = {
    margenBruto: div(u.gananciaBruta, positivo(u.ingresos)),
    margenOperativo: div(u.gananciaOperativa, positivo(u.ingresos)),
    margenEbitda: div(u.ebitda, positivo(u.ingresos)),
    margenNeto: div(u.gananciaNeta, positivo(u.ingresos)),
    roe: div(u.gananciaNeta, patrimonio),
    roa: div(u.gananciaNeta, positivo(b.activos)),
    crecimientoIngresos: delMismo("ingresos"),
    crecimientoGanancia: delMismo("gananciaNeta"),
    ingresosInteranual: interanual("ingresos"),
    gananciaInteranual: interanual("gananciaNeta"),
    liquidezCorriente: div(b.activoCorriente, positivo(b.pasivoCorriente)),
    pruebaAcida: b.activoCorriente == null ? null : div(d(b.activoCorriente).minus(b.inventarios ?? 0).toNumber(), positivo(b.pasivoCorriente)),
    deudaNeta,
    deudaPatrimonio: div(b.deudaTotal, patrimonio),
    pasivosPatrimonio: div(b.pasivos, patrimonio),
    deudaNetaEbitda: div(deudaNeta, positivo(u.ebitda)),
    coberturaIntereses: financiera ? null : div(u.gananciaOperativa, positivo(u.intereses)),
    bpa12m: div(u.gananciaNeta, positivo(acciones)),
    payout: div(u.dividendosPagados, positivo(u.gananciaNeta)),
  };

  return {
    empresa: hechos.entityName,
    cik: hechos.cik,
    moneda,
    ultimo: { fin: ultimoDoc.end, formulario: ultimoDoc.form, presentado: ultimoDoc.filed, accn: ultimoDoc.accn },
    formularioAnual: docAnual.form,
    financiera,
    ajustadoPorInflacion: inflacionaria,
    desactualizado: diasEntre(ultimoDoc.end, hoy) > 456,
    anual,
    trimestral,
    ultimos12,
    balance,
    indicadores,
    acciones,
  };
}

function armarEstados(periodos: Periodo[], valor: (c: ClaveCuenta, fin: string) => number | null, financiera: boolean): Estados {
  const valores = Object.fromEntries([...CLAVES, "flujoLibre", "ebitda", "deudaCorriente", "deudaNoCorriente", "deudaTotal"].map((c) => [c, [] as (number | null)[]])) as Estados["valores"];
  for (const p of periodos) {
    const v: Partial<Record<Clave, number | null>> = {};
    for (const c of CLAVES) v[c] = valor(c, p.fin);
    derivar(v, financiera);
    for (const c of Object.keys(valores) as Clave[]) valores[c].push(v[c] ?? null);
  }
  return { periodos, valores };
}

export type Valuacion = {
  capitalizacion: number;
  /** Capitalización + deuda − caja e inversiones de corto plazo. */
  valorEmpresa: number | null;
  /** Precio / ganancia de los últimos 12 meses. null si la ganancia es negativa o cero. */
  per: number | null;
  precioVentas: number | null;
  precioValorLibro: number | null;
  evEbitda: number | null;
  /** Dividendo del último ejercicio / precio (o, si no informa el dividendo por acción, dividendos pagados / capitalización). */
  rendimientoDividendo: number | null;
  /** Flujo de caja libre de 12 meses / capitalización. */
  rendimientoFlujoLibre: number | null;
};

/**
 * Múltiplos con el precio de hoy de una acción. Solo tiene sentido si el precio y el balance están en la misma moneda
 * y el precio es de una acción (no de un ADR, que puede representar varias): quien llama lo garantiza.
 */
export function valuar(r: ResumenBalances, precioAccion: number): Valuacion | null {
  if (!(precioAccion > 0) || !r.acciones || r.acciones <= 0) return null;
  const capitalizacion = d(precioAccion).mul(r.acciones).toNumber();
  const u = r.ultimos12.valores;
  const b = r.balance?.valores ?? {};
  const valorEmpresa = r.indicadores.deudaNeta === null ? null : d(capitalizacion).plus(r.indicadores.deudaNeta).toNumber();
  const dpa = r.anual.valores.dividendoPorAccion.at(-1) ?? null;
  return {
    capitalizacion,
    valorEmpresa,
    per: div(capitalizacion, positivo(u.gananciaNeta)),
    precioVentas: div(capitalizacion, positivo(u.ingresos)),
    precioValorLibro: div(capitalizacion, positivo(b.patrimonio)),
    evEbitda: div(valorEmpresa, positivo(u.ebitda)),
    rendimientoDividendo: positivo(dpa) ? d(dpa!).div(precioAccion).toNumber() : div(positivo(u.dividendosPagados), capitalizacion),
    rendimientoFlujoLibre: div(u.flujoLibre, capitalizacion),
  };
}
