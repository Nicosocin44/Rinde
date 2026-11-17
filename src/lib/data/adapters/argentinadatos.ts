import { z } from "zod";
import { traerJson } from "../http";
import { comparaTasasSchema } from "../schemas/comparatasas";
import { revalidar } from "../freshness";
import {
  adBonosCerSchema,
  adCaucionesSchema,
  adCuentasSchema,
  adFciSchema,
  adFeriadosSchema,
  adHistoricoDolarSchema,
  adLetrasSchema,
  adPlazoFijoSchema,
  adRemSchema,
  adRiesgoPaisSchema,
  adSerieSchema,
} from "../schemas";

/** ArgentinaDatos: API pública no oficial. Sin autenticación. Documentación: argentinadatos.com/docs */
const BASE = "https://api.argentinadatos.com/v1";
const FUENTE = "ArgentinaDatos";

/** Casas disponibles: oficial, blue, bolsa, contadoconliqui, mayorista, cripto, tarjeta. */
export function historicoDolar(casa: string) {
  return traerJson(`${BASE}/cotizaciones/dolares/${casa}`, adHistoricoDolarSchema, { fuente: FUENTE, revalidate: 3600, timeoutMs: 12000 });
}

export function inflacionMensual() {
  return traerJson(`${BASE}/finanzas/indices/inflacion`, adSerieSchema, { fuente: FUENTE, revalidate: revalidar("macro") });
}

export function inflacionInteranual() {
  return traerJson(`${BASE}/finanzas/indices/inflacionInteranual`, adSerieSchema, { fuente: FUENTE, revalidate: revalidar("macro") });
}

export function riesgoPais() {
  return traerJson(`${BASE}/finanzas/indices/riesgo-pais`, adRiesgoPaisSchema, { fuente: FUENTE, revalidate: revalidar("tasas"), timeoutMs: 12000 });
}

export function plazosFijos() {
  return traerJson(`${BASE}/finanzas/tasas/plazoFijo`, adPlazoFijoSchema, { fuente: FUENTE, revalidate: revalidar("tasas") });
}

/** Billeteras y cuentas remuneradas en pesos (el endpoint se llama "fci/otros"). */
export function cuentasRemuneradas() {
  return traerJson(`${BASE}/finanzas/fci/otros/ultimo`, adCuentasSchema, { fuente: FUENTE, revalidate: revalidar("tasas") });
}

/** Cuotapartes de FCI money market. `fecha` = "ultimo", "penultimo" o AAAA/MM/DD. */
export function fciMercadoDinero(fecha: string) {
  return traerJson(`${BASE}/finanzas/fci/mercadoDinero/${fecha}`, adFciSchema, { fuente: FUENTE, revalidate: revalidar("tasas"), timeoutMs: 12000 });
}

/** Subset ComparaTasas de la CNV: incluye la variación de cuotaparte de los últimos ~7 días por clase. */
export function fciComparaTasas() {
  return traerJson(`${BASE}/finanzas/fci/comparatasas`, z.object({ fondos: comparaTasasSchema }), {
    fuente: FUENTE,
    revalidate: revalidar("tasas"),
    timeoutMs: 12000,
  });
}

export function caucionesArs() {
  return traerJson(`${BASE}/finanzas/cauciones/ars`, adCaucionesSchema, { fuente: FUENTE, revalidate: revalidar("tasas") });
}

/** Letras del Tesoro: la usamos para el vencimiento y para derivar el valor final de las que no tenemos en tabla. */
export function letras() {
  return traerJson(`${BASE}/finanzas/letras`, adLetrasSchema, { fuente: FUENTE, revalidate: revalidar("tasas") });
}

export function bonosCer() {
  return traerJson(`${BASE}/finanzas/bonos-cer`, adBonosCerSchema, { fuente: FUENTE, revalidate: revalidar("tasas") });
}

export function remUltimo() {
  return traerJson(`${BASE}/finanzas/rem/ultimo`, adRemSchema, { fuente: FUENTE, revalidate: revalidar("macro") });
}

export function feriados(anio: number) {
  return traerJson(`${BASE}/feriados/${anio}`, adFeriadosSchema, { fuente: FUENTE, revalidate: revalidar("feriados") });
}
