import { PageHeader } from "@/components/shell/page-header";
import { SectionTabs } from "@/components/shell/section-tabs";
import { BotonSiguiendo, MarcoSiguiendo } from "@/components/modules/mercados/favoritos";

export default function MercadosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader titulo="Mercados" bajada="CEDEARs, acciones argentinas, bonos en dólares, cripto y opciones de GGAL." />
      <MarcoSiguiendo
        solapas={
          <SectionTabs
            etiqueta="Mercados"
            extra={<BotonSiguiendo />}
            solapas={[
              { href: "/mercados", label: "CEDEARs" },
              { href: "/mercados/acciones", label: "Acciones" },
              { href: "/mercados/bonos", label: "Bonos" },
              { href: "/mercados/cripto", label: "Cripto" },
              { href: "/mercados/opciones", label: "Opciones" },
            ]}
          />
        }
      >
        {children}
      </MarcoSiguiendo>
    </>
  );
}
