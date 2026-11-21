import { Suspense } from "react";
import { CalendarioMercados, CalendarioMercadosCargando } from "@/components/modules/mercados/calendario";
import { PageHeader } from "@/components/shell/page-header";
import { RefrescoEnVivo } from "@/components/shell/refresco-en-vivo";
import { SectionTabs } from "@/components/shell/section-tabs";

export default function MercadosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        titulo="Mercados"
        bajada="CEDEARs, acciones argentinas, bonos en dólares, cripto y opciones de GGAL."
        acciones={
          <Suspense fallback={<CalendarioMercadosCargando />}>
            <CalendarioMercados />
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
      <RefrescoEnVivo />
    </>
  );
}
