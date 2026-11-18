import { PageHeader } from "@/components/shell/page-header";
import { SectionTabs } from "@/components/shell/section-tabs";
import { Favoritos } from "@/components/modules/mercados/favoritos";

export default function MercadosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader titulo="Mercados" bajada="CEDEARs, acciones argentinas y cripto, con el dólar implícito de cada uno." />
      <SectionTabs
        etiqueta="Mercados"
        solapas={[
          { href: "/mercados", label: "CEDEARs" },
          { href: "/mercados/acciones", label: "Acciones" },
          { href: "/mercados/cripto", label: "Cripto" },
        ]}
      />
      <div className="pt-8 lg:pt-12">
        <Favoritos />
        {children}
      </div>
    </>
  );
}
