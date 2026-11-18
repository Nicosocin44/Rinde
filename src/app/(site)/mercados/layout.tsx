import { PageHeader } from "@/components/shell/page-header";
import { SectionTabs } from "@/components/shell/section-tabs";

export default function MercadosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader titulo="Mercados" bajada="CEDEARs, acciones argentinas, bonos en dólares, cripto y opciones de GGAL." />
      <SectionTabs
        etiqueta="Mercados"
        solapas={[
          { href: "/mercados", label: "CEDEARs" },
          { href: "/mercados/acciones", label: "Acciones" },
          { href: "/mercados/bonos", label: "Bonos" },
          { href: "/mercados/cripto", label: "Cripto" },
          { href: "/mercados/opciones", label: "Opciones" },
        ]}
      />
      <div className="pt-8 lg:pt-12">{children}</div>
    </>
  );
}
