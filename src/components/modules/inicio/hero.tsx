import Link from "next/link";
import { ViewTransition } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { ButtonLink } from "@/components/ui/button";
import { Delta } from "@/components/ui/delta";
import { PuntoVivo } from "@/components/ui/frescura";
import type { CotizacionDolar, OpcionPesos } from "@/lib/data/types";
import { fechaLarga, hora, pesos, porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";

type Parte = { texto: string } | { dato: string; color: "verde" | "celeste"; href: string; transicion?: string; etiqueta: string };

/**
 * La foto de hoy, en una frase: el titular ES la respuesta, con los dos números del día adentro
 * (el MEP en verde, la mejor tasa en celeste). Debajo, el contexto de cada número y qué pasó hoy.
 * Único movimiento sin acción del usuario: el titular sube palabra por palabra al cargar y frena.
 */
export function Hero({
  mep,
  oficial,
  mejorLiquida,
  mejorA30,
  resumen,
  abierto,
}: {
  mep: CotizacionDolar | null;
  oficial: CotizacionDolar | null;
  mejorLiquida: OpcionPesos | null;
  mejorA30: OpcionPesos | null;
  resumen: string[];
  abierto: boolean;
}) {
  const ahora = new Date();
  const partes: Parte[] = [
    ...(mep
      ? [
          { texto: "Hoy el dólar MEP está a" },
          { dato: pesos(mep.venta, 0), color: "verde" as const, href: "/dolar", transicion: "cifra-mep", etiqueta: "Ver el dólar" },
        ]
      : [{ texto: "Hoy" }]),
    ...(mejorLiquida
      ? [
          { texto: mep ? "y tu plata rinde hasta" : "tu plata rinde hasta" },
          { dato: porcentaje(mejorLiquida.tna, 1), color: "celeste" as const, href: "/pesos", etiqueta: "Ver las tasas" },
          { texto: "sin plazo." },
        ]
      : [{ texto: "mirá dónde rinde más tu plata." }]),
  ];

  let i = 0;
  const textoPlano = partes.map((p) => ("texto" in p ? p.texto : p.dato)).join(" ");

  return (
    <section className="pt-8 pb-10 lg:pt-16 lg:pb-14" aria-labelledby="titulo-portada">
      <p className="flex items-center gap-2.5 text-chico font-medium text-text-2">
        <PuntoVivo estado={abierto ? "live" : "close"} />
        <span>
          La foto de hoy, {fechaLarga(ahora).toLowerCase()}. {abierto ? "Mercado abierto" : "Mercado cerrado"}, {hora(ahora)}.
        </span>
      </p>

      <h1 id="titulo-portada" className="mt-5 max-w-[15.5ch] font-display text-[42px] leading-[1.02] font-extrabold tracking-[-0.045em] text-balance md:text-[72px] xl:max-w-[16ch] xl:text-[104px] xl:leading-[0.96] lg:mt-7">
        <span className="sr-only">{textoPlano}</span>
        {partes.map((p, n) =>
          "texto" in p ? (
            p.texto.split(" ").map((palabra, k) => (
              <span key={`${n}-${k}`} aria-hidden className="palabra" style={{ "--i": i++ } as React.CSSProperties}>
                {palabra}&nbsp;
              </span>
            ))
          ) : (
            <span key={n} aria-hidden className="palabra" style={{ "--i": i++ } as React.CSSProperties}>
              <Link
                href={p.href}
                tabIndex={-1}
                className={cn(
                  "sobre-color inline-block -rotate-2 rounded-[0.32em] px-[0.22em] pb-[0.04em] tabular-nums transition-transform duration-(--duration-base) ease-(--ease-rebote) hover:rotate-0",
                  p.color === "verde" ? "bg-verde" : "bg-celeste",
                )}
              >
                {p.transicion ? (
                  <ViewTransition name={p.transicion} share="morph" default="none">
                    <span>{p.dato}</span>
                  </ViewTransition>
                ) : (
                  p.dato
                )}
              </Link>
              &nbsp;
            </span>
          ),
        )}
      </h1>

      <div className="mt-10 grid gap-x-10 gap-y-6 border-t border-border pt-6 md:grid-cols-2 lg:mt-14 lg:grid-cols-[1fr_1fr_1.3fr] lg:pt-8">
        <Link href="/dolar" className="llegar group flex items-start justify-between gap-4" style={{ "--i": 0 } as React.CSSProperties}>
          <div>
            <p className="font-display text-[19px] font-bold tracking-[-0.02em]">El dólar MEP</p>
            {mep ? (
              <p className="mt-1.5 text-[15px] leading-[22px] text-text-2">
                <Delta valor={mep.variacion} className="mr-1.5 font-semibold" />
                en el día. Oficial a {oficial ? pesos(oficial.venta, 0) : "—"}
                {mep.brecha !== null && <>, una brecha de {porcentaje(mep.brecha, 1)}</>}.
              </p>
            ) : (
              <p className="mt-1.5 text-[15px] text-text-2">No pudimos traer el dólar. Probá en un minuto.</p>
            )}
          </div>
          {mep && <Sparkline valores={mep.serie} ancho={88} alto={36} grosor={2} className="mt-1 shrink-0" />}
        </Link>
        <Link href="/pesos" className="llegar group" style={{ "--i": 1 } as React.CSSProperties}>
          <p className="font-display text-[19px] font-bold tracking-[-0.02em]">La mejor tasa</p>
          {mejorLiquida ? (
            <p className="mt-1.5 text-[15px] leading-[22px] text-text-2">
              {mejorLiquida.nombre}, con la plata disponible cuando quieras.
              {mejorA30 && (
                <>
                  {" "}
                  Si la dejás 30 días: {porcentaje(mejorA30.tna, 1)} en {mejorA30.nombre}.
                </>
              )}
            </p>
          ) : (
            <p className="mt-1.5 text-[15px] text-text-2">No pudimos traer las tasas.</p>
          )}
        </Link>
        <div className="llegar md:col-span-2 lg:col-span-1" style={{ "--i": 2 } as React.CSSProperties}>
          <p className="font-display text-[19px] font-bold tracking-[-0.02em]">Qué pasó hoy</p>
          <p className="mt-1.5 text-[15px] leading-[22px] text-pretty text-text-2">{resumen.length ? resumen.join(" ") : "Todavía no hay movimientos para resumir."}</p>
        </div>
      </div>

      <div className="llegar mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 lg:mt-10" style={{ "--i": 3 } as React.CSSProperties}>
        <ButtonLink href="#donde-rinde" variante="primario" tamano="lg" flecha>
          Comparar dónde rinde más
        </ButtonLink>
      </div>
    </section>
  );
}
