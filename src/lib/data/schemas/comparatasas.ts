import { z } from "zod";

const numNulo = z.number().finite().nullable();

/** /v1/finanzas/fci/comparatasas → `fondos`. Variaciones de cuotaparte en %. */
export const comparaTasasSchema = z.array(
  z.object({
    nombre: z.string(),
    administradora: z.string(),
    tipoRenta: z.string(),
    moneda: z.string(),
    fecha: z.string(),
    patrimonio: numNulo,
    plazoLiquidacionDias: numNulo,
    rendimientos: z.object({
      valorCuotaparte: numNulo,
      ultimos7Dias: numNulo,
      diasUltimos7Dias: numNulo,
    }),
  }),
);
