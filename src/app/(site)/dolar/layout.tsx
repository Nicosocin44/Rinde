import { SectionTabs } from "@/components/shell/section-tabs";
import { PageHeader } from "@/components/shell/page-header";

export default function DolarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader titulo="Dólar hoy" bajada="Todos los dólares, dónde conviene comprarlos según la app y cuánto te cuesta de verdad." />
      <SectionTabs
        etiqueta="Secciones del dólar"
        solapas={[
          { href: "/dolar", label: "Cotizaciones" },
          { href: "/dolar/comprar", label: "Dónde comprar" },
          { href: "/dolar/historico", label: "Histórico y brecha" },
          { href: "/dolar/conversor", label: "Conversor" },
        ]}
      />
      <div className="pt-8 lg:pt-12">{children}</div>
    </>
  );
}
