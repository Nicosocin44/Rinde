"use client";

import { useMemo, useState } from "react";
import { Cifra } from "@/components/ui/cifra";
import { CompartirResultado } from "@/components/ui/compartir";
import { MetricExplainer } from "@/components/ui/metric-explainer";
import { MoneyInput, NumberField } from "@/components/ui/money-input";
import { SegmentedControl } from "@/components/ui/segmented";
import { interesPlazoFijo, tasaReal, teaDesdeTna } from "@/lib/calculos";
import { delta, numero, pesos, porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";
import { MarcoCalculadora, Resultado } from "./marco";

export function CalculadoraPlazoFijo({ tnaSugerida, bancoSugerido, inflacionMensual }: { tnaSugerida: number; bancoSugerido: string; inflacionMensual: number }) {
  const [monto, setMonto] = useState(1_000_000);
  const [tna, setTna] = useState(Math.round(tnaSugerida * 10000) / 100);
  const [dias, setDias] = useState("30");

  const r = useMemo(() => {
    const d = Number(dias);
    const interes = interesPlazoFijo(monto, tna / 100, d).toNumber();
    const tea = teaDesdeTna(tna / 100, d).toNumber();
    const inflacionPeriodo = Math.pow(1 + inflacionMensual, d / 30) - 1;
    const real = tasaReal(interes / monto, inflacionPeriodo).toNumber();
    return { d, interes, tea, inflacionPeriodo, real };
  }, [monto, tna, dias, inflacionMensual]);

  return (
    <MarcoCalculadora
      ancla="plazo-fijo"
      entradas={
        <>
          <MoneyInput etiqueta="Monto" valor={monto} onChange={setMonto} tamano="lg" />
          <NumberField etiqueta="TNA" valor={tna} onChange={setTna} sufijo="%" min={0} max={300} paso={0.25} decimales={2} />
          <div className="flex flex-col gap-1.5">
            <span className="text-label">Plazo</span>
            <SegmentedControl
              etiqueta="Plazo en días"
              ancho="lleno"
              valor={dias}
              onChange={setDias}
              opciones={["30", "60", "90", "180", "365"].map((d) => ({ valor: d, etiqueta: `${d} d` }))}
            />
          </div>
          <p className="text-micro">
            Sugerimos la mejor TNA a 30 días de hoy ({bancoSugerido}). La inflación esperada sale del REM del BCRA ({porcentaje(inflacionMensual, 1)} por mes).
          </p>
        </>
      }
      resultado={
        <>
          <Resultado
            etiqueta={`Al vencimiento, en ${r.d} días, cobrás`}
            cifra={<Cifra valor={monto + r.interes} decimales={0} />}
            detalle={
              <>
                <span className="tabular font-medium text-text">{pesos(r.interes)}</span> de intereses. Si lo renovás todo el año al mismo plazo y tasa, rinde {porcentaje(r.tea, 2)} TEA.
              </>
            }
          />
          <div className="grid gap-px overflow-hidden rounded-(--radius-card) border border-border bg-border sm:grid-cols-3">
            {[
              { k: "Intereses", v: pesos(r.interes) },
              { k: `Inflación esperada en ${r.d} días`, v: porcentaje(r.inflacionPeriodo, 1) },
              { k: "Le ganás a la inflación", v: delta(r.real, 2), tono: r.real >= 0 ? "text-gain" : "text-loss" },
            ].map((x) => (
              <div key={x.k} className="bg-surface px-5 py-4">
                <p className="text-chico text-text-2">{x.k}</p>
                <p className={cn("tabular mt-1 text-[22px] font-medium tracking-[-0.02em]", x.tono)}>{x.v}</p>
              </div>
            ))}
          </div>
          <MetricExplainer
            titulo="¿Cómo se calculan los intereses?"
            formula="Intereses = monto × TNA × días ÷ 365"
            pasos={[
              { etiqueta: "Monto", valor: pesos(monto) },
              { etiqueta: "TNA", valor: porcentaje(tna / 100, 2) },
              { etiqueta: "Días", valor: numero(r.d, 0) },
            ]}
            resultado={pesos(r.interes, 2)}
            fuente="Fórmula de interés simple del plazo fijo tradicional"
            ancla="/metodologia#plazo-fijo"
            className="self-start"
          />
        </>
      }
      pie={<CompartirResultado titulo={`Plazo fijo de ${pesos(monto)} a ${r.d} días`} cifra={`+ ${pesos(r.interes)}`} detalle={`Al ${porcentaje(tna / 100, 2)} TNA (${porcentaje(r.tea, 1)} TEA).`} nombreArchivo="plazo-fijo" />}
    />
  );
}
