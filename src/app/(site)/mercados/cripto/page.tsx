import type { Metadata } from "next";
import { VistaCripto } from "@/components/modules/mercados/mercados";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerCripto } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";

export const revalidate = 60;
export const metadata: Metadata = { title: "Cripto: Bitcoin, Ether, USDT y USDC en pesos", description: "Precio de las principales criptomonedas en pesos y dólares, y dónde conviene comprarlas." };

export default async function CriptoPage() {
  const r = await obtenerCripto();
  if (!r.ok) return <ErrorState titulo="No pudimos traer las cotizaciones cripto." detalle={r.error} />;
  return (
    <>
      <VistaCripto criptos={r.data} />
      <SourceNote className="mt-6" fuentes={[FUENTES.criptoya]} actualizado={r.asOf} estado={r.status} metodologia="/metodologia#dolar" />
    </>
  );
}
