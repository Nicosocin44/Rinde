import { Suspense } from "react";
import { LimiteError } from "@/components/escenas/limite-error";
import { ScrollSuave } from "@/components/escenas/scroll-suave";
import { CintaCotizaciones } from "@/components/modules/inicio/cinta";
import { Hero } from "@/components/modules/inicio/hero";
import { armarHistoria } from "@/components/modules/inicio/historia/datos";
import { EscenaDolar } from "@/components/modules/inicio/historia/dolar";
import { EscenaProblema } from "@/components/modules/inicio/historia/problema";
import { EscenaRespuesta } from "@/components/modules/inicio/historia/respuesta";
import { DondeRinde } from "@/components/modules/pesos/donde-rinde";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerCotizaciones, obtenerMacro, obtenerPesos, obtenerPulso } from "@/lib/data";
import { mercadoAbierto } from "@/lib/data/freshness";
import { resumenDelDia } from "@/lib/data/servicios/inicio";
import { FUENTES } from "@/lib/data/types";
import { mejoresDelDia } from "@/lib/rankings/pesos";

export const revalidate = 60;

/**
 * Inicio: la foto de hoy y la herramienta arriba; debajo, la historia del producto en escenas
 * (narrativa y coreografía en docs/PROGRESO.md). Cada escena va en su propio error boundary.
 */
export default async function Inicio() {
  const [cotizaciones, pesosR, macro, pulso, historia] = await Promise.all([obtenerCotizaciones(), obtenerPesos(), obtenerMacro(), obtenerPulso(), armarHistoria()]);
  const cot = cotizaciones.ok ? cotizaciones.data : null;
  const mep = cot?.find((c) => c.id === "mep") ?? null;
  const oficial = cot?.find((c) => c.id === "oficial") ?? null;
  const opciones = pesosR.ok ? pesosR.data.opciones : [];
  const { liquida, a30 } = mejoresDelDia(opciones);
  const curva = pesosR.ok ? pesosR.data.curva : null;

  return (
    <div className="flex flex-col">
      <ScrollSuave />
      <Hero mep={mep} oficial={oficial} mejorLiquida={liquida} mejorA30={a30} resumen={resumenDelDia(cot, macro.ok ? macro.data : null, curva)} abierto={mercadoAbierto()} />
      <SourceNote
        fuentes={[FUENTES.dolarapi, FUENTES.argentinadatos, FUENTES.data912]}
        actualizado={cotizaciones.ok ? cotizaciones.asOf : null}
        estado={cotizaciones.ok ? cotizaciones.status : "stale"}
      />

      <CintaCotizaciones cotizaciones={cot ?? []} pulso={pulso} className="mt-10 lg:mt-14" />

      {/* La herramienta: lámina tinta, quieta y lista para usar. */}
      <section id="donde-rinde" aria-labelledby="titulo-rinde" className="inversa lamina lamina-cerrada a-lo-ancho -mt-6 scroll-mt-24 pt-20 pb-14 lg:-mt-10 lg:pt-28 lg:pb-20">
        <div className="mb-8 grid gap-4 lg:mb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end lg:gap-16">
          <h2 id="titulo-rinde" className="text-h1 text-balance">
            ¿Dónde rinde más tu plata?
          </h2>
          <p className="max-w-[46ch] text-[16px] leading-[25px] text-text-2 lg:text-[18px] lg:leading-[28px]">
            Billeteras, cuentas, fondos, plazos fijos y letras del Tesoro en la misma tasa (TEA) y en pesos que ganás. El orden es por ganancia: ningún acuerdo comercial lo cambia.
          </p>
        </div>
        {opciones.length ? (
          <Suspense>
            <DondeRinde opciones={opciones} />
          </Suspense>
        ) : (
          <ErrorState titulo="No pudimos traer las tasas." detalle="Mostramos el comparador apenas vuelvan las fuentes." />
        )}
        <SourceNote
          className="mt-6"
          fuentes={[FUENTES.argentinadatos, FUENTES.cnv, FUENTES.data912]}
          actualizado={pesosR.ok ? pesosR.asOf : null}
          estado={pesosR.ok ? pesosR.status : "stale"}
          metodologia="/metodologia#donde-rinde"
        />
      </section>

      {/* La historia. */}
      {historia.piezas && (
        <LimiteError nombre="El problema">
          <EscenaProblema piezas={historia.piezas} />
        </LimiteError>
      )}
      {historia.tasas && historia.tasas.opciones.length >= 3 && (
        <LimiteError nombre="La respuesta">
          <EscenaRespuesta opciones={historia.tasas.opciones} asOf={historia.tasas.asOf} estado={historia.tasas.estado} />
        </LimiteError>
      )}
      {historia.dolar && historia.dolar.proveedores.length >= 3 && (
        <LimiteError nombre="El dólar">
          <EscenaDolar proveedores={historia.dolar.proveedores} asOf={historia.dolar.asOf} estado={historia.dolar.estado} />
        </LimiteError>
      )}
    </div>
  );
}
