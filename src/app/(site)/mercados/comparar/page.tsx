import type { Metadata } from "next";
import { Suspense } from "react";
import { Comparador } from "@/components/modules/comparar/comparador";
import { NumerosEmpresas } from "@/components/modules/comparar/numeros-empresas";
import { Skeleton } from "@/components/ui/estados";
import { hoyAR } from "@/lib/calculos";
import { cargarComparacion, listaDeTickers } from "@/lib/data/servicios/comparar";

export const metadata: Metadata = {
  title: "Comparar activos: CEDEARs, acciones, bonos y cripto",
  description: "Compará hasta 5 activos en el mismo gráfico, en pesos o en dólares, con su rendimiento, caída máxima, volatilidad y los números de cada empresa.",
};

type Props = { searchParams: Promise<{ t?: string | string[] }> };

/** /mercados/comparar?t=AAPL,MELI,BTC: los activos elegidos viven en la URL, así se puede compartir la comparación. */
export default async function Comparar({ searchParams }: Props) {
  const tickers = listaDeTickers((await searchParams).t);
  const datos = tickers.length ? await cargarComparacion(tickers) : null;
  return (
    <>
      <Comparador tickers={tickers} datos={datos} hoy={hoyAR()} />
      {datos && datos.activos.length > 0 && (
        <Suspense fallback={<Skeleton className="mt-12 h-64" />}>
          <NumerosEmpresas activos={datos.activos} tickers={tickers} />
        </Suspense>
      )}
    </>
  );
}
