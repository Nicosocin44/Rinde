"use client";

import { useState } from "react";
import { LineaHistorial } from "@/components/charts/opciones";
import { Delta } from "@/components/ui/delta";
import type { CadenaOpciones, VencimientoOpciones } from "@/lib/data/types";
import type { HistorialOpciones } from "@/lib/opciones/historial";
import { fechaCorta, nombreMes, numero, pesos } from "@/lib/format";
import { AvisarPrima } from "./aviso";

export type { HistorialOpciones };

/** Prima de una serie día a día, desde que empezamos a guardarlas. */
export function HistorialPrimas({ cadena, v, historial }: { cadena: CadenaOpciones; v: VencimientoOpciones; historial: HistorialOpciones }) {
  const opciones = v.filas.flatMap((f) => [
    ...(f.call ? [{ simbolo: f.call.simbolo, etiqueta: `Call ${numero(f.base, 0)}`, prima: f.call.referencia ?? f.call.ultimo }] : []),
    ...(f.put ? [{ simbolo: f.put.simbolo, etiqueta: `Put ${numero(f.base, 0)}`, prima: f.put.referencia ?? f.put.ultimo }] : []),
  ]);
  const inicial = v.filas.find((f) => f.base === v.baseCercana)?.call?.simbolo ?? opciones[0]?.simbolo ?? "";
  const [elegida, setElegida] = useState<string | null>(null);
  const simbolo = elegida && opciones.some((o) => o.simbolo === elegida) ? elegida : inicial;
  const serie = historial.series[simbolo] ?? [];
  const actual = opciones.find((o) => o.simbolo === simbolo);
  const variacion = serie.length >= 2 ? serie.at(-1)!.prima / serie[0]!.prima - 1 : null;

  return (
    <section aria-labelledby="titulo-historial" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-3xl flex-col gap-2">
          <h2 id="titulo-historial" className="text-[22px] font-semibold tracking-tight">
            Una serie: su historial y alertas
          </h2>
          <p className="text-text-2">
            Elegí una serie para ver cómo cambió su prima y pedir que te avisemos cuando pase un valor. La fuente no publica la historia de las opciones locales, así que la guardamos nosotros: una foto de cada serie al cierre de cada rueda
            {historial.desde ? `, desde el ${fechaCorta(historial.desde, true)}` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-label">Serie</span>
            <select
              value={simbolo}
              onChange={(e) => setElegida(e.target.value)}
              className="h-10 rounded-(--radius-control) border border-border-strong bg-surface-2 px-3 text-[15px] focus-visible:border-accent"
            >
              {opciones.map((o) => (
                <option key={o.simbolo} value={o.simbolo}>
                  {o.etiqueta} · {o.simbolo}
                </option>
              ))}
            </select>
          </label>
          {actual && <AvisarPrima simbolo={actual.simbolo} nombre={`${actual.etiqueta} ${cadena.subyacente.ticker} ${nombreMes(v.fecha).slice(0, 3)}`} prima={actual.prima} />}
        </div>
      </div>
      {serie.length >= 2 ? (
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-baseline gap-x-3 text-chico text-text-2">
            <span>
              Del {fechaCorta(serie[0]!.fecha)} al {fechaCorta(serie.at(-1)!.fecha)}: de <span className="tabular font-medium text-text">{pesos(serie[0]!.prima, 2)}</span> a{" "}
              <span className="tabular font-medium text-text">{pesos(serie.at(-1)!.prima, 2)}</span>
            </span>
            <Delta valor={variacion} className="text-chico" />
          </p>
          <LineaHistorial puntos={serie.map((p) => ({ fecha: p.fecha, valor: p.prima }))} etiqueta={`Prima de ${simbolo} por día`} />
        </div>
      ) : (
        <div className="flex flex-col gap-1 rounded-(--radius-card) border border-dashed border-border-strong px-5 py-6">
          <p className="font-medium">{historial.dias <= 1 ? "Todavía hay una sola rueda guardada." : `Esta serie todavía no tiene dos ruedas con precio (${cadena.subyacente.ticker} lleva ${historial.dias} guardadas).`}</p>
          <p className="text-chico text-text-2">El gráfico aparece desde la segunda rueda con precio. Guardamos una foto cada día hábil a las 19 h.</p>
        </div>
      )}
    </section>
  );
}
