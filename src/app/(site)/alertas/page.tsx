import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertasVista } from "@/components/modules/alertas/vista";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Alertas", description: "Avisos cuando el dólar pasa un valor, una tasa sube o algo de tu cartera vence." };

export default function Alertas() {
  return (
    <>
      <PageHeader titulo="Te avisamos antes" bajada="Del dólar, de las tasas y de lo que vence en tu cartera. Sin mirar la pantalla todo el día." className="mb-10 lg:mb-14" />
      <Suspense fallback={null}>
        <AlertasVista />
      </Suspense>
    </>
  );
}
