import type { Metadata } from "next";
import { Suspense } from "react";
import { CarteraVista } from "@/components/modules/cartera/vista";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = {
  title: "Mi cartera",
  description: "Cargá lo que tenés y mirá cuánto rinde todo junto, en pesos, en dólares y contra la inflación. Se guarda solo en tu navegador.",
};

export default function Cartera() {
  return (
    <>
      <PageHeader tema="lila" titulo="Mi cartera" bajada="Todo lo que tenés, junto: en pesos, en dólares y contra la inflación. Se guarda solo en tu navegador." className="mb-10 lg:mb-14" />
      <Suspense fallback={null}>
        <CarteraVista />
      </Suspense>
    </>
  );
}
