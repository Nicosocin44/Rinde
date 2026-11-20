"use client";

import { ColorType, createChart, CrosshairMode, LineSeries, LineStyle, type IChartApi, type ISeriesApi, type MouseEventParams, type Time, type UTCTimestamp } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { delta, fechaCorta } from "@/lib/format";
import { usePreferencias } from "@/lib/preferencias";

/** Una línea del gráfico: variación desde el inicio (fracción) por fecha, y su color como variable CSS ("var(--cat-1)"). */
export type LineaComparada = { id: string; etiqueta: string; color: string; puntos: [string, number][] };

const aTiempo = (iso: string) => Math.floor(Date.parse(iso) / 1000) as UTCTimestamp;
const leer = (variable: string) => {
  const nombre = variable.match(/var\((--[a-z0-9-]+)\)/i)?.[1] ?? variable;
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || nombre;
};

/**
 * Varias líneas en el mismo gráfico, todas arrancando en 0 %. Al pasar el cursor o el dedo, la leyenda muestra el valor
 * de cada una en esa fecha (TradingView Lightweight Charts, con los colores del sitio).
 */
export function GraficoComparado({ lineas, alto = 340, className }: { lineas: LineaComparada[]; alto?: number; className?: string }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const grafico = useRef<IChartApi | null>(null);
  const series = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const [cursor, setCursor] = useState<{ fecha: string; valores: Record<string, number> } | null>(null);
  const { tema, coloresAlt } = usePreferencias();

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, fontFamily: "var(--font-inter), system-ui", fontSize: 11, attributionLogo: true },
      grid: { vertLines: { visible: false }, horzLines: { style: LineStyle.Solid } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true, lockVisibleTimeRangeOnResize: true },
      crosshair: { mode: CrosshairMode.Magnet, horzLine: { visible: false, labelVisible: false }, vertLine: { labelVisible: false, style: LineStyle.Solid, width: 1 } },
      handleScale: false,
      handleScroll: false,
      localization: { locale: "es-AR", priceFormatter: (p: number) => delta(p, Math.abs(p) >= 1 ? 0 : 1) },
    });
    grafico.current = chart;
    const mapa = series.current;
    const alMover = (p: MouseEventParams<Time>) => {
      if (!p.time) return setCursor(null);
      const valores: Record<string, number> = {};
      for (const [id, s] of mapa) {
        const dato = p.seriesData.get(s) as { value?: number } | undefined;
        if (typeof dato?.value === "number") valores[id] = dato.value;
      }
      setCursor({ fecha: new Date((p.time as number) * 1000).toISOString().slice(0, 10), valores });
    };
    chart.subscribeCrosshairMove(alMover);
    return () => {
      chart.unsubscribeCrosshairMove(alMover);
      chart.remove();
      grafico.current = null;
      mapa.clear();
    };
  }, []);

  // Una serie por línea: se recrean cuando cambian (agregar o sacar un activo, otra moneda u otro período).
  useEffect(() => {
    const chart = grafico.current;
    if (!chart) return;
    for (const s of series.current.values()) chart.removeSeries(s);
    series.current.clear();
    lineas.forEach((l, i) => {
      const s = chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerRadius: 4, crosshairMarkerBorderWidth: 2 });
      s.setData(l.puntos.map(([f, v]) => ({ time: aTiempo(f), value: v })));
      // La línea del 0 %: el punto de partida de todos.
      if (i === 0) s.createPriceLine({ price: 0, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false, color: leer("var(--c-border-strong)") });
      series.current.set(l.id, s);
    });
    chart.timeScale().fitContent();
  }, [lineas]);

  // Colores: dependen del tema.
  useEffect(() => {
    const chart = grafico.current;
    if (!chart) return;
    chart.applyOptions({ layout: { textColor: leer("var(--c-text-3)") }, grid: { horzLines: { color: leer("var(--c-border)") } }, crosshair: { vertLine: { color: leer("var(--c-border-strong)") } } });
    for (const l of lineas) {
      const color = leer(l.color);
      series.current.get(l.id)?.applyOptions({ color, crosshairMarkerBackgroundColor: color, crosshairMarkerBorderColor: leer("var(--c-surface)") });
    }
  }, [lineas, tema, coloresAlt]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ul className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5" aria-live="polite">
        {lineas.map((l) => {
          const valor = cursor ? cursor.valores[l.id] : l.puntos.at(-1)?.[1];
          return (
            <li key={l.id} className="flex items-baseline gap-2">
              <span aria-hidden className="size-2.5 self-center rounded-full" style={{ background: l.color }} />
              <span className="text-chico font-semibold">{l.etiqueta}</span>
              <span className={cn("tabular text-chico", valor === undefined ? "text-text-3" : valor >= 0 ? "text-gain" : "text-loss")}>{valor === undefined ? "—" : delta(valor, 1)}</span>
            </li>
          );
        })}
        <li className="text-micro text-text-3">{cursor ? `al ${fechaCorta(cursor.fecha, true)}` : "en el período"}</li>
      </ul>
      <div ref={contenedor} style={{ height: alto }} className="w-full" role="img" aria-label={`Variación desde el inicio del período: ${lineas.map((l) => `${l.etiqueta} ${delta(l.puntos.at(-1)?.[1] ?? 0, 1)}`).join(", ")}`} />
    </div>
  );
}
