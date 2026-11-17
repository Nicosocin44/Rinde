import type { ReactNode } from "react";
import { CifraPorcentaje } from "@/components/ui/cifra";

/** La respuesta grande con la que abre cada pantalla de Pesos: etiqueta, cifra protagonista y contexto. */
export function Respuesta({ etiqueta, fraccion, sufijo = "TNA", titulo, contexto, lateral }: { etiqueta: string; fraccion: number | null; sufijo?: string; titulo: ReactNode; contexto?: ReactNode; lateral?: ReactNode }) {
  return (
    <section className="mb-12 grid gap-6 lg:mb-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="flex flex-col gap-3">
        <p className="text-label">{etiqueta}</p>
        <CifraPorcentaje fraccion={fraccion} decimales={1} sufijo={sufijo} className="text-hero" />
        <p className="text-[17px] font-medium">{titulo}</p>
        {contexto && <div className="max-w-xl text-text-2">{contexto}</div>}
      </div>
      {lateral}
    </section>
  );
}
