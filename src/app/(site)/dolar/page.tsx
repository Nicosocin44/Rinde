import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { Cifra } from "@/components/ui/cifra";
import { Delta } from "@/components/ui/delta";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerCotizaciones } from "@/lib/data";
import { FUENTES, type CotizacionDolar } from "@/lib/data/types";
import { pesos, porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Dólar hoy: MEP, blue, oficial, CCL y cripto",
  description: "Cotización del dólar hoy en Argentina: oficial, MEP, CCL, blue, cripto, tarjeta y mayorista, con variación y brecha.",
};

export default async function Cotizaciones() {
  const r = await obtenerCotizaciones();
  if (!r.ok) return <ErrorState titulo="No pudimos traer las cotizaciones." detalle={`${r.error} Probá de nuevo en un minuto.`} />;
  const mep = r.data.find((c) => c.id === "mep");
  const oficial = r.data.find((c) => c.id === "oficial");
  const blue = r.data.find((c) => c.id === "blue");

  return (
    <div className="flex flex-col gap-12 lg:gap-16">
      {mep && (
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
          <div className="flex flex-col gap-3">
            <p className="text-label">Dólar MEP · para comprar</p>
            <ViewTransition name="cifra-mep" share="morph" default="none">
              <Cifra valor={mep.venta} className="text-hero" />
            </ViewTransition>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
              <Delta valor={mep.variacion} className="font-medium" />
              <span className="text-text-2">contra el cierre anterior</span>
            </div>
            <p className="max-w-md text-text-2">
              Es el dólar legal más usado para ahorrar: se compra con pesos en un broker. Está {mep.brecha !== null ? porcentaje(Math.abs(mep.brecha), 1) : "—"}{" "}
              {mep.brecha !== null && mep.brecha < 0 ? "abajo" : "arriba"} del oficial{oficial ? ` (${pesos(oficial.venta, 0)})` : ""}
              {blue ? ` y el blue está a ${pesos(blue.venta, 0)}` : ""}.
            </p>
          </div>
          <div className="hidden lg:block">
            <Sparkline valores={mep.serie} ancho={560} alto={120} relleno className="w-full" />
            <p className="mt-2 text-right text-micro">Últimos 30 días</p>
          </div>
        </section>
      )}

      <section aria-labelledby="todos">
        <h2 id="todos" className="mb-4 text-h3">
          Todos los dólares
        </h2>
        <div aria-hidden className="hidden h-10 grid-cols-[minmax(0,1.4fr)_120px_120px_96px_96px_96px] items-center gap-x-4 border-b border-border text-label md:grid">
          <span>Tipo</span>
          <span className="text-right">Comprás a</span>
          <span className="text-right">Vendés a</span>
          <span className="text-right">Variación</span>
          <span className="text-right">Brecha</span>
          <span className="text-right">30 días</span>
        </div>
        <ul className="border-t border-border md:border-t-0">
          {r.data.map((c) => (
            <FilaDolar key={c.id} c={c} destacado={c.id === "mep"} />
          ))}
        </ul>
        <SourceNote className="mt-5" fuentes={[FUENTES.dolarapi, FUENTES.argentinadatos]} actualizado={r.asOf} estado={r.status}>
          <span aria-hidden>·</span>
          <span>Variación contra el cierre del día hábil anterior</span>
        </SourceNote>
      </section>
    </div>
  );
}

function FilaDolar({ c, destacado }: { c: CotizacionDolar; destacado: boolean }) {
  return (
    <li className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-border py-4 md:grid-cols-[minmax(0,1.4fr)_120px_120px_96px_96px_96px] md:py-0 md:h-[68px]", destacado && "")}>
      <div className="min-w-0">
        <p className="text-[16px] font-medium">{c.nombre}</p>
        <p className="truncate text-chico text-text-3">{c.descripcion}</p>
      </div>
      <div className="text-right">
        <p className="text-micro md:hidden">Comprás a</p>
        <Cifra valor={c.venta} compuesta={false} className="text-[17px] font-medium" claseDecimales="text-text" />
      </div>
      <div className="hidden text-right md:block">
        {c.compra ? <Cifra valor={c.compra} compuesta={false} className="text-[17px] text-text-2" claseDecimales="text-text-2" /> : <span className="text-text-3">—</span>}
      </div>
      <div className="flex items-center gap-3 md:block md:text-right">
        <Delta valor={c.variacion} className="text-chico" />
      </div>
      <div className="text-right text-chico text-text-2">
        <span className="md:hidden">Brecha </span>
        {c.brecha !== null ? <span className="tabular">{porcentaje(c.brecha, 1)}</span> : <span className="text-text-3">—</span>}
      </div>
      <div className="hidden justify-end md:flex">
        <Sparkline valores={c.serie} ancho={88} alto={28} />
      </div>
    </li>
  );
}
