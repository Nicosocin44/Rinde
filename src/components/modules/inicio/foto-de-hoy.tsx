import Link from "next/link";
import { ViewTransition } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { Cifra, CifraPorcentaje } from "@/components/ui/cifra";
import { Delta } from "@/components/ui/delta";
import { ErrorState } from "@/components/ui/estados";
import type { CotizacionDolar, OpcionPesos } from "@/lib/data/types";
import { pesos, porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * "La foto de hoy": tres respuestas grandes, no diez números.
 * Separadas con aire y hairlines, no con cajas dentro de cajas.
 */
export function FotoDeHoy({
  mep,
  oficial,
  mejorLiquida,
  mejorA30,
  resumen,
}: {
  mep: CotizacionDolar | null;
  oficial: CotizacionDolar | null;
  mejorLiquida: OpcionPesos | null;
  mejorA30: OpcionPesos | null;
  resumen: string[];
}) {
  return (
    <div className="grid border-y border-border lg:grid-cols-3">
      {/* 1. ¿Cuánto está el dólar? — card que se transforma en el encabezado de /dolar (interacción firma 4). */}
      <Link
        href="/dolar"
        className="group presionable relative flex flex-col gap-4 py-7 transition-colors lg:py-9 lg:pr-10"
      >
        <Etiqueta>Dólar MEP</Etiqueta>
        {mep ? (
          <>
            <ViewTransition name="cifra-mep" share="morph" default="none">
              <Cifra valor={mep.venta} className="text-hero" />
            </ViewTransition>
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <Delta valor={mep.variacion} className="text-[15px] font-medium" />
                <p className="text-chico text-text-2">
                  Oficial {oficial ? pesos(oficial.venta, 0) : "—"}
                  {mep.brecha !== null && <> · brecha {porcentaje(mep.brecha, 1)}</>}
                </p>
              </div>
              <Sparkline valores={mep.serie} ancho={96} alto={32} relleno />
            </div>
          </>
        ) : (
          <ErrorState compacto titulo="No pudimos traer el dólar." detalle="Volvé a intentar en un minuto." />
        )}
        <span className="text-chico text-text-3 transition-colors group-hover:text-text-2">Ver todos los dólares →</span>
      </Link>

      {/* 2. ¿Dónde rinde más mi plata hoy? */}
      <Link href="/pesos" className="group presionable flex flex-col gap-4 border-t border-border py-7 lg:border-t-0 lg:border-l lg:px-10 lg:py-9">
        <Etiqueta>Dónde rinde más hoy</Etiqueta>
        {mejorLiquida ? (
          <>
            <CifraPorcentaje fraccion={mejorLiquida.tna} decimales={1} sufijo="TNA" className="text-hero" />
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-medium">
                {mejorLiquida.nombre} <span className="font-normal text-text-2">· sin plazo</span>
              </p>
              {mejorA30 && (
                <p className="text-chico text-text-2">
                  A 30 días: {porcentaje(mejorA30.tna, 1)} en {mejorA30.nombre}
                  {mejorA30.tipo === "plazo_fijo" ? " (plazo fijo)" : ""}
                </p>
              )}
            </div>
          </>
        ) : (
          <ErrorState compacto titulo="No pudimos traer las tasas." />
        )}
        <span className="mt-auto text-chico text-text-3 transition-colors group-hover:text-text-2">Comparar todas las tasas →</span>
      </Link>

      {/* 3. ¿Qué pasó hoy? */}
      <div className="flex flex-col gap-4 border-t border-border py-7 lg:border-t-0 lg:border-l lg:py-9 lg:pl-10">
        <Etiqueta>Qué pasó hoy</Etiqueta>
        {resumen.length > 0 ? (
          <p className="text-[19px] leading-[28px] tracking-[-0.01em] text-pretty lg:text-[21px] lg:leading-[31px]">
            {resumen.map((f, i) => (
              <span key={i} className={cn(i > 0 && "text-text-2")}>
                {f}{" "}
              </span>
            ))}
          </p>
        ) : (
          <p className="text-text-2">Todavía no hay movimientos para resumir.</p>
        )}
        <p className="mt-auto text-micro">Resumen armado con reglas a partir de los datos de esta página.</p>
      </div>
    </div>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <p className="text-label">{children}</p>;
}
