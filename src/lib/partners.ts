/**
 * Registro de afiliados y referidos.
 *
 * REGLA DE ORO: el ranking no sabe quién es socio. Ningún archivo de src/lib/rankings, src/lib/data,
 * src/lib/insights ni src/lib/calculos puede importar este archivo (lo bloquea ESLint y lo verifica
 * tests/neutralidad.test.ts). Solo lo usa la UI, en el DETALLE de un proveedor, para mostrar
 * <PartnerCTA> rotulado como "Enlace de afiliado".
 *
 * En el MVP no hay acuerdos firmados: todos los registros están inactivos.
 */
export type Partner = {
  id: string;
  /** Debe coincidir con un id de data/ar/proveedores.ts. */
  proveedorId: string;
  nombre: string;
  categorias: ("billetera" | "broker" | "exchange" | "banco" | "remesas")[];
  urlReferido: string;
  codigo?: string;
  notasComision?: string;
  activo: boolean;
};

export const PARTNERS: Partner[] = [
  // Ejemplo de estructura (inactivo). Cuando haya un acuerdo real, se completa y se pasa `activo: true`.
  { id: "ejemplo-broker", proveedorId: "cocos", nombre: "Cocos", categorias: ["broker"], urlReferido: "", activo: false },
];

export function partnerActivo(proveedorId: string): Partner | null {
  return PARTNERS.find((p) => p.activo && p.proveedorId === proveedorId && p.urlReferido) ?? null;
}
