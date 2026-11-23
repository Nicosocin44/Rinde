import { d } from "./decimal";

/**
 * Comisiones de los brokers (punto: dónde comprar acciones, CEDEARs, bonos, letras y opciones). Puro: recibe el
 * tarifario y el monto, y devuelve cuánto cobra cada broker, ordenado del más barato al más caro.
 *
 * Solo se compara la comisión del broker (con su IVA): los derechos de mercado de BYMA son iguales en todos los brokers,
 * así que no cambian el orden. Se muestran aparte, como nota.
 */

/** Qué se opera. Acciones y CEDEARs van juntos: en todos los brokers relevados tienen la misma comisión. */
export type ClaseOperacion = "acciones" | "bonos" | "letras" | "opciones";

/** IVA sobre la comisión. No se cobra en títulos públicos, letras ni obligaciones negociables (están exentos). */
export const IVA = 0.21;

export type Comision = {
  /** Porcentaje sobre el monto operado, como fracción (0,005 = 0,5 %). */
  tasa: number;
  /** Si lleva IVA encima (acciones, CEDEARs y opciones, sí; títulos públicos y letras, no). */
  iva: boolean;
  /** La tasa es anual y se cobra prorrateada por los días que le quedan a la letra (Cocos). */
  anual?: boolean;
  /** El tarifario dice "hasta": es la comisión máxima que puede cobrar. */
  hasta?: boolean;
};

export type TarifarioBroker = {
  /** El id de `data/ar/proveedores.ts` (para el nombre y el logo). */
  proveedorId: string;
  /** Qué canal y tipo de cliente se tomó del tarifario ("Web/app, persona humana"). */
  plan: string;
  comisiones: Partial<Record<ClaseOperacion, Comision>>;
  /** Mantenimiento y custodia de la cuenta, en una frase. */
  custodia: string;
  /** Algo que conviene saber (comisiones más bajas por volumen, planes pagos). */
  nota?: string;
  fuente: { url: string; nombre: string };
  /** Cuándo se leyó el tarifario (AAAA-MM-DD). */
  verificado: string;
};

/** Lo que cobra el broker por operar ese monto, IVA incluido. Una letra con tasa anual necesita los días que le quedan. */
export function costoComision(c: Comision, monto: number, dias?: number): number {
  const tasa = c.anual ? d(c.tasa).mul(Math.max(0, dias ?? 0)).div(365) : d(c.tasa);
  return d(monto).mul(tasa).mul(c.iva ? 1 + IVA : 1).toNumber();
}

export type FilaRanking = { tarifario: TarifarioBroker; comision: Comision; costo: number; /** Sobre el monto, IVA incluido. */ efectiva: number };

/**
 * Los brokers que operan esa clase, del más barato al más caro para ese monto (a igual costo, por nombre del proveedor).
 * Los que no la operan, o las letras de tasa anual sin días, quedan afuera.
 */
export function rankingBrokers(tarifarios: TarifarioBroker[], clase: ClaseOperacion, monto: number, dias?: number): FilaRanking[] {
  return tarifarios
    .flatMap((t) => {
      const comision = t.comisiones[clase];
      if (!comision || (comision.anual && dias === undefined)) return [];
      const costo = costoComision(comision, monto, dias);
      return [{ tarifario: t, comision, costo, efectiva: monto > 0 ? costo / monto : 0 }];
    })
    .sort((a, b) => a.costo - b.costo || a.tarifario.proveedorId.localeCompare(b.tarifario.proveedorId));
}
