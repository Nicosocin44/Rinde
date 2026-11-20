"use client";

import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cifra } from "@/components/ui/cifra";
import { Delta } from "@/components/ui/delta";
import { Destello } from "@/components/ui/destello";
import { SegmentedControl } from "@/components/ui/segmented";
import { fechaCorta, hora, numero } from "@/lib/format";
import type { VelaCompacta } from "@/lib/calculos";
import { usePreferencias } from "@/lib/preferencias";
import { cn } from "@/lib/cn";

export type Rango = "1D" | "1S" | "1M" | "3M" | "1A" | "5A" | "Max";
const DIAS_RANGO: Record<Exclude<Rango, "1D">, number> = { "1S": 7, "1M": 31, "3M": 92, "1A": 366, "5A": 1827, Max: Infinity };
const RANGOS: { valor: Rango; etiqueta: string }[] = [
  { valor: "1D", etiqueta: "1D" },
  { valor: "1S", etiqueta: "1S" },
  { valor: "1M", etiqueta: "1M" },
  { valor: "3M", etiqueta: "3M" },
  { valor: "1A", etiqueta: "1A" },
  { valor: "5A", etiqueta: "5A" },
  { valor: "Max", etiqueta: "Máx" },
];

/** Serie compacta: [fecha ISO, valor]. */
export type SerieCompacta = [string, number][];
export type { VelaCompacta };

export type TipoGrafico = "area" | "linea" | "velas";
const CLAVE_TIPO = "rinde.tipo-grafico";

function leerColor(nombre: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

/** La librería dibuja la hora en UTC: corremos el recorrido del día a hora argentina (UTC−3) para el eje. */
const DESFASE_AR = -3 * 3600;
const aTiempo = (iso: string, conHora: boolean) => (Math.floor(Date.parse(iso) / 1000) + (conHora ? DESFASE_AR : 0)) as UTCTimestamp;

/** En los rangos largos, una vela por semana (con más de mil velas diarias no se lee nada). */
function porSemana(velas: VelaCompacta[]): VelaCompacta[] {
  const grupos = new Map<string, VelaCompacta>();
  for (const v of velas) {
    const d = new Date(`${v[0].slice(0, 10)}T00:00:00Z`);
    const lunes = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86_400_000).toISOString().slice(0, 10);
    const g = grupos.get(lunes);
    if (!g) grupos.set(lunes, [lunes, v[1], v[2], v[3], v[4]]);
    else grupos.set(lunes, [lunes, g[1], Math.max(g[2], v[2]), Math.min(g[3], v[3]), v[4]]);
  }
  return [...grupos.values()];
}

/**
 * Gráfico de precio con encabezado vivo (TradingView Lightweight Charts, con los colores de nuestro sistema).
 * - Interacción firma 3: al pasar el cursor o el dedo, la cifra del encabezado cambia al valor de ese momento.
 * - Área, línea o velas (si hay apertura, máximo y mínimo); la elección se recuerda en el navegador.
 * - Rango "1D" con el recorrido del día, cuando la fuente lo tiene.
 * - Con `variacionDia`, la variación de hoy queda siempre visible al lado de la del período.
 */
export function PriceChart({
  serie,
  velas,
  intradia,
  variacionDia,
  etiquetaDia = "hoy",
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
  compacto = false,
}: {
  /** Sin cifra ni variación en el encabezado (cuando la serie no es un precio, como el valor de una cartera con aportes). */
  compacto?: boolean;
  /** "puntos": la variación es una diferencia en pp (para series que ya son porcentajes, como la brecha). */
  variacionEn?: "porcentaje" | "puntos";
  /** "direccion": verde o rojo según el período. "neutro": color de marca (cuando subir no es bueno ni malo). */
  tono?: "direccion" | "neutro";
  serie: SerieCompacta;
  /** Velas diarias (habilitan el gráfico de velas). */
  velas?: VelaCompacta[];
  /** Recorrido del día (habilita el rango "1D"). */
  intradia?: VelaCompacta[];
  /** Variación de hoy (fracción), siempre visible en el encabezado. */
  variacionDia?: number | null;
  /** Cómo se nombra el período de `variacionDia` ("hoy", "en 24 h"). */
  etiquetaDia?: string;
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
  const serieApi = useRef<ISeriesApi<SeriesType> | null>(null);
  const hayIntradia = (intradia?.length ?? 0) > 1;
  const [rango, setRango] = useState<Rango>(rangoInicial === "1D" && !hayIntradia ? "1M" : rangoInicial);
  // Arranca en "área" (igual en el servidor y en el navegador) y después toma la elección guardada.
  const [tipoElegido, setTipoElegido] = useState<TipoGrafico>("area");
  useEffect(() => {
    try {
      const t = window.localStorage.getItem(CLAVE_TIPO);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferencia guardada: solo existe en el navegador
      if (t === "linea" || t === "velas") setTipoElegido(t);
    } catch {
      // Sin almacenamiento (modo privado): queda en área.
    }
  }, []);
  const [scrub, setScrub] = useState<{ valor: number; fecha: string } | null>(null);
  const { tema, coloresAlt } = usePreferencias();
  const formatoRef = useRef(formato);
  useEffect(() => {
    formatoRef.current = formato;
  }, [formato]);

  const esDia = rango === "1D" && hayIntradia;
  const hayVelas = esDia ? true : (velas?.length ?? 0) > 1;
  const tipo: TipoGrafico = tipoElegido === "velas" && !hayVelas ? "area" : tipoElegido;

  const elegirTipo = (t: TipoGrafico) => {
    setTipoElegido(t);
    try {
      window.localStorage.setItem(CLAVE_TIPO, t);
    } catch {
      // Sin almacenamiento (modo privado): la elección dura lo que dura la página.
    }
  };

  // Puntos del período elegido: [fecha, cierre] y, si hay, sus velas.
  const { puntos, velasVisibles } = useMemo(() => {
    if (esDia && intradia) return { puntos: intradia.map((v): [string, number] => [v[0], v[4]]), velasVisibles: intradia };
    const ultima = serie.at(-1)?.[0];
    if (!ultima || rango === "Max" || rango === "1D") return { puntos: serie, velasVisibles: velas ?? [] };
    const desde = new Date(Date.parse(ultima) - DIAS_RANGO[rango] * 86_400_000).toISOString().slice(0, 10);
    return { puntos: serie.filter(([f]) => f >= desde), velasVisibles: (velas ?? []).filter((v) => v[0] >= desde) };
  }, [serie, velas, intradia, rango, esDia]);

  const actual = puntos.at(-1);
  const inicial = esDia && intradia ? ([intradia[0]![0], intradia[0]![1]] as [string, number]) : puntos[0];
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
    grafico.current = chart;
    return () => {
      chart.remove();
      grafico.current = null;
      serieApi.current = null;
    };
  }, []);

  // La serie según el tipo (área, línea o velas). Se recrea al cambiar de tipo.
  useEffect(() => {
    const chart = grafico.current;
    if (!chart) return;
    const s: ISeriesApi<SeriesType> =
      tipo === "velas"
        ? chart.addSeries(CandlestickSeries, { priceLineVisible: false, lastValueVisible: false })
        : tipo === "linea"
          ? chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerRadius: 4, crosshairMarkerBorderWidth: 2 })
          : chart.addSeries(AreaSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerRadius: 4, crosshairMarkerBorderWidth: 2 });
    serieApi.current = s;
    const alMover = (p: MouseEventParams<Time>) => {
      const dato = p.seriesData.get(s) as { value?: number; close?: number } | undefined;
      const valor = dato?.value ?? dato?.close;
      if (!p.time || !valor) {
        setScrub(null);
        return;
      }
      const segundos = (p.time as number) - (esDia ? DESFASE_AR : 0);
      setScrub({ valor, fecha: new Date(segundos * 1000).toISOString() });
    };
    chart.subscribeCrosshairMove(alMover);
    return () => {
      if (serieApi.current === s) serieApi.current = null;
      // Si el gráfico ya se destruyó (al salir de la página), la serie se fue con él.
      if (grafico.current !== chart) return;
      chart.unsubscribeCrosshairMove(alMover);
      chart.removeSeries(s);
    };
  }, [tipo, esDia]);

  // Colores: dependen del tema, del tipo y de la dirección del período.
  useEffect(() => {
    const chart = grafico.current;
    const s = serieApi.current;
    if (!chart || !s) return;
    const color = leerColor(tono === "neutro" ? "--c-accent" : sube ? "--c-gain" : "--c-loss");
    chart.applyOptions({
      layout: { textColor: leerColor("--c-text-3") },
      grid: { horzLines: { color: leerColor("--c-border") } },
      crosshair: { vertLine: { color: leerColor("--c-border-strong") } },
      timeScale: { timeVisible: esDia, secondsVisible: false },
    });
    if (tipo === "velas") {
      const sube_ = leerColor("--c-gain");
      const baja = leerColor("--c-loss");
      s.applyOptions({ upColor: sube_, downColor: baja, borderUpColor: sube_, borderDownColor: baja, wickUpColor: sube_, wickDownColor: baja });
    } else if (tipo === "linea") {
      s.applyOptions({ color, crosshairMarkerBackgroundColor: color, crosshairMarkerBorderColor: leerColor("--c-surface") });
    } else {
      s.applyOptions({ lineColor: color, topColor: hexConAlfa(color, 0.16), bottomColor: hexConAlfa(color, 0), crosshairMarkerBackgroundColor: color, crosshairMarkerBorderColor: leerColor("--c-surface") });
    }
  }, [tema, coloresAlt, sube, tono, tipo, esDia]);

  // Datos.
  useEffect(() => {
    const s = serieApi.current;
    if (!s) return;
    if (tipo === "velas") {
      const lista = !esDia && (rango === "5A" || rango === "Max") ? porSemana(velasVisibles) : velasVisibles;
      s.setData(lista.map((v) => ({ time: aTiempo(v[0], esDia), open: v[1], high: v[2], low: v[3], close: v[4] })));
    } else {
      s.setData(puntos.map(([f, v]) => ({ time: aTiempo(f, esDia), value: v })));
    }
    grafico.current?.timeScale().fitContent();
  }, [puntos, velasVisibles, tipo, esDia, rango]);

  const mostrado = scrub?.valor ?? actual?.[1] ?? null;
  const variacionMostrada = scrub && inicial ? cambio(scrub.valor, inicial[1]) : variacion;
  const rangos = hayIntradia ? RANGOS : RANGOS.filter((r) => r.valor !== "1D");
  const tipos: { valor: TipoGrafico; etiqueta: string }[] = [
    { valor: "area", etiqueta: "Área" },
    { valor: "linea", etiqueta: "Línea" },
    ...(hayVelas ? [{ valor: "velas" as const, etiqueta: "Velas" }] : []),
  ];
  const fechaScrub = (iso: string) => (esDia ? `a las ${hora(iso)}` : `al ${fechaCorta(iso.slice(0, 10), true)}`);
  const mostrarDia = variacionDia !== undefined && variacionDia !== null && !esDia;

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {compacto ? (
          <div className="flex flex-col gap-1">
            <div className="text-label">{titulo}</div>
            <p className="tabular h-5 text-chico text-text-2">
              {scrub ? (
                <>
                  {esDia ? hora(scrub.fecha) : fechaCorta(scrub.fecha.slice(0, 10), true)}: <span className="font-medium text-text">{formato ? formato(scrub.valor) : `${moneda ?? ""} ${numero(scrub.valor, decimales)}`}</span>
                </>
              ) : (
                "Pasá el cursor para ver cada fecha"
              )}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="text-label">{titulo}</div>
            {/* El destello sigue al último precio (el que se actualiza solo), no al que se ve al pasar el cursor. */}
            <Destello valor={actual?.[1] ?? null} className="self-start">
              {formato ? <span className="tabular text-cifra">{mostrado !== null ? formato(mostrado) : "—"}</span> : <Cifra valor={mostrado} moneda={moneda} decimales={decimales} className="text-cifra" />}
            </Destello>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-chico text-text-2">
              {mostrarDia && !scrub && (
                <span className="inline-flex items-center gap-1.5">
                  <Delta valor={variacionDia} tipo={variacionEn === "puntos" ? "puntos" : "porcentaje"} className={cn("font-semibold", tono === "neutro" && "!text-text-2")} />
                  <span>{etiquetaDia}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Delta valor={variacionMostrada} tipo={variacionEn === "puntos" ? "puntos" : "porcentaje"} className={tono === "neutro" ? "!text-text-2" : undefined} />
                <span>{scrub ? fechaScrub(scrub.fecha) : esDia ? etiquetaDia : `en ${nombreRango(rango)}`}</span>
              </span>
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {acciones}
          {!compacto && <SegmentedControl etiqueta="Tipo de gráfico" tamano="sm" valor={tipo} onChange={elegirTipo} opciones={tipos} />}
          <SegmentedControl etiqueta="Rango" tamano="sm" valor={rango} onChange={setRango} opciones={rangos} />
        </div>
      </div>
      <div ref={contenedor} style={{ height: alto }} className="w-full touch-pan-y" onPointerLeave={() => setScrub(null)} />
    </div>
  );
}

function nombreRango(r: Rango) {
  return { "1D": "el día", "1S": "la semana", "1M": "el mes", "3M": "3 meses", "1A": "el año", "5A": "5 años", Max: "toda la serie" }[r];
}

function hexConAlfa(color: string, alfa: number) {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return color;
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}
