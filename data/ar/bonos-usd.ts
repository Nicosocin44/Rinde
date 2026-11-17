import type { DefinicionBono } from "@/lib/calculos/bonos";

/**
 * Bonos soberanos en dólares del canje 2020 (Bonares, ley argentina; Globales, ley Nueva York).
 * Cronogramas según los prospectos del canje (septiembre de 2020): pagos el 9 de enero y el 9 de julio,
 * cupón step-up sobre el valor residual (base 30/360).
 *
 * Verificación (16/11/2026): con los precios de mercado, las TIR resultantes quedan entre 10 % y 13 %,
 * consistentes con un riesgo país de ~830 puntos. Pendiente: contrastar cada flujo contra una segunda
 * fuente pública antes del lanzamiento comercial.
 *
 * No incluidos todavía: AN29, AO27, AO28, AO29 y BOPREAL (emitidos después; falta cargar sus prospectos).
 */

export type BonoEstatico = DefinicionBono & {
  nombre: string;
  ley: "Argentina" | "Nueva York";
  vencimiento: string;
};

/** Fechas de pago semestrales (9 de enero y 9 de julio) entre dos fechas, inclusive. */
function semestres(desde: string, hasta: string): string[] {
  const fechas: string[] = [];
  let [anio, mes] = [Number(desde.slice(0, 4)), Number(desde.slice(5, 7))];
  for (;;) {
    const fecha = `${anio}-${String(mes).padStart(2, "0")}-09`;
    if (fecha > hasta) break;
    fechas.push(fecha);
    if (mes === 1) mes = 7;
    else {
      mes = 1;
      anio += 1;
    }
  }
  return fechas;
}

/** Amortización en cuotas iguales entre dos fechas de pago. */
function cuotasIguales(desde: string, hasta: string, primera?: number): Record<string, number> {
  const fechas = semestres(desde, hasta);
  const resto = primera === undefined ? 100 / fechas.length : (100 - primera) / (fechas.length - 1);
  return Object.fromEntries(fechas.map((f, i) => [f, i === 0 && primera !== undefined ? primera : resto]));
}

const INICIO = "2020-09-04";
const PRIMER_PAGO = "2021-07-09";

type Molde = Omit<BonoEstatico, "ticker" | "nombre" | "ley">;

const m2029: Molde = {
  vencimiento: "2029-07-09",
  pagos: semestres(PRIMER_PAGO, "2029-07-09"),
  inicioDevengamiento: INICIO,
  cupones: [{ desde: INICIO, tasaAnual: 0.01 }],
  amortizaciones: cuotasIguales("2025-01-09", "2029-07-09"),
  frecuencia: 2,
};

const m2030: Molde = {
  vencimiento: "2030-07-09",
  pagos: semestres(PRIMER_PAGO, "2030-07-09"),
  inicioDevengamiento: INICIO,
  cupones: [
    { desde: INICIO, tasaAnual: 0.00125 },
    { desde: "2021-07-09", tasaAnual: 0.005 },
    { desde: "2023-07-09", tasaAnual: 0.0075 },
    { desde: "2027-07-09", tasaAnual: 0.0175 },
  ],
  amortizaciones: cuotasIguales("2024-07-09", "2030-07-09", 4),
  frecuencia: 2,
};

const m2035: Molde = {
  vencimiento: "2035-07-09",
  pagos: semestres(PRIMER_PAGO, "2035-07-09"),
  inicioDevengamiento: INICIO,
  cupones: [
    { desde: INICIO, tasaAnual: 0.00125 },
    { desde: "2021-07-09", tasaAnual: 0.01125 },
    { desde: "2022-07-09", tasaAnual: 0.015 },
    { desde: "2023-07-09", tasaAnual: 0.03625 },
    { desde: "2024-07-09", tasaAnual: 0.04125 },
    { desde: "2027-07-09", tasaAnual: 0.0475 },
    { desde: "2028-07-09", tasaAnual: 0.05 },
  ],
  amortizaciones: cuotasIguales("2031-01-09", "2035-07-09"),
  frecuencia: 2,
};

const m2038: Molde = {
  vencimiento: "2038-01-09",
  pagos: semestres(PRIMER_PAGO, "2038-01-09"),
  inicioDevengamiento: INICIO,
  cupones: [
    { desde: INICIO, tasaAnual: 0.00125 },
    { desde: "2021-07-09", tasaAnual: 0.02 },
    { desde: "2022-07-09", tasaAnual: 0.03875 },
    { desde: "2023-07-09", tasaAnual: 0.0425 },
    { desde: "2024-07-09", tasaAnual: 0.05 },
  ],
  amortizaciones: cuotasIguales("2027-07-09", "2038-01-09"),
  frecuencia: 2,
};

const m2041: Molde = {
  vencimiento: "2041-07-09",
  pagos: semestres(PRIMER_PAGO, "2041-07-09"),
  inicioDevengamiento: INICIO,
  cupones: [
    { desde: INICIO, tasaAnual: 0.00125 },
    { desde: "2021-07-09", tasaAnual: 0.025 },
    { desde: "2022-07-09", tasaAnual: 0.035 },
    { desde: "2029-07-09", tasaAnual: 0.04875 },
  ],
  amortizaciones: cuotasIguales("2028-01-09", "2041-07-09"),
  frecuencia: 2,
};

const m2046: Molde = {
  vencimiento: "2046-07-09",
  pagos: semestres(PRIMER_PAGO, "2046-07-09"),
  inicioDevengamiento: INICIO,
  cupones: [
    { desde: INICIO, tasaAnual: 0.00125 },
    { desde: "2021-07-09", tasaAnual: 0.01125 },
    { desde: "2022-07-09", tasaAnual: 0.015 },
    { desde: "2023-07-09", tasaAnual: 0.03625 },
    { desde: "2024-07-09", tasaAnual: 0.04125 },
    { desde: "2027-07-09", tasaAnual: 0.04375 },
    { desde: "2028-07-09", tasaAnual: 0.05 },
  ],
  amortizaciones: cuotasIguales("2025-01-09", "2046-07-09"),
  frecuencia: 2,
};

export const BONOS_USD: BonoEstatico[] = [
  { ticker: "AL29", nombre: "Bonar 2029", ley: "Argentina", ...m2029 },
  { ticker: "AL30", nombre: "Bonar 2030", ley: "Argentina", ...m2030 },
  { ticker: "AL35", nombre: "Bonar 2035", ley: "Argentina", ...m2035 },
  { ticker: "AE38", nombre: "Bonar 2038", ley: "Argentina", ...m2038 },
  { ticker: "AL41", nombre: "Bonar 2041", ley: "Argentina", ...m2041 },
  { ticker: "GD29", nombre: "Global 2029", ley: "Nueva York", ...m2029 },
  { ticker: "GD30", nombre: "Global 2030", ley: "Nueva York", ...m2030 },
  { ticker: "GD35", nombre: "Global 2035", ley: "Nueva York", ...m2035 },
  { ticker: "GD38", nombre: "Global 2038", ley: "Nueva York", ...m2038 },
  { ticker: "GD41", nombre: "Global 2041", ley: "Nueva York", ...m2041 },
  { ticker: "GD46", nombre: "Global 2046", ley: "Nueva York", ...m2046 },
];

export const bonoPorTicker = new Map(BONOS_USD.map((b) => [b.ticker, b]));
