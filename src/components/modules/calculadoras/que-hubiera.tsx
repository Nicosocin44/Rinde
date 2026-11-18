"use client";

import { useMemo, useState } from "react";
import { CompartirResultado } from "@/components/ui/compartir";
import { Delta } from "@/components/ui/delta";
import { MoneyInput } from "@/components/ui/money-input";
import { SegmentedControl } from "@/components/ui/segmented";
import { construirIndice, hoyAR, nivelEnFecha, ordenarEscenarios, plazoFijoRenovado, porPrecio, sinPerder, sumarMeses, type Punto } from "@/lib/calculos";
import type { DatosQH, SerieQH } from "@/lib/data/servicios/que-hubiera";
import { fechaCorta, pesos, pesosCompacto, porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";
import { MarcoCalculadora, Resultado } from "./marco";

const PERIODOS = [
  { valor: "1", etiqueta: "1 mes", meses: 1 },
  { valor: "6", etiqueta: "6 meses", meses: 6 },
  { valor: "12", etiqueta: "1 año", meses: 12 },
  { valor: "24", etiqueta: "2 años", meses: 24 },
  { valor: "60", etiqueta: "5 años", meses: 60 },
] as const;
type Periodo = (typeof PERIODOS)[number]["valor"];

const aPuntos = (s: SerieQH): Punto[] => s.map(([fecha, valor]) => ({ fecha, valor }));

/**
 * "¿Qué hubiera pasado si…?": ponés un monto y una fecha del pasado y ves cuánto tendrías hoy en cada alternativa
 * (quieto, dólar MEP y blue, plazo fijo renovado, una acción o CEDEAR, bitcoin), en pesos y contra la inflación.
 */
export function QueHubiera({ datos, activos }: { datos: DatosQH; activos: { ticker: string; nombre: string }[] }) {
  const [monto, setMonto] = useState(1_000_000);
  const [periodo, setPeriodo] = useState<Periodo>("12");
  const disponibles = activos.filter((a) => (datos.activos[a.ticker]?.length ?? 0) > 1);
  const [activo, setActivo] = useState(disponibles[0]?.ticker ?? "");
  const hoy = useMemo(() => hoyAR(), []);

  const series = useMemo(
    () => ({
      mep: aPuntos(datos.mep),
      blue: aPuntos(datos.blue),
      pf: aPuntos(datos.plazoFijo),
      btc: aPuntos(datos.bitcoin),
      activos: Object.fromEntries(Object.entries(datos.activos).map(([t, s]) => [t, aPuntos(s)])),
      indice: datos.ipc.length ? construirIndice(datos.ipc.map(([fecha, v]) => ({ fecha, valor: v * 100 }))) : null,
    }),
    [datos],
  );

  const r = useMemo(() => {
    const meses = PERIODOS.find((p) => p.valor === periodo)!.meses;
    const desde = sumarMeses(hoy, -meses);
    const proyeccion = datos.remMensual !== null ? datos.remMensual * 100 : undefined;
    const nDesde = series.indice ? nivelEnFecha(series.indice, desde, proyeccion) : null;
    const nHasta = series.indice ? nivelEnFecha(series.indice, hoy, proyeccion) : null;
    const necesario = nDesde && nHasta ? sinPerder(monto, nDesde.toNumber(), nHasta.toNumber()) : null;
    const nombreActivo = activos.find((a) => a.ticker === activo)?.nombre ?? activo;
    const escenarios = ordenarEscenarios(
      monto,
      [
        { id: "quieto", nombre: "Quieto en pesos", detalle: "En la cuenta o el colchón", valor: monto },
        { id: "mep", nombre: "Dólar MEP", detalle: "Comprás dólares y los vendés hoy", valor: porPrecio(monto, series.mep, desde, hoy) },
        { id: "blue", nombre: "Dólar blue", detalle: "Comprás dólares y los vendés hoy", valor: porPrecio(monto, series.blue, desde, hoy) },
        { id: "pf", nombre: "Plazo fijo", detalle: "Renovado cada 30 días a la tasa promedio", valor: plazoFijoRenovado(monto, series.pf, desde, hoy) },
        { id: "activo", nombre: nombreActivo, detalle: `Comprás ${activo} en BYMA y lo vendés hoy`, valor: activo ? porPrecio(monto, series.activos[activo] ?? [], desde, hoy) : null },
        { id: "btc", nombre: "Bitcoin", detalle: "Comprado con pesos al dólar cripto", valor: porPrecio(monto, series.btc, desde, hoy) },
      ],
      necesario,
    );
    return { desde, necesario, escenarios, sinBitcoin: !escenarios.some((e) => e.id === "btc"), sinActivo: activo && !escenarios.some((e) => e.id === "activo") ? nombreActivo : null };
  }, [monto, periodo, activo, hoy, series, datos.remMensual, activos]);

  const mejor = r.escenarios[0];
  const quieto = r.escenarios.find((e) => e.id === "quieto");
  const maximo = Math.max(...r.escenarios.map((e) => e.valor), r.necesario ?? 0);
  const etiquetaPeriodo = PERIODOS.find((p) => p.valor === periodo)!.etiqueta;

  return (
    <MarcoCalculadora
      ancla="que-hubiera"
      entradas={
        <>
          <MoneyInput etiqueta="Si ponías" valor={monto} onChange={setMonto} tamano="lg" />
          <SegmentedControl etiqueta="Hace cuánto" ancho="lleno" tamano="sm" valor={periodo} onChange={setPeriodo} opciones={PERIODOS.map((p) => ({ valor: p.valor, etiqueta: p.etiqueta }))} />
          {disponibles.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-label">Y si comprabas</p>
              <div className="flex flex-wrap gap-2">
                {disponibles.map((a) => (
                  <button
                    key={a.ticker}
                    type="button"
                    aria-pressed={activo === a.ticker}
                    onClick={() => setActivo(a.ticker)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-chico font-medium transition-colors",
                      activo === a.ticker ? "border-inverse bg-inverse text-on-inverse" : "border-border-strong text-text-2 hover:text-text",
                    )}
                  >
                    {a.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      }
      resultado={
        <>
          {mejor && quieto && (
            <Resultado
              etiqueta={`La que más dejó desde el ${fechaCorta(r.desde, true)}`}
              cifra={<span className="tabular">{pesos(mejor.valor, 0)}</span>}
              detalle={
                <>
                  Con <span className="font-medium text-text">{mejor.nombre}</span> hoy tendrías {pesos(mejor.valor, 0)}
                  {mejor.id !== "quieto" && <>: {pesos(mejor.valor - monto, 0)} más que si lo dejabas quieto</>}.
                  {r.necesario && <> Para no perder contra la inflación necesitabas {pesos(r.necesario, 0)}.</>}
                </>
              }
            />
          )}
          <ol className="flex flex-col">
            {r.escenarios.map((e) => (
              <li key={e.id} className="flex flex-col gap-1.5 border-t border-border py-3.5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block font-medium">{e.nombre}</span>
                    <span className="block text-micro text-text-3">{e.detalle}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tabular block text-[17px] font-semibold">{pesos(e.valor, 0)}</span>
                    <span className="flex items-center justify-end gap-2 text-micro">
                      <Delta valor={e.ganancia} className="text-micro" />
                      {e.real !== null && (
                        <span className={cn("tabular", e.real >= 0 ? "text-gain" : "text-loss")}>
                          {e.real >= 0 ? "le ganó" : "perdió"} {porcentaje(Math.abs(e.real), 1)} a la inflación
                        </span>
                      )}
                    </span>
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-surface-2" aria-hidden>
                  <div className={cn("h-full rounded-full", e.id === mejor?.id ? "bg-accent" : "bg-text-3/50")} style={{ width: `${(e.valor / maximo) * 100}%` }} />
                  {r.necesario && <span className="absolute -top-1 -bottom-1 w-0.5 bg-text" style={{ left: `calc(${(r.necesario / maximo) * 100}% - 1px)` }} />}
                </div>
              </li>
            ))}
          </ol>
          <p className="text-micro text-text-3">
            La rayita marca lo que necesitabas para no perder contra la inflación (IPC del INDEC; el mes en curso, con la del REM).
            {r.sinActivo && ` ${r.sinActivo} no aparece: su historia de precios comparable no llega a esa fecha (la serie tiene un salto en agosto de 2023 que no pudimos explicar).`}
            {r.sinBitcoin && " Bitcoin no aparece: tenemos su precio en pesos desde febrero de 2023."} Sin comisiones ni impuestos.
          </p>
        </>
      }
      pie={
        mejor ? (
          <CompartirResultado
            titulo={`Si hace ${etiquetaPeriodo} ponía ${pesosCompacto(monto)}`}
            cifra={pesos(mejor.valor, 0)}
            detalle={`Hoy tendría eso con ${mejor.nombre}${quieto && mejor.id !== "quieto" ? `; quieto en pesos, ${pesos(monto, 0)}` : ""}.`}
            nombreArchivo="que-hubiera-pasado"
          />
        ) : undefined
      }
    />
  );
}
