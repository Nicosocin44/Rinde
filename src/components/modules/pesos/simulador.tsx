"use client";

import { useMemo, useState } from "react";
import { MoneyInput } from "@/components/ui/money-input";
import { ProviderMark } from "@/components/ui/provider-mark";
import { SegmentedControl } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { gananciaConTope } from "@/lib/calculos";
import type { OpcionPesos } from "@/lib/data/types";
import { delta, pesos, porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";
import { TIPO_OPCION } from "./etiquetas";

type Escenario = "baja" | "rem" | "alta";

/**
 * Simulador: "pongo $X a N días" → todas las alternativas lado a lado, con escenarios de inflación
 * (baja, REM, alta) y el resultado nominal y real.
 */
export function Simulador({ opciones, inflacionRem }: { opciones: OpcionPesos[]; inflacionRem: number | null }) {
  const [monto, setMonto] = useState(1_000_000);
  const [dias, setDias] = useState(90);
  const [escenario, setEscenario] = useState<Escenario>("rem");
  const base = inflacionRem ?? 0.02;
  const mensual = { baja: Math.max(0, base - 0.005), rem: base, alta: base + 0.01 }[escenario];
  const inflacionPeriodo = Math.pow(1 + mensual, dias / 30) - 1;

  const filas = useMemo(() => {
    const candidatas = opciones.filter((o) => !o.condicionEspecial);
    const mejorDe = (filtro: (o: OpcionPesos) => boolean) => candidatas.filter(filtro).sort((a, b) => b.tea - a.tea)[0] ?? null;
    const grupos: { titulo: string; o: OpcionPesos | null; nota?: string }[] = [
      { titulo: "Billetera o cuenta", o: mejorDe((o) => (o.tipo === "billetera" || o.tipo === "cuenta") && o.liquidez === "inmediata") },
      { titulo: "Fondo de dinero", o: mejorDe((o) => o.tipo === "fci") },
      {
        titulo: "Plazo fijo",
        o: mejorDe((o) => o.tipo === "plazo_fijo" && o.plazoDias !== null && o.plazoDias <= dias),
        nota: "renovándolo al mismo plazo",
      },
      { titulo: "Caución", o: mejorDe((o) => o.tipo === "caucion" && o.plazoDias !== null && o.plazoDias <= dias) },
      {
        titulo: "LECAP",
        o:
          candidatas
            .filter((o) => o.tipo === "lecap" && o.plazoDias !== null)
            .sort((a, b) => Math.abs((a.plazoDias ?? 0) - dias) - Math.abs((b.plazoDias ?? 0) - dias))[0] ?? null,
        nota: "la de vencimiento más parecido",
      },
    ];
    return grupos
      .filter((g) => g.o)
      .map((g) => {
        const ganancia = gananciaConTope(monto, g.o!.tea, dias, g.o!.tope).toNumber();
        const final = monto + ganancia;
        const real = final / (1 + inflacionPeriodo) - monto;
        return { ...g, o: g.o!, ganancia, real, rendimiento: ganancia / monto, rendimientoReal: (1 + ganancia / monto) / (1 + inflacionPeriodo) - 1 };
      })
      .sort((a, b) => b.ganancia - a.ganancia);
  }, [opciones, monto, dias, inflacionPeriodo]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-16" data-testid="simulador">
      <div className="flex flex-col gap-6">
        <MoneyInput etiqueta="Ponés" valor={monto} onChange={setMonto} tamano="lg" />
        <Slider etiqueta="Durante" valor={dias} onChange={setDias} min={7} max={365} formato={(v) => `${v} días`} />
        <div className="flex flex-col gap-2">
          <span className="text-label">Inflación supuesta</span>
          <SegmentedControl
            etiqueta="Escenario de inflación"
            ancho="lleno"
            valor={escenario}
            onChange={setEscenario}
            opciones={[
              { valor: "baja", etiqueta: "Baja" },
              { valor: "rem", etiqueta: "REM" },
              { valor: "alta", etiqueta: "Alta" },
            ]}
          />
          <p className="text-chico text-text-2">
            {porcentaje(mensual, 1)} por mes · {porcentaje(inflacionPeriodo, 1)} en {dias} días.{" "}
            {escenario === "rem" ? "Es la mediana del Relevamiento de Expectativas del BCRA." : escenario === "baja" ? "Medio punto menos por mes que el REM." : "Un punto más por mes que el REM."}
          </p>
        </div>
      </div>
      <div>
        <div className="hidden grid-cols-[minmax(0,1fr)_120px_120px_100px] gap-4 border-b border-border pb-2 text-label md:grid">
          <span>Alternativa</span>
          <span className="text-right">Ganás</span>
          <span className="text-right">En pesos de hoy</span>
          <span className="text-right">Real</span>
        </div>
        <ul>
          {filas.map((f, i) => (
            <li key={f.titulo} className={cn("grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b border-border py-4 md:grid-cols-[minmax(0,1fr)_120px_120px_100px] md:items-center", i === 0 && "bg-accent-soft -mx-3 px-3")}>
              <div className="flex min-w-0 items-center gap-3">
                <ProviderMark proveedorId={f.o.proveedorId} />
                <div className="min-w-0">
                  <p className="text-chico text-text-3">{f.titulo}</p>
                  <p className="truncate text-[15px] font-medium">{f.o.nombre}</p>
                  <p className="truncate text-micro">
                    {porcentaje(f.o.tea, 1)} TEA{f.nota ? ` · ${f.nota}` : ""}
                    {f.o.tope && monto > f.o.tope ? ` · rinde hasta ${pesos(f.o.tope)}` : ""}
                  </p>
                </div>
              </div>
              <p className="tabular text-right text-[17px] font-medium">+ {pesos(f.ganancia)}</p>
              <p className="tabular col-start-2 text-right text-chico text-text-2 md:col-start-auto md:text-[15px]">
                <span className="md:hidden">Real: </span>
                {f.real >= 0 ? "+ " : "− "}
                {pesos(Math.abs(f.real), 0)}
              </p>
              <p
                className={cn(
                  "tabular hidden text-right text-[15px] font-medium md:block",
                  Math.abs(f.rendimientoReal) < 0.0005 ? "text-text-2" : f.rendimientoReal > 0 ? "text-gain" : "text-loss",
                )}
              >
                {delta(f.rendimientoReal, 1)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-micro">
          “En pesos de hoy” descuenta la inflación supuesta: si es negativo, la plata pierde poder de compra aunque crezca en pesos. Las tasas pueden cambiar durante el período (salvo en la LECAP y el plazo fijo). Es una
          comparación, no una recomendación.
        </p>
        <p className="mt-2 text-micro">{TIPO_OPCION.lecap} y caución requieren cuenta en un broker.</p>
      </div>
    </div>
  );
}
