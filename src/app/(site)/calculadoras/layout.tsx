import { PageHeader } from "@/components/shell/page-header";
import { SectionTabs } from "@/components/shell/section-tabs";

export default function CalculadorasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader titulo="Calculadoras" bajada="Hacé la cuenta con tus números. Cada resultado se puede compartir y cada fórmula está a la vista." />
      <SectionTabs
        etiqueta="Calculadoras"
        solapas={[
          { href: "/calculadoras", label: "Todas" },
          { href: "/calculadoras/interes-compuesto", label: "Interés compuesto" },
          { href: "/calculadoras/metas", label: "Metas" },
          { href: "/calculadoras/jubilacion", label: "Jubilación" },
          { href: "/calculadoras/plazo-fijo", label: "Plazo fijo" },
          { href: "/calculadoras/tasas", label: "Tasas" },
          { href: "/calculadoras/inflacion", label: "Inflación" },
        ]}
      />
      <div className="pt-8 lg:pt-12">{children}</div>
    </>
  );
}
