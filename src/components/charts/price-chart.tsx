"use client";

import { AreaSeries, ColorType, createChart, CrosshairMode, LineStyle, type IChartApi, type ISeriesApi, type MouseEventParams, type Time, type UTCTimestamp } from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cifra } from "@/components/ui/cifra";
import { Delta } from "@/components/ui/delta";
import { SegmentedControl } from "@/components/ui/segmented";
import { fechaCorta, numero } from "@/lib/format";
import { usePreferencias } from "@/lib/preferencias";
import { cn } from "@/lib/cn";

export type Rango = "1S" | "1M" | "3M" | "1A" | "5A" | "Max";
const DIAS_RANGO: Record<Rango, number> = { "1S": 7, "1M": 31, "3M": 92, "1A": 366, "5A": 1827, Max: Infinity };
const RANGOS: { valor: Rango; etiqueta: string }[] = [
  { valor: "1S", etiqueta: "1S" },
  { valor: "1M", etiqueta: "1M" },
  { valor: "3M", etiqueta: "3M" },
  { valor: "1A", etiqueta: "1A" },
  { valor: "5A", etiqueta: "5A" },
  { valor: "Max", etiqueta: "Máx" },
];

/** Serie compacta: [fecha ISO, valor]. */
export type SerieCompacta = [string, number][];

function leerColor(nombre: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

/**
 * Gráfico de precio con encabezado vivo (TradingView Lightweight Charts, con los colores de nuestro sistema).
 * Interacción firma 3: al pasar el cursor o el dedo, la cifra del encabezado cambia al valor de ese momento,
 * con su fecha; al soltar, vuelve al valor actual.
 * Serie única: verde o rojo según la variación del período elegido (como Robinhood).
 */
export function PriceChart({
  serie,
  titulo,
  rangoInicial = "3M",
  alto = 320,
  moneda = "$",
  decimales = 2,
  formato,
  className,
  acciones,
  variacionEn = "porcentaje",
  tono = "direccion",
}: {
  /** "puntos": la variación es una diferencia en pp (para series que ya son porcentajes, como la brecha). */
  variacionEn?: "porcentaje" | "puntos";
  /** "direccion": verde o rojo según el período. "neutro": color de marca (cuando subir no es bueno ni malo). */
  tono?: "direccion" | "neutro";
  serie: SerieCompacta;
  titulo: React.ReactNode;
  rangoInicial?: Rango;
  alto?: number;
  moneda?: string | null;
  decimales?: number;
  formato?: (v: number) => string;
  className?: string;
  acciones?: React.ReactNode;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const grafico = useRef<IChartApi | null>(null);
  const serieApi = useRef<ISeriesApi<"Area"> | null>(null);
  const [rango, setRango] = useState<Rango>(rangoInicial);
  const [scrub, setScrub] = useState<{ valor: number; fecha: string } | null>(null);
  const { tema, coloresAlt } = usePreferencias();
  const formatoRef = useRef(formato);
  useEffect(() => {
    formatoRef.current = formato;
  }, [formato]);

  const visible = useMemo(() => {
    const ultima = serie.at(-1)?.[0];
    if (!ultima || rango === "Max") return serie;
    const desde = new Date(Date.parse(ultima) - DIAS_RANGO[rango] * 86_400_000).toISOString().slice(0, 10);
    return serie.filter(([f]) => f >= desde);
  }, [serie, rango]);

  const actual = visible.at(-1);
  const inicial = visible[0];
  const cambio = (a: number, b: number) => (variacionEn === "puntos" ? a - b : b > 0 ? a / b - 1 : null);
  const variacion = actual && inicial ? cambio(actual[1], inicial[1]) : null;
  const sube = (variacion ?? 0) >= 0;

  // Crear el gráfico una vez.
  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, fontFamily: "var(--font-inter), system-ui", fontSize: 11, attributionLogo: true },
      grid: { vertLines: { visible: false }, horzLines: { style: LineStyle.Solid } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.08 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true, lockVisibleTimeRangeOnResize: true },
      crosshair: { mode: CrosshairMode.Magnet, horzLine: { visible: false, labelVisible: false }, vertLine: { labelVisible: false, style: LineStyle.Solid, width: 1 } },
      handleScale: false,
      handleScroll: false,
      localization: { locale: "es-AR", priceFormatter: (p: number) => (formatoRef.current ? formatoRef.current(p) : numero(p, p >= 1000 ? 0 : 2)) },
    });
    const s = chart.addSeries(AreaSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerRadius: 4, crosshairMarkerBorderWidth: 2 });
    grafico.current = chart;
    serieApi.current = s;
    const alMover = (p: MouseEventParams<Time>) => {
      const dato = p.seriesData.get(s) as { value?: number } | undefined;
      if (!p.time || !dato?.value) {
        setScrub(null);
        return;
      }
      const fecha = new Date((p.time as number) * 1000).toISOString().slice(0, 10);
      setScrub({ valor: dato.value, fecha });
    };
    chart.subscribeCrosshairMove(alMover);
    return () => {
      chart.unsubscribeCrosshairMove(alMover);
      chart.remove();
      grafico.current = null;
      serieApi.current = null;
    };
  }, []);

  // Colores: dependen del tema y de la dirección del período.
  useEffect(() => {
    const chart = grafico.current;
    const s = serieApi.current;
    if (!chart || !s) return;
    const color = leerColor(tono === "neutro" ? "--c-accent" : sube ? "--c-gain" : "--c-loss");
    chart.applyOptions({
      layout: { textColor: leerColor("--c-text-3") },
      grid: { horzLines: { color: leerColor("--c-border") } },
      crosshair: { vertLine: { color: leerColor("--c-border-strong") } },
    });
    s.applyOptions({ lineColor: color, topColor: hexConAlfa(color, 0.16), bottomColor: hexConAlfa(color, 0), crosshairMarkerBackgroundColor: color, crosshairMarkerBorderColor: leerColor("--c-surface") });
  }, [tema, coloresAlt, sube, tono]);

  // Datos.
  useEffect(() => {
    const s = serieApi.current;
    if (!s) return;
    s.setData(visible.map(([f, v]) => ({ time: (Date.parse(f) / 1000) as UTCTimestamp, value: v })));
    grafico.current?.timeScale().fitContent();
  }, [visible]);

  const mostrado = scrub?.valor ?? actual?.[1] ?? null;
  const variacionMostrada = scrub && inicial ? cambio(scrub.valor, inicial[1]) : variacion;

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-label">{titulo}</div>
          {formato ? <span className="tabular text-cifra">{mostrado !== null ? formato(mostrado) : "—"}</span> : <Cifra valor={mostrado} moneda={moneda} decimales={decimales} className="text-cifra" />}
          <p className="flex items-center gap-2 text-chico text-text-2">
            <Delta valor={variacionMostrada} tipo={variacionEn === "puntos" ? "puntos" : "porcentaje"} className={tono === "neutro" ? "!text-text-2" : undefined} />
            <span>{scrub ? `al ${fechaCorta(scrub.fecha, true)}` : `en ${RANGOS.find((r) => r.valor === rango)?.etiqueta === "Máx" ? "toda la serie" : nombreRango(rango)}`}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {acciones}
          <SegmentedControl etiqueta="Rango" tamano="sm" valor={rango} onChange={setRango} opciones={RANGOS} />
        </div>
      </div>
      <div ref={contenedor} style={{ height: alto }} className="w-full touch-pan-y" onPointerLeave={() => setScrub(null)} />
    </div>
  );
}

function nombreRango(r: Rango) {
  return { "1S": "la semana", "1M": "el mes", "3M": "3 meses", "1A": "el año", "5A": "5 años", Max: "toda la serie" }[r];
}

function hexConAlfa(color: string, alfa: number) {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return color;
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}
