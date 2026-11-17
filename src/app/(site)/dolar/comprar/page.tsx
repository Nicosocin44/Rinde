import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingDolar } from "@/components/modules/dolar/ranking-dolar";
import { Skeleton } from "@/components/ui/estados";
import { obtenerRanking } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Dónde comprar dólares: ranking por app y banco",
  description: "Comparamos el precio final del dólar, USDT y USDC en bancos, casas de cambio, billeteras y exchanges, con comisiones. Cuánto te cuestan USD 1.000.",
};

export default async function Comprar() {
  const [usd, usdt, usdc] = await Promise.all([obtenerRanking("USD"), obtenerRanking("USDT"), obtenerRanking("USDC")]);
  return (
    <Suspense fallback={<EsqueletoRanking />}>
      <RankingDolar rankings={{ USD: usd, USDT: usdt, USDC: usdc }} />
    </Suspense>
  );
}

function EsqueletoRanking() {
  return (
    <div className="flex flex-col gap-8" aria-hidden>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-10 w-[min(560px,100%)]" />
      <div className="flex flex-col">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="my-2 h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
