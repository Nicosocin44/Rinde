/**
 * Configuración de Argentina. Todo lo que depende del país vive acá, para poder sumar UY, CL o MX
 * agregando un archivo hermano sin tocar la UI.
 */
export const ar = {
  codigo: "AR",
  nombre: "Argentina",
  locale: "es-AR",
  zonaHoraria: "America/Argentina/Buenos_Aires",
  /** Desfase fijo contra UTC, en horas (Argentina no cambia la hora). */
  utcOffset: -3,
  moneda: { codigo: "ARS", simbolo: "$", nombre: "pesos", singular: "peso" },
  monedaFuerte: { codigo: "USD", simbolo: "US$", nombre: "dólares", singular: "dólar" },

  /** Horario de mercado de referencia (hora local), días hábiles. */
  mercado: { abre: 11, cierra: 17 },

  /** Segundos de caché por tipo de dato: [en horario de mercado, fuera de horario]. Ver DATOS_Y_FORMULAS.md §3. */
  cache: {
    dolar: [60, 300],
    mercado: [60, 900],
    tasas: [3600, 21600],
    bcra: [21600, 21600],
    macro: [43200, 86400],
    feriados: [604800, 604800],
    historico: [86400, 86400],
  },

  /** Umbrales de frescura. */
  frescura: {
    /** Un dato "en vivo" con más de estos minutos en horario de mercado pasa a "demorado". */
    demoradoMin: 15,
    /** Cotización de un banco o casa de cambio más vieja que esto se excluye del ranking. */
    proveedorMaxHoras: 30,
    /** Cotización de un exchange cripto más vieja que esto (minutos) se excluye: el mercado cripto no cierra. */
    criptoMaxMin: 120,
    /** Un fondo con la cuotaparte más vieja que esto (días) se excluye. */
    fciMaxDias: 6,
    /** Una tasa (billetera, cuenta) sin actualizar hace más de estos días se excluye. */
    tasaMaxDias: 10,
    /** Cauciones: la última rueda informada puede tener hasta estos días hábiles. */
    caucionMaxHabiles: 3,
  },

  /** Bandas plausibles por clase. Fuera de banda → excluido y logueado. Ver DATOS_Y_FORMULAS.md §4. */
  bandas: {
    teaPesos: { min: 0.001, max: 2 },
    tirBonoUsd: { min: -0.05, max: 0.6 },
    tirReal: { min: -0.3, max: 0.6 },
    /** Una cotización de dólar no puede alejarse más de esto de la mediana de su grupo. */
    desvioDolar: 0.25,
    spreadDolarMax: 0.2,
  },

  /** Letras: días hábiles mínimos al vencimiento para entrar en la curva. */
  lecaps: { minHabilesCurva: 5, desviosAtipico: 3 },

  /** Garantía de depósitos vigente (SEDESA). Revisar si el BCRA la actualiza. */
  garantiaDepositos: { monto: 25_000_000, revisado: "2026-11-16" },

  /**
   * Restricciones normativas para arbitrajes y compra de dólares. Son PARÁMETROS, no reglas en duro:
   * la normativa cambia. Revisar antes de cada lanzamiento.
   */
  normativa: {
    revisado: "2026-11-16",
    notas: [
      "Las restricciones cruzadas entre dólar oficial y dólares financieros cambian seguido. Verificá la normativa vigente del BCRA y la CNV antes de operar.",
    ],
  },

  /** Feriados de respaldo si la API de feriados no responde. Copiados de ArgentinaDatos el 16/11/2026. */
  feriadosRespaldo: [
    "2026-01-01", "2026-02-16", "2026-02-17", "2026-03-23", "2026-03-24", "2026-04-02", "2026-04-03", "2026-05-01",
    "2026-05-25", "2026-06-15", "2026-06-20", "2026-07-09", "2026-07-10", "2026-08-17", "2026-10-12", "2026-11-09",
    "2026-11-23", "2026-12-07", "2026-12-08", "2026-12-25",
    "2027-01-01", "2027-02-08", "2027-02-09", "2027-03-24", "2027-03-26", "2027-04-02", "2027-05-01", "2027-05-25",
    "2027-06-17", "2027-06-20", "2027-07-09", "2027-08-17", "2027-10-12", "2027-11-20", "2027-12-08", "2027-12-25",
  ],
} as const;

export type Pais = typeof ar;
export const pais = ar;
