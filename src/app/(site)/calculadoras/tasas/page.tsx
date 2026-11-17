import type { Metadata } from "next";
import { ConversorTasas } from "@/components/modules/calculadoras/tasas";

export const metadata: Metadata = { title: "Conversor de tasas: TNA, TEA y TEM", description: "Convertí una tasa nominal anual en efectiva anual y mensual, y al revés." };

export default function Page() {
  return (
    <>
      <h2 className="mb-8 text-h2">TNA, TEA y TEM: la misma tasa, tres formas de contarla</h2>
      <ConversorTasas />
    </>
  );
}
