/**
 * Golden tests: valores calculados por un camino independiente (planilla / aritmética simple en punto
 * flotante, sin usar src/lib/calculos) el 16/11/2026. Si un test falla, primero se revisa el código:
 * estos valores solo se cambian si se demuestra que el valor de referencia estaba mal.
 */

/** 1. TNA ↔ TEA ↔ TEM con 24 % TNA. TEA = (1 + TNA·d/365)^(365/d) − 1; TEM = (1 + TEA)^(30/365) − 1. */
export const TASAS = [
  { dias: 30, tna: 0.24, tea: 0.2682824107, tem: 0.0197260274 },
  { dias: 90, tna: 0.24, tea: 0.2625922138, tem: 0.01934922034 },
  { dias: 365, tna: 0.24, tea: 0.24, tem: 0.01783761064 },
] as const;

/** TEA con capitalización diaria de 32 % TNA: (1 + 0,32/365)^365 − 1. */
export const TEA_DIARIA_32 = 0.3769347155;

/** 2. Plazo fijo de $1.000.000 a 30 días al 24 % TNA: 1.000.000 × 0,24 × 30 / 365. */
export const PLAZO_FIJO = { capital: 1_000_000, tna: 0.24, dias: 30, interes: "19726.027397260273972602739726" };

/** 3. LECAP: VF 161,104; precio 155,12; 59 días. */
export const LECAP = {
  vf: 161.104,
  precio: 155.12,
  dias: 59,
  directo: 0.03857658587,
  tna: 0.23865176,
  tea: 0.2638512865,
  tem: 0.01943273071,
  /** Con $1.000.000: nominales = 1.000.000 / 1,5512; cobro = nominales × 1,61104. */
  nominales: 644662.197,
  cobro: 1038576.58587,
};

/** 4. FCI money market: VCP 1.250,00 → 1.255,50 en 7 días. */
export const FCI = { vcpAnterior: 1250, vcpActual: 1255.5, dias: 7, directo: 0.0044, tna: 0.2294285714, tea: 0.2572481245 };

/** 5a. Bono bullet a 2 años, cupón anual 10 %, precio 100 en fecha de cupón → TIR 10 %, duration (10/1,1 + 2·110/1,21)/100. */
export const BONO_BULLET = { tir: 0.1, duration: 1.909090909, paridad: 1 };

/** 5b. Bono a 3 años, cupón 8 % anual pagado semestral (4 por semestre), amortiza al final, precio 95. t_i = días/365. */
export const BONO_SEMESTRAL = { precio: 95, tir: 0.102102532501, duration: 2.71937548876, durationModificada: 2.46744328097, paridad: 0.95 };

/** 6. Breakeven: LECAP 28 % TEA contra CER + 6 % → 1,28/1,06 − 1. */
export const BREAKEVEN = { teaLecap: 0.28, tirReal: 0.06, anual: 0.2075471698, mensual: 0.01562140221 };

/** 7. Interés compuesto: C0 1.000.000, aporte 100.000 por mes, 2 % mensual, 12 meses. */
export const INTERES_COMPUESTO = { c0: 1_000_000, aporte: 100_000, i: 0.02, n: 12, alFinal: 2609450.767375, alInicio: 2636274.946832 };

/** 8. Aporte mensual para llegar a 5.000.000 con los mismos datos. */
export const META = { meta: 5_000_000, alFinal: 278238.3864918, alInicio: 272782.7318547 };

/**
 * 9. Cartera multi-moneda. Ver tests/cartera.test.ts para los movimientos.
 * Valuaciones (ARS) y flujos por fecha, calculados a mano:
 *   01/01: V = 1.000.000 + 10 × 20.000 = 1.200.000; F = 1.000.000 + 201.000 = 1.201.000
 *   01/02 (MEP 1.100): V = 1.000.000 + 20 × 24.000 + USD 600 × 1.100 = 2.140.000; F = 241.200 + 660.000 = 901.200
 *   01/03 (MEP 1.200): V = 1.000.000 + 15 × 30.000 + USD 620 × 1.200 + USD 500 × 1.200 = 2.794.000; F = −149.250 + 600.000 = 450.750
 *   01/04 (MEP 1.220): V = 1.050.000 + 15 × 31.000 + USD 630 × 1.220 + USD 550 × 1.220 = 2.954.600; F = −USD 3,75 × 1.220 = −4.575
 *   01/07 (MEP 1.250): V = 1.050.000 + 15 × 32.000 + USD 660 × 1.250 + USD 600 × 1.250 = 3.105.000; F = 0
 */
export const CARTERA = {
  valores: [1_200_000, 2_140_000, 2_794_000, 2_954_600, 3_105_000],
  flujos: [1_201_000, 901_200, 450_750, -4_575, 0],
  /** Costo promedio de AAPL después de dos compras: (201.000 + 241.200) / 20. */
  costoPromedioAapl: 22_110,
  /** Venta de 5 a 30.000 con 750 de comisión: (30.000 − 22.110) × 5 − 750. */
  realizadoAapl: 38_700,
  costoTotalAaplFinal: 331_650,
  twr: 0.222627589574,
  xirr: 0.569093328049,
};

/** Inflación acumulada de 2 %, 3 % y 1 %. */
export const INFLACION_ACUMULADA = 0.061106;

/** Dólar: comprás a 1.567, vendés a 1.548; USD 1.000 con 0,5 % de comisión; MEP 1.585 vs oficial 1.575. */
export const DOLAR = { spread: 0.01227390181, costoMil: 1_574_835, brecha: 0.006349206349 };
