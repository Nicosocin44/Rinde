import { Suspense } from "react";
import { Bento } from "@/components/modules/inicio/bento";
import { SeccionProducto } from "@/components/modules/inicio/producto";
import { FotoDeHoy } from "@/components/modules/inicio/foto-de-hoy";
import { DondeRinde } from "@/components/modules/pesos/donde-rinde";
import { ErrorState } from "@/components/ui/estados";
import { PuntoVivo, SourceNote } from "@/components/ui/frescura";
import { hoyAR } from "@/lib/calculos/fechas";
import { obtenerCotizaciones, obtenerFeriados, obtenerMacro, obtenerPesos, obtenerRanking } from "@/lib/data";
import { mercadoAbierto } from "@/lib/data/freshness";
import { proximosEventos, resumenDelDia } from "@/lib/data/servicios/inicio";
import { FUENTES } from "@/lib/data/types";
import { fechaLarga, hora } from "@/lib/format";
import { mejoresDelDia } from "@/lib/rankings/pesos";

export const revalidate = 60;

export default async function Inicio() {
  const [cotizaciones, pesosR, macro, ranking, feriados] = await Promise.all([obtenerCotizaciones(), obtenerPesos(), obtenerMacro(), obtenerRanking("USD"), obtenerFeriados()]);
  const cot = cotizaciones.ok ? cotizaciones.data : null;
  const mep = cot?.find((c) => c.id === "mep") ?? null;
  const oficial = cot?.find((c) => c.id === "oficial") ?? null;
  const opciones = pesosR.ok ? pesosR.data.opciones : [];
  const { liquida, a30 } = mejoresDelDia(opciones);
  const curva = pesosR.ok ? pesosR.data.curva : null;
  const hoy = hoyAR();
  const abierto = mercadoAbierto();
  const ahora = new Date();

  return (
    <div className="flex flex-col">
      <section className="pt-6 lg:pt-12" aria-labelledby="titulo-foto">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-chico text-text-3">
          <span>{fechaLarga(ahora)}</span>
          <span className="inline-flex items-center gap-2">
            <PuntoVivo estado={abierto ? "live" : "close"} />
            {abierto ? "Mercado abierto" : "Mercado cerrado"} · {hora(ahora)}
          </span>
        </p>
        <h1 id="titulo-foto" className="mt-3 mb-7 text-h1 lg:mt-4 lg:mb-10">
          La foto de hoy
        </h1>
        <FotoDeHoy mep={mep} oficial={oficial} mejorLiquida={liquida} mejorA30={a30} resumen={resumenDelDia(cot, macro.ok ? macro.data : null, curva)} />
        <SourceNote
          className="mt-4"
          fuentes={[FUENTES.dolarapi, FUENTES.argentinadatos, FUENTES.data912]}
          actualizado={cotizaciones.ok ? cotizaciones.asOf : null}
          estado={cotizaciones.ok ? cotizaciones.status : "stale"}
        />
      </section>

      <section className="pt-20 lg:pt-28" aria-labelledby="titulo-rinde">
        <div className="mb-8 flex flex-col gap-2 lg:mb-10">
          <h2 id="titulo-rinde" className="text-h2">
            ¿Dónde rinde más tu plata?
          </h2>
          <p className="max-w-2xl text-text-2">
            Billeteras, cuentas, fondos, plazos fijos y letras del Tesoro, comparados en la misma tasa (TEA) y en pesos que ganás. El orden es por ganancia: ningún acuerdo comercial lo cambia.
          </p>
        </div>
        {opciones.length ? <DondeRinde opciones={opciones} /> : <ErrorState titulo="No pudimos traer las tasas." detalle="Mostramos el comparador apenas vuelvan las fuentes." />}
        <SourceNote
          className="mt-6"
          fuentes={[FUENTES.argentinadatos, FUENTES.cnv, FUENTES.data912]}
          actualizado={pesosR.ok ? pesosR.asOf : null}
          estado={pesosR.ok ? pesosR.status : "stale"}
          metodologia="/metodologia#donde-rinde"
        />
      </section>

      <section className="pt-20 lg:pt-28" aria-labelledby="titulo-mercado">
        <h2 id="titulo-mercado" className="mb-8 text-h2 lg:mb-10">
          El mercado, de un vistazo
        </h2>
        <Bento ranking={ranking} curva={curva} macro={macro} eventos={proximosEventos(feriados, hoy, 5)} hoy={hoy} />
      </section>

      <Suspense fallback={<div className="h-[600px]" />}>
        <SeccionProducto />
      </Suspense>
    </div>
  );
}
