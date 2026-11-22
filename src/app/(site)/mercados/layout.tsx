import { CalendarioMercados } from "@/components/modules/mercados/calendario";
import { SiguiendoMercados } from "@/components/modules/mercados/siguiendo";
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
          // En la compu, "Siguiendo" debajo de "Calendario"; en el celular, uno al lado del otro.
          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
            <CalendarioMercados />
            <SiguiendoMercados />
          </div>
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
          { href: "/mercados/brokers", label: "Brokers" },
        ]}
        // Comparar no tiene solapa: se llega desde el botón "Comparar" de la ficha de cada activo.
        sinSolapa={["/mercados/comparar"]}
      />
      <div className="pt-8 lg:pt-12">{children}</div>
      <RefrescoEnVivo />
    </>
  );
}
