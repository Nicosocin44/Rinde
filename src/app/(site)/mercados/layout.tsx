import { Suspense } from "react";
import { CalendarioSemanal, CalendarioSemanalCargando } from "@/components/modules/mercados/semana";
import { PageHeader } from "@/components/shell/page-header";
import { SectionTabs } from "@/components/shell/section-tabs";

export default function MercadosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        titulo="Mercados"
        bajada="CEDEARs, acciones argentinas, bonos en dólares, cripto y opciones de GGAL."
        acciones={
          <Suspense fallback={<CalendarioSemanalCargando />}>
            <CalendarioSemanal />
          </Suspense>
        }
      />
      <SectionTabs
        etiqueta="Mercados"
        solapas={[
          { href: "/mercados", label: "CEDEARs" },
          { href: "/mercados/acciones", label: "Acciones" },
          { href: "/mercados/bonos", label: "Bonos" },
          { href: "/mercados/cripto", label: "Cripto" },
          { href: "/mercados/opciones", label: "Opciones" },
          { href: "/mercados/comparar", label: "Comparar" },
        ]}
      />
      <div className="pt-8 lg:pt-12">{children}</div>
    </>
  );
}
