"use client";

import { Fragment, useState } from "react";
import { SonrisaVolatilidad } from "@/components/charts/opciones";
import { SegmentedControl } from "@/components/ui/segmented";
import type { CadenaOpciones, FilaOpciones, LadoOpcion, VencimientoOpciones } from "@/lib/data/types";
import { fechaCorta, numero, pesos, porcentaje, SIN_DATO } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EncabezadoVencimiento, useVencimiento } from "./comun";
import { HistorialPrimas, type HistorialOpciones } from "./historial";
import { Etiqueta } from "@/components/ui/concepto";

const prima = (x: number | null | undefined) => (x === null || x === undefined ? SIN_DATO : numero(x, 2));

/** Solapa Cadena: la cadena de un vencimiento, cuánto movimiento descuentan las primas y el historial. */
export function VistaCadena({ cadena, historial }: { cadena: CadenaOpciones; historial: HistorialOpciones }) {
  const [v, elegir] = useVencimiento(cadena);
  const { subyacente: s } = cadena;
  return (
    <div className="flex flex-col gap-14 lg:gap-20">
      <section aria-labelledby="titulo-cadena" className="flex flex-col gap-6">
        <EncabezadoVencimiento titulo={`Cadena de ${s.ticker}`} id="titulo-cadena" cadena={cadena} v={v} onElegir={elegir} />
        <Cadena v={v} precio={s.precio} ticker={s.ticker} />
        <p className="max-w-3xl text-micro">
          Primas en pesos por acción; cada contrato son {cadena.lote} acciones. Compra y venta son las mejores puntas de BYMA. Sombreado, el lado de cada base que ya tiene valor intrínseco (call por debajo del precio, put por
          encima). VI: volatilidad implícita; delta: cuánto se mueve la prima por cada $ 1 que se mueve {s.ticker}. Las dos las calculamos nosotros con Black-Scholes
          {v.tasaModelo ? ` y la tasa de ${v.tasaModelo.nombre.toLowerCase()} (${porcentaje(v.tasaModelo.tna, 1)} TNA)` : " con tasa 0 % (no hubo una tasa en pesos disponible)"}. Con *, las puntas están muy separadas y la VI es
          aproximada.
        </p>
      </section>
      <section aria-labelledby="titulo-volatilidad" className="flex flex-col gap-6">
        <div className="flex max-w-3xl flex-col gap-2">
          <h2 id="titulo-volatilidad" className="text-[22px] font-semibold tracking-tight">
            Cuánto movimiento descuentan las primas
          </h2>
          <p className="text-text-2">
            La volatilidad implícita es el movimiento anual de {s.ticker} que hace que el modelo dé las primas de hoy. Si es más alta que lo que se movió en las últimas ruedas, el mercado espera más movimiento que el reciente.
          </p>
        </div>
        <Volatilidad v={v} cadena={cadena} />
        <SonrisaVolatilidad
          calls={v.filas.flatMap((f) => (f.base >= s.precio && f.call?.vi != null && !f.call.puntasAbiertas ? [{ x: f.base, y: f.call.vi }] : []))}
          puts={v.filas.flatMap((f) => (f.base <= s.precio && f.put?.vi != null && !f.put.puntasAbiertas ? [{ x: f.base, y: f.put.vi }] : []))}
          precio={s.precio}
          ticker={s.ticker}
        />
        <p className="max-w-3xl text-micro">Volatilidad implícita de cada base: puts por debajo del precio y calls por encima (las que todavía no tienen valor intrínseco, donde el modelo es más confiable), sin las de puntas muy separadas. Cuando las bases lejanas están más caras que las del medio, la curva “sonríe”.</p>
      </section>
      <HistorialPrimas cadena={cadena} v={v} historial={historial} />
    </div>
  );
}

// ───────────────────────── Volatilidad ─────────────────────────

function Volatilidad({ v, cadena }: { v: VencimientoOpciones; cadena: CadenaOpciones }) {
  const { d20, d60 } = cadena.volHistorica;
  const datos = [
    { etiqueta: "Volatilidad implícita", valor: v.viCercana, detalle: v.baseCercana ? `Base ${numero(v.baseCercana, 0)}, la más cercana al precio` : "Sin primas suficientes" },
    { etiqueta: "Histórica, 20 ruedas", valor: d20, detalle: `Lo que se movió ${cadena.subyacente.ticker} en el último mes` },
    { etiqueta: "Histórica, 60 ruedas", valor: d60, detalle: "En los últimos tres meses" },
  ];
  const diferencia = v.viCercana !== null && d20 !== null ? v.viCercana - d20 : null;
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-(--radius-card) border border-border bg-border sm:grid-cols-3">
        {datos.map((x) => (
          <div key={x.etiqueta} className="flex flex-col gap-1 bg-bg px-4 py-4">
            <dt className="text-label">{x.etiqueta}</dt>
            <dd className="tabular text-[28px] font-semibold leading-none tracking-tight">{x.valor !== null ? porcentaje(x.valor, 1) : SIN_DATO}</dd>
            <dd className="text-micro">{x.detalle}</dd>
          </div>
        ))}
      </dl>
      {diferencia !== null && (
        <p className="max-w-3xl text-chico text-text-2">
          Las primas descuentan que {cadena.subyacente.ticker} se mueva un <span className="font-medium text-text">{porcentaje(v.viCercana, 1)} anual</span>; en las últimas 20 ruedas se movió un{" "}
          <span className="font-medium text-text">{porcentaje(d20, 1)}</span>.{" "}
          {Math.abs(diferencia) < 0.03 ? "Están en línea." : diferencia > 0 ? "El mercado espera más movimiento que el reciente." : "El mercado espera menos movimiento que el reciente."}
        </p>
      )}
    </div>
  );
}

// ───────────────────────── Cadena ─────────────────────────

/** ¿El lado de esta fila ya tiene valor intrínseco? */
const adentro = (tipo: "call" | "put", base: number, precio: number) => (tipo === "call" ? base < precio : base > precio);

function Vi({ lado }: { lado: LadoOpcion | null }) {
  if (!lado || lado.vi === null) return <span className="text-text-3">{SIN_DATO}</span>;
  return (
    <span className={cn(lado.puntasAbiertas && "text-text-3")} title={lado.puntasAbiertas ? "Puntas muy separadas: la volatilidad implícita es aproximada" : undefined}>
      {porcentaje(lado.vi, 1)}
      {lado.puntasAbiertas && "*"}
    </span>
  );
}

const valor = (x: number | null | undefined, clase?: string) => <span className={cn(x === null || x === undefined ? "text-text-3" : clase)}>{prima(x)}</span>;

function Cadena({ v, precio, ticker }: { v: VencimientoOpciones; precio: number; ticker: string }) {
  const [lado, setLado] = useState<"call" | "put">("call");
  // Dónde va la línea del precio: antes de la primera base que lo supera.
  const corte = v.filas.findIndex((f) => f.base > precio);
  const lineaPrecio = (columnas: number) => (
    <tr aria-hidden>
      <td colSpan={columnas} className="p-0">
        <div className="flex items-center gap-3 py-1.5">
          <span className="h-px flex-1 bg-accent/60" />
          <span className="tabular text-micro font-medium text-accent">
            {ticker} {pesos(precio, 2)}
          </span>
          <span className="h-px flex-1 bg-accent/60" />
        </div>
      </td>
    </tr>
  );
  const celda = "px-2 py-2.5 text-right tabular";
  const sombra = (f: FilaOpciones, tipo: "call" | "put") => adentro(tipo, f.base, precio) && "bg-surface-2";
  const baseCelda = (f: FilaOpciones) => (
    <td className={cn("px-3 py-2.5 text-center font-mono text-[14px] font-semibold tabular", f.base === v.baseCercana && "text-accent")}>{numero(f.base, f.base % 1 ? 2 : 0)}</td>
  );

  return (
    <>
      {/* Desktop y tablet: calls a la izquierda, puts a la derecha, la base en el medio. */}
      <div className="hidden overflow-x-auto md:block">
        <div className="flex justify-between pb-2 text-chico font-medium">
          <span>
            Calls <span className="font-normal text-text-3">· derecho a comprar</span>
          </span>
          <span>
            Puts <span className="font-normal text-text-3">· derecho a vender</span>
          </span>
        </div>
        <table className="w-full border-collapse text-[14px]" aria-label={`Cadena de opciones de ${ticker}, vencimiento ${fechaCorta(v.fecha, true)}`}>
          <thead>
            <tr className="shadow-[inset_0_-1px_0_var(--c-border)]">
              {["Volumen", "Delta", "VI", "Último", "Compra", "Venta"].map((h, i) => (
                <th key={`c${h}`} className={cn("h-9 px-2 text-right text-label font-medium", (i === 0 || i === 1 || i === 3) && "hidden lg:table-cell")}>
                  <Etiqueta texto={h} />
                </th>
              ))}
              <th className="h-9 px-3 text-center text-label font-medium">
                <Etiqueta texto="Base" />
              </th>
              {["Compra", "Venta", "Último", "VI", "Delta", "Volumen"].map((h, i) => (
                <th key={`p${h}`} className={cn("h-9 px-2 text-right text-label font-medium", (i === 2 || i === 4 || i === 5) && "hidden lg:table-cell")}>
                  <Etiqueta texto={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.filas.map((f, i) => (
              <Fragment key={f.base}>
                {i === corte && lineaPrecio(13)}
                <tr className="shadow-[inset_0_-1px_0_var(--c-border)]">
                  <td className={cn(celda, "hidden text-text-3 lg:table-cell", sombra(f, "call"))}>{f.call?.volumen ? numero(f.call.volumen, 0) : SIN_DATO}</td>
                  <td className={cn(celda, "hidden lg:table-cell", sombra(f, "call"))}>{f.call?.delta != null ? numero(f.call.delta, 2) : <span className="text-text-3">{SIN_DATO}</span>}</td>
                  <td className={cn(celda, sombra(f, "call"))}>
                    <Vi lado={f.call} />
                  </td>
                  <td className={cn(celda, "hidden lg:table-cell", sombra(f, "call"))}>{valor(f.call?.ultimo, "text-text-2")}</td>
                  <td className={cn(celda, "font-medium", sombra(f, "call"))}>{valor(f.call?.compra)}</td>
                  <td className={cn(celda, "font-medium", sombra(f, "call"))}>{valor(f.call?.venta)}</td>
                  {baseCelda(f)}
                  <td className={cn(celda, "font-medium", sombra(f, "put"))}>{valor(f.put?.compra)}</td>
                  <td className={cn(celda, "font-medium", sombra(f, "put"))}>{valor(f.put?.venta)}</td>
                  <td className={cn(celda, "hidden lg:table-cell", sombra(f, "put"))}>{valor(f.put?.ultimo, "text-text-2")}</td>
                  <td className={cn(celda, sombra(f, "put"))}>
                    <Vi lado={f.put} />
                  </td>
                  <td className={cn(celda, "hidden lg:table-cell", sombra(f, "put"))}>{f.put?.delta != null ? numero(f.put.delta, 2) : <span className="text-text-3">{SIN_DATO}</span>}</td>
                  <td className={cn(celda, "hidden text-text-3 lg:table-cell", sombra(f, "put"))}>{f.put?.volumen ? numero(f.put.volumen, 0) : SIN_DATO}</td>
                </tr>
              </Fragment>
            ))}
            {corte === -1 && lineaPrecio(13)}
          </tbody>
        </table>
      </div>

      {/* Celular: calls o puts, de a uno. */}
      <div className="flex flex-col gap-4 md:hidden">
        <SegmentedControl
          etiqueta="Tipo de opción"
          valor={lado}
          onChange={setLado}
          ancho="lleno"
          opciones={[
            { valor: "call", etiqueta: "Calls" },
            { valor: "put", etiqueta: "Puts" },
          ]}
        />
        <table className="w-full border-collapse text-[14px]" aria-label={`${lado === "call" ? "Calls" : "Puts"} de ${ticker}, vencimiento ${fechaCorta(v.fecha, true)}`}>
          <thead>
            <tr className="shadow-[inset_0_-1px_0_var(--c-border)]">
              {["Base", "Compra", "Venta", "VI", "Delta"].map((h, i) => (
                <th key={h} className={cn("h-9 px-2 text-label font-medium", i === 0 ? "text-left" : "text-right")}>
                  <Etiqueta texto={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.filas
              .map((f, i) => ({ f, i, o: lado === "call" ? f.call : f.put }))
              .map(({ f, i, o }) => (
                <Fragment key={f.base}>
                  {i === corte && lineaPrecio(5)}
                  <tr className={cn("shadow-[inset_0_-1px_0_var(--c-border)]", sombra(f, lado))}>
                    <td className={cn("px-2 py-2.5 font-mono text-[14px] font-semibold tabular", f.base === v.baseCercana && "text-accent")}>{numero(f.base, f.base % 1 ? 2 : 0)}</td>
                    <td className={cn(celda, "font-medium")}>{valor(o?.compra)}</td>
                    <td className={cn(celda, "font-medium")}>{valor(o?.venta)}</td>
                    <td className={celda}>
                      <Vi lado={o} />
                    </td>
                    <td className={celda}>{o?.delta != null ? numero(o.delta, 2) : <span className="text-text-3">{SIN_DATO}</span>}</td>
                  </tr>
                </Fragment>
              ))}
            {corte === -1 && lineaPrecio(5)}
          </tbody>
        </table>
      </div>
    </>
  );
}

