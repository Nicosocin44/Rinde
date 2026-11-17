import { PageHeader } from "@/components/shell/page-header";
import { SectionTabs } from "@/components/shell/section-tabs";

export default function PesosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader titulo="Tus pesos" bajada="Dónde rinden más, comparados en la misma tasa. Billeteras, fondos, plazos fijos, caución y letras del Tesoro." />
      <SectionTabs
        etiqueta="Secciones de pesos"
        solapas={[
          { href: "/pesos", label: "Comparador" },
          { href: "/pesos/plazo-fijo", label: "Plazo fijo" },
          { href: "/pesos/billeteras", label: "Billeteras" },
          { href: "/pesos/fci", label: "Fondos" },
          { href: "/pesos/caucion", label: "Caución" },
          { href: "/pesos/lecaps", label: "LECAPs" },
          { href: "/pesos/simulador", label: "Simulador" },
        ]}
      />
      <div className="pt-8 lg:pt-12">{children}</div>
    </>
  );
}
