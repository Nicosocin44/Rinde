"use client";

import { useMemo, useState } from "react";
import { AreaApilada } from "@/components/charts/area-apilada";
import { Cifra } from "@/components/ui/cifra";
import { CompartirResultado } from "@/components/ui/compartir";
import { MoneyInput, NumberField } from "@/components/ui/money-input";
import { Slider } from "@/components/ui/slider";
import { aporteNecesario, capitalParaRetiro, proyeccion, tasaPorPeriodo } from "@/lib/calculos";
import { dolares, porcentaje, pesosCompacto } from "@/lib/format";
import { MarcoCalculadora, Resultado } from "./marco";

/**
 * Jubilación, en dólares y con tasa REAL (descontada la inflación en dólares): así la meta no se "achica" sola.
 * Capital necesario = gasto anual / tasa de retiro (regla del 4 %). Las metas de ahorro tienen su propia pantalla (/calculadoras/metas).
 */
export function Jubilacion() {
  const [gastoMensual, setGastoMensual] = useState(1500);
  const [actual, setActual] = useState(5_000);
  const [anios, setAnios] = useState(25);
  const [tasaReal, setTasaReal] = useState(4);
  const [retiro, setRetiro] = useState(4);

  const r = useMemo(() => {
    const objetivo = capitalParaRetiro(gastoMensual * 12, retiro / 100).toNumber();
    const i = tasaPorPeriodo(tasaReal / 100, 12);
    const n = anios * 12;
    const aporte = aporteNecesario(objetivo, actual, i, n, true).toNumber();
    const serie = proyeccion(actual, aporte, i, n, true)
      .filter((q) => q.periodo % 12 === 0)
      .map((q) => ({ x: q.periodo / 12, base: q.aportado.toNumber(), extra: q.intereses.toNumber() }));
    return { objetivo, aporte, serie, totalAportado: actual + aporte * n };
  }, [gastoMensual, actual, anios, tasaReal, retiro]);

  return (
    <MarcoCalculadora
      ancla="jubilacion"
      entradas={
        <>
          <MoneyInput etiqueta="Querés gastar por mes" moneda="US$" valor={gastoMensual} onChange={setGastoMensual} />
          <MoneyInput etiqueta="Ya tenés ahorrado" moneda="US$" valor={actual} onChange={setActual} />
          <Slider etiqueta="Años hasta jubilarte" valor={anios} onChange={setAnios} min={1} max={45} formato={(v) => `${v} años`} />
          <NumberField etiqueta="Rendimiento real anual" valor={tasaReal} onChange={setTasaReal} sufijo="% sobre inflación" min={-5} max={20} paso={0.5} decimales={1} />
          <NumberField etiqueta="Tasa de retiro anual" valor={retiro} onChange={setRetiro} sufijo="%" min={1} max={10} paso={0.5} decimales={1} />
        </>
      }
      resultado={
        <>
          <Resultado
            etiqueta="Tenés que ahorrar por mes"
            cifra={<Cifra valor={r.aporte} moneda="US$" decimales={0} />}
            detalle={
              <>
                Para llegar a <span className="tabular font-medium text-text">{dolares(r.objetivo, 0)}</span> en {anios} años, con un rendimiento de {porcentaje(tasaReal / 100, 1)} anual por encima de la inflación.
                {r.aporte === 0 && " Con lo que ya tenés, llegás sin aportar más."}
              </>
            }
          />
          <AreaApilada puntos={r.serie} formatoY={(v) => pesosCompacto(v, "US$")} formatoX={(x) => (x === 0 ? "Hoy" : `${x}a`)} />
          <div className="max-w-2xl rounded-(--radius-card) bg-surface-2 px-5 py-4 text-chico text-text-2">
            <p className="mb-1 font-medium text-text">¿Qué es la regla del {porcentaje(retiro / 100, 0)}?</p>
            Si cada año retirás el {porcentaje(retiro / 100, 1)} de tu capital (ajustado por inflación), históricamente el capital alcanzó para unos 30 años en carteras diversificadas de EE.UU. Es una
            referencia, no una garantía: con menos rendimiento o más años de retiro, conviene una tasa más baja (3 % a 3,5 %).
          </div>
        </>
      }
      pie={<CompartirResultado titulo={`Para jubilarme gastando ${dolares(gastoMensual, 0)} por mes`} cifra={`${dolares(r.aporte, 0)} por mes`} detalle={`Durante ${anios} años, con ${porcentaje(tasaReal / 100, 1)} de rendimiento real.`} nombreArchivo="jubilacion" />}
    />
  );
}
