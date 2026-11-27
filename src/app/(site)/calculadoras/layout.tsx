import { PageHeader } from "@/components/shell/page-header";
import { VolverCalculadoras } from "./volver";

/**
 * Sin solapas (pedido de Benja): la portada de Calculadoras, con sus tres grupos, hace de menú, y cada calculadora tiene
 * su "← Todas las calculadoras".
 */
export default function CalculadorasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader titulo="Calculadoras" bajada="Hacé la cuenta con tus números. Cada resultado se puede compartir y cada fórmula está a la vista." />
      <div className="flex flex-col pt-8 lg:pt-12">
        <VolverCalculadoras />
        <div>{children}</div>
      </div>
    </>
  );
}
