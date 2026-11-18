import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FichaAccion } from "@/components/modules/activo/ficha-accion";
import { FichaBonoVista } from "@/components/modules/activo/ficha-bono";
import { FichaCriptoVista } from "@/components/modules/activo/ficha-cripto";
import { FichaLetraVista } from "@/components/modules/activo/ficha-letra";
import { ErrorState } from "@/components/ui/estados";
import { obtenerActivo, obtenerCotizaciones, obtenerFichaBono, obtenerFichaCripto, obtenerFichaLetra } from "@/lib/data";
import { normalizarTicker } from "@/lib/data/servicios/activo";
import { claseDeFicha, esCripto } from "@/lib/data/servicios/fichas";

export const revalidate = 120;

type Props = { params: Promise<{ ticker: string }> };

/**
 * Una sola ruta para todos los activos: /activo/AAPL, /activo/GGAL, /activo/AL30, /activo/S30N6, /activo/BTC.
 * Primero se resuelve qué tipo de activo es (cripto, bono, letra o, si no, CEDEAR/acción) y se carga su ficha.
 */
async function cargar(params: Props["params"]) {
  const ticker = normalizarTicker((await params).ticker);
  if (!ticker) return null;
  const clase = claseDeFicha(ticker);
  if (clase === "cripto" && esCripto(ticker)) return { clase, r: await obtenerFichaCripto(ticker) } as const;
  if (clase === "bono") return { clase, r: await obtenerFichaBono(ticker) } as const;
  if (clase === "lecap") return { clase, r: await obtenerFichaLetra(ticker) } as const;
  const r = await obtenerActivo(ticker);
  return r ? ({ clase: "accion", r } as const) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await cargar(params);
  // Un ticker que no existe corta acá (si la página todavía no empezó a mandarse, responde 404).
  if (!c) notFound();
  if (!c.r.ok) return { title: "Activo" };
  switch (c.clase) {
    case "cripto": {
      const x = c.r.data.cripto;
      const titulo = x.nombre.includes(x.simbolo) ? x.nombre : `${x.nombre} (${x.simbolo})`;
      return { title: `${titulo} hoy: precio en pesos y dólares`, description: `${x.nombre}: precio en pesos y en dólares, dónde comprarlo más barato, gráfico, rendimiento y noticias.` };
    }
    case "bono": {
      const b = c.r.data.bono;
      return { title: `${b.ticker} (${b.nombre}): precio, TIR y flujos`, description: `Bono ${b.ticker}: precio en dólares y pesos, TIR, duration, paridad, próximos pagos, calculadora de flujos y noticias.` };
    }
    case "lecap": {
      const l = c.r.data.letra;
      return { title: `${l.tipo} ${l.ticker}: tasa, precio y cuánto cobrás`, description: `${l.tipo} ${l.ticker}: TNA, TEA, precio, valor final, calculadora de cobro y comparación con la inflación y el plazo fijo.` };
    }
    default: {
      const { ticker, nombre, tipo } = c.r.data;
      const titulo = nombre ? `${nombre} (${ticker})` : ticker;
      return {
        title: `${titulo}: precio, gráfico y noticias`,
        description: `${tipo === "cedear" ? "CEDEAR" : "Acción"} ${titulo}: precio en pesos y en dólares, gráfico histórico, rendimiento, datos clave y las últimas noticias.`,
      };
    }
  }
}

export default async function FichaPage({ params }: Props) {
  const c = await cargar(params);
  if (!c) notFound();
  if (!c.r.ok) return <ErrorState titulo="No pudimos traer los datos de este activo." detalle={c.r.error} />;
  switch (c.clase) {
    case "cripto":
      return <FichaCriptoVista f={c.r.data} asOf={c.r.asOf} estado={c.r.status} />;
    case "bono":
      return <FichaBonoVista f={c.r.data} asOf={c.r.asOf} estado={c.r.status} />;
    case "lecap":
      return <FichaLetraVista f={c.r.data} asOf={c.r.asOf} estado={c.r.status} />;
    default: {
      const cot = await obtenerCotizaciones();
      const mep = cot.ok ? (cot.data.find((x) => x.id === "mep")?.venta ?? null) : null;
      return <FichaAccion a={c.r.data} mepHoy={mep} asOf={c.r.asOf} estado={c.r.status} />;
    }
  }
}
