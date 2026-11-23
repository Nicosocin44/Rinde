import type { TarifarioBroker } from "@/lib/calculos/comisiones";

/**
 * Comisiones de los brokers, de sus tarifarios oficiales (leídos el 22/11/2026). Se toma la operación online de una
 * persona humana en el nivel de entrada: lo que paga alguien que recién abre la cuenta.
 *
 * Revisar cada tanto: los brokers cambian sus tarifarios (y lo informan en su sitio y en la CNV).
 *
 * Quedan afuera hasta tener su tarifario público: Allaria (el PDF que tenía publicado ya no existe), Adcap y SBS.
 *
 * Derechos de mercado (aparte, iguales en todos los brokers, los cobra BYMA). Según los tarifarios:
 * - acciones y CEDEARs: 0,05 % + IVA (IOL) o 0,070 % (Bull Market);
 * - bonos: 0,01 %;
 * - letras: 0,001 %;
 * - opciones: 0,2 %.
 */
export const TARIFARIOS_BROKERS: TarifarioBroker[] = [
  {
    proveedorId: "cocos",
    plan: "Web o app, persona humana",
    comisiones: {
      acciones: { tasa: 0.0045, iva: true },
      bonos: { tasa: 0.0045, iva: false },
      // Las letras en pesos: 1,5 % anual, prorrateado por los días que le quedan.
      letras: { tasa: 0.015, iva: false, anual: true },
      opciones: { tasa: 0.01, iva: true },
    },
    custodia: "Sin cargo hasta USD 200.000 en la cuenta",
    nota: "Con el plan Cocos Pro (desde US$ 150 por mes) no cobra comisión en acciones, CEDEARs, bonos ni opciones.",
    fuente: { url: "https://cocos.capital/tarifario", nombre: "Tarifario de Cocos" },
    verificado: "2026-11-22",
  },
  {
    proveedorId: "iol",
    plan: "Nivel Gold (hasta $ 7,5 millones operados por mes)",
    comisiones: {
      acciones: { tasa: 0.005, iva: true },
      bonos: { tasa: 0.005, iva: false },
      letras: { tasa: 0.002, iva: false },
      opciones: { tasa: 0.005, iva: true },
    },
    custodia: "Apertura y mantenimiento sin cargo",
    nota: "Baja a 0,3 % si el mes anterior operaste más de $ 7,5 millones y a 0,1 % si fueron más de $ 50 millones.",
    fuente: { url: "https://www.invertironline.com/tarifas", nombre: "Tarifas de IOL" },
    verificado: "2026-11-22",
  },
  {
    proveedorId: "balanz",
    plan: "Trading online",
    comisiones: {
      acciones: { tasa: 0.005, iva: true, hasta: true },
      bonos: { tasa: 0.005, iva: false, hasta: true },
      letras: { tasa: 0.001, iva: false, hasta: true },
      opciones: { tasa: 0.005, iva: true, hasta: true },
    },
    custodia: "Apertura y mantenimiento sin cargo",
    nota: "El tarifario publica comisiones máximas (\"hasta\").",
    fuente: { url: "https://balanz.com/comisiones/", nombre: "Tabla de comisiones de Balanz 2026" },
    verificado: "2026-11-22",
  },
  {
    proveedorId: "bullmarket",
    plan: "Digital Account (web o app)",
    comisiones: {
      acciones: { tasa: 0.005, iva: true },
      bonos: { tasa: 0.005, iva: false },
      letras: { tasa: 0.0025, iva: false },
      opciones: { tasa: 0.005, iva: true },
    },
    custodia: "Apertura y mantenimiento sin cargo",
    nota: "Con más volumen, las cuentas Active Trader pagan 0,25 % y 0,10 %.",
    fuente: { url: "https://s3-sa-east-1.amazonaws.com/bmb.s3.webbucket/System/Files/Tarifario.pdf", nombre: "Tabla de aranceles de Bull Market (mayo 2026)" },
    verificado: "2026-11-22",
  },
  {
    proveedorId: "ppi",
    plan: "Internet (vigente desde el 1/7/2026)",
    comisiones: {
      acciones: { tasa: 0.006, iva: true },
      bonos: { tasa: 0.006, iva: false },
      letras: { tasa: 0.002, iva: false },
      opciones: { tasa: 0.01, iva: true },
    },
    custodia: "Apertura, administración y custodia sin cargo",
    fuente: { url: "https://portfoliopersonal.com/Contenido/comisiones", nombre: "Comisiones de PPI" },
    verificado: "2026-11-22",
  },
];
