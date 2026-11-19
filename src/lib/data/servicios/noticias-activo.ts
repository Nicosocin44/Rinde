import { nombreLimpio } from "@/lib/activos/perfil";
import type { Noticia } from "@/lib/noticias";
import { juntarNoticias } from "@/lib/noticias/activo";
import * as google from "../adapters/googlenews";

export type Consulta = { q: string; idioma: google.Idioma; dias: number };
export type ActivoParaNoticias = {
  tipo: "cedear" | "accion" | "bono" | "lecap" | "cripto";
  ticker: string;
  nombre: string | null;
  sector?: string | null;
  /** Acciones argentinas con ADR en Nueva York: también salen en los medios de EE.UU. */
  conAdr?: boolean;
};

const CRIPTO: Record<string, string> = { BTC: `"Bitcoin"`, ETH: `"Ethereum"`, USDT: `"Tether" stablecoin`, USDC: `"USDC" stablecoin` };

/**
 * Qué buscar para cada activo. Directas: el activo por su nombre (con "stock" o "acciones" para que "Apple" sea la
 * empresa). Indirectas: el mercado que lo mueve. Los días son la ventana de cada búsqueda.
 */
export function consultasDe(a: ActivoParaNoticias): { directas: Consulta[]; indirectas: Consulta[] } {
  const nombre = (a.nombre && nombreLimpio(a.nombre)) || a.ticker;
  switch (a.tipo) {
    case "cedear":
      return {
        directas:
          a.sector === "ETF"
            ? [{ q: `"${a.ticker}" ETF`, idioma: "en", dias: 7 }]
            : [
                { q: `"${nombre}" stock`, idioma: "en", dias: 4 },
                { q: `"${nombre}" acciones`, idioma: "es", dias: 7 },
              ],
        indirectas: [
          { q: "Wall Street stocks", idioma: "en", dias: 2 },
          { q: "Wall Street acciones", idioma: "es", dias: 2 },
        ],
      };
    case "accion":
      return {
        directas: [{ q: `"${nombre}"`, idioma: "es", dias: 7 }, ...(a.conAdr ? [{ q: `"${nombre}" Argentina`, idioma: "en" as const, dias: 7 }] : [])],
        indirectas: [{ q: "Merval acciones argentinas", idioma: "es", dias: 2 }],
      };
    case "bono":
      return { directas: [{ q: `"${a.ticker}" bonos`, idioma: "es", dias: 7 }], indirectas: [{ q: "riesgo país bonos soberanos", idioma: "es", dias: 2 }] };
    case "lecap":
      return { directas: [{ q: `"${a.ticker}" LECAP`, idioma: "es", dias: 14 }], indirectas: [{ q: "LECAP licitación tasas en pesos", idioma: "es", dias: 3 }] };
    case "cripto": {
      const n = CRIPTO[a.ticker] ?? nombre;
      return {
        directas: [
          { q: n, idioma: "en", dias: 2 },
          { q: n, idioma: "es", dias: 3 },
        ],
        indirectas: [{ q: "criptomonedas", idioma: "es", dias: 2 }],
      };
    }
  }
}

const buscarTodas = async (consultas: Consulta[]) =>
  (await Promise.allSettled(consultas.map((c) => google.buscar(c.q, c.idioma, c.dias)))).flatMap((r) => (r.status === "fulfilled" ? r.value : []));

/**
 * Las noticias de un activo: las de nuestros medios que ya lo nombran (`propias`) más las de Google Noticias. Si Google no
 * responde, quedan las propias (nunca rompe la ficha).
 */
export async function noticiasDeActivo(a: ActivoParaNoticias, propias: Noticia[], propiasIndirectas: Noticia[] = []): Promise<Noticia[]> {
  const { directas, indirectas } = consultasDe(a);
  const [d, i] = await Promise.all([buscarTodas(directas), buscarTodas(indirectas)]);
  return juntarNoticias({ propias, directas: d, indirectas: i, propiasIndirectas });
}
