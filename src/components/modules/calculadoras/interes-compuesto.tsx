"use client";

import { useMemo, useState } from "react";
import { AreaApilada, type PuntoApilado } from "@/components/charts/area-apilada";
import { Cifra } from "@/components/ui/cifra";
import { CompartirResultado } from "@/components/ui/compartir";
import { MoneyInput, NumberField } from "@/components/ui/money-input";
import { SegmentedControl } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { proyeccion, tasaPorPeriodo, valorReal } from "@/lib/calculos";
import { pesos, pesosCompacto, porcentaje } from "@/lib/format";
import { MarcoCalculadora, Resultado } from "./marco";

export function InteresCompuesto({ teaSugerida, inflacionSugerida }: { teaSugerida: number; inflacionSugerida: number }) {
  const [capital, setCapital] = useState(1_000_000);
  const [aporte, setAporte] = useState(100_000);
  const [tea, setTea] = useState(Math.round(teaSugerida * 1000) / 10);
  const [anios, setAnios] = useState(10);
  const [momento, setMomento] = useState<"inicio" | "fin">("fin");
  const [inflacion, setInflacion] = useState(Math.round(inflacionSugerida * 1000) / 10);
  const [scrub, setScrub] = useState<PuntoApilado | null>(null);

  const { serie, final, aportado, intereses, real } = useMemo(() => {
    const i = tasaPorPeriodo(tea / 100, 12);
    const p = proyeccion(capital, aporte, i, anios * 12, momento === "inicio");
    const ultimo = p[p.length - 1]!;
    return {
      serie: p.filter((q) => q.periodo % 12 === 0).map((q) => ({ x: q.periodo / 12, base: q.aportado.toNumber(), extra: q.intereses.toNumber() })),
      final: ultimo.total.toNumber(),
      aportado: ultimo.aportado.toNumber(),
      intereses: ultimo.intereses.toNumber(),
      real: valorReal(ultimo.total, inflacion / 100, anios).toNumber(),
    };
  }, [capital, aporte, tea, anios, momento, inflacion]);

  const mostrado = scrub ?? { x: anios, base: aportado, extra: intereses };

  return (
    <MarcoCalculadora
      ancla="interes-compuesto"
      entradas={
        <>
          <MoneyInput etiqueta="Capital inicial" valor={capital} onChange={setCapital} />
          <MoneyInput etiqueta="Aporte por mes" valor={aporte} onChange={setAporte} />
          <NumberField etiqueta="Tasa anual (TEA)" valor={tea} onChange={setTea} sufijo="%" min={-50} max={500} paso={0.5} decimales={1} />
          <Slider etiqueta="Plazo" valor={anios} onChange={setAnios} min={1} max={40} formato={(v) => `${v} ${v === 1 ? "año" : "años"}`} />
          <div className="flex flex-col gap-1.5">
            <span className="text-label">Aportás al</span>
            <SegmentedControl
              etiqueta="Momento del aporte"
              ancho="lleno"
              valor={momento}
              onChange={setMomento}
              opciones={[
                { valor: "inicio", etiqueta: "Inicio del mes" },
                { valor: "fin", etiqueta: "Fin del mes" },
              ]}
            />
          </div>
          <NumberField etiqueta="Inflación anual supuesta" valor={inflacion} onChange={setInflacion} sufijo="%" min={0} max={500} paso={1} decimales={1} />
          <p className="text-micro">La tasa sugerida es la mejor TEA sin plazo de hoy y la inflación, la que espera el mercado (REM) para los próximos 12 meses. Cambialas para ver otros escenarios.</p>
        </>
      }
      resultado={
        <>
          <Resultado
            etiqueta={`En ${anios} ${anios === 1 ? "año" : "años"} vas a tener`}
            cifra={<Cifra valor={final} decimales={0} />}
            detalle={
              <>
                Pusiste <span className="tabular font-medium text-text">{pesos(aportado)}</span> y ganaste <span className="tabular font-medium text-text">{pesos(intereses)}</span> de intereses. En pesos de hoy
                (con {porcentaje(inflacion / 100, 0)} de inflación anual) son <span className="tabular font-medium text-text">{pesos(real)}</span>.
              </>
            }
          />
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-chico text-text-2">
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] bg-text-3/40" /> Lo que ponés
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] bg-accent/70" /> Lo que ganás
            </span>
            <span className="tabular ml-auto">
              Año {mostrado.x}: {pesosCompacto(mostrado.base + mostrado.extra)}
            </span>
          </div>
          <AreaApilada puntos={serie} onScrub={setScrub} formatoY={(v) => pesosCompacto(v)} formatoX={(x) => (x === 0 ? "Hoy" : `${x}a`)} />
        </>
      }
      pie={<CompartirResultado titulo={`Con ${pesos(aporte)} por mes durante ${anios} años`} cifra={pesos(final)} detalle={`Al ${porcentaje(tea / 100, 1)} anual. Ganás ${pesos(intereses)} de intereses.`} nombreArchivo="interes-compuesto" />}
    />
  );
}
