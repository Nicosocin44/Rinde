"use client";

import { useMemo, useState } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { Cifra } from "@/components/ui/cifra";
import { CompartirResultado } from "@/components/ui/compartir";
import { MoneyInput } from "@/components/ui/money-input";
import { actualizarMonto, construirIndice, inflacionAcumulada } from "@/lib/calculos";
import type { PuntoSerie } from "@/lib/data/types";
import { mesAnio, nombreMes, pesos, porcentaje } from "@/lib/format";
import { MarcoCalculadora, Resultado } from "./marco";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** "¿Cuánto valen hoy $X de [fecha]?" con el IPC del INDEC (índice armado con el producto acumulado). */
export function CalculadoraInflacion({ serie }: { serie: PuntoSerie[] }) {
  const ultimo = serie.at(-1)!;
  const [monto, setMonto] = useState(100_000);
  const anioUltimo = Number(ultimo.fecha.slice(0, 4));
  const [anio, setAnio] = useState(anioUltimo - 3);
  const [mes, setMes] = useState(Number(ultimo.fecha.slice(5, 7)));

  const r = useMemo(() => {
    const indice = construirIndice(serie.map((p) => ({ fecha: p.fecha, valor: p.valor * 100 })));
    const clave = `${anio}-${String(mes).padStart(2, "0")}`;
    const origen = indice.find((p) => p.mes === clave);
    const destino = indice.at(-1);
    if (!origen || !destino || clave > ultimo.fecha.slice(0, 7)) return null;
    const meses = serie.filter((p) => p.fecha.slice(0, 7) > clave).map((p) => p.valor * 100);
    return {
      hoy: actualizarMonto(monto, origen.indice, destino.indice).toNumber(),
      acumulada: inflacionAcumulada(meses).toNumber(),
      meses: meses.length,
      tramo: serie.filter((p) => p.fecha.slice(0, 7) > clave).map((p) => p.valor),
    };
  }, [serie, monto, anio, mes, ultimo.fecha]);

  const anios = Array.from(new Set(serie.map((p) => Number(p.fecha.slice(0, 4))))).sort((a, b) => b - a);

  return (
    <MarcoCalculadora
      ancla="inflacion"
      entradas={
        <>
          <MoneyInput etiqueta="Monto" valor={monto} onChange={setMonto} tamano="lg" />
          <div className="grid grid-cols-2 gap-3">
            <Selector etiqueta="Mes" valor={mes} onChange={setMes} opciones={MESES.map((m, i) => ({ valor: i + 1, etiqueta: m }))} />
            <Selector etiqueta="Año" valor={anio} onChange={setAnio} opciones={anios.map((a) => ({ valor: a, etiqueta: String(a) }))} />
          </div>
          <p className="text-micro">Usamos el IPC nacional del INDEC hasta {nombreMes(ultimo.fecha)} de {ultimo.fecha.slice(0, 4)}, el último dato publicado. Tomamos los precios al cierre de cada mes.</p>
        </>
      }
      resultado={
        r ? (
          <>
            <Resultado
              etiqueta={`${pesos(monto)} de fines de ${MESES[mes - 1]!.toLowerCase()} de ${anio} equivalen hoy a`}
              cifra={<Cifra valor={r.hoy} decimales={0} />}
              detalle={
                <>
                  Los precios subieron <span className="tabular font-medium text-text">{porcentaje(r.acumulada, 1)}</span> en {r.meses} meses. Lo que costaba {pesos(monto)} hoy cuesta {pesos(r.hoy)}.
                </>
              }
            />
            <div>
              <p className="mb-2 text-chico text-text-2">Inflación mensual en el período</p>
              <Sparkline valores={r.tramo} ancho={640} alto={80} tono="neutro" relleno className="w-full" />
              <div className="mt-1 flex justify-between text-micro">
                <span>{mesAnio(`${anio}-${String(mes).padStart(2, "0")}-01`)}</span>
                <span>{mesAnio(ultimo.fecha)}</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-text-2">Elegí una fecha anterior a {nombreMes(ultimo.fecha)} de {ultimo.fecha.slice(0, 4)}.</p>
        )
      }
      pie={r && <CompartirResultado titulo={`${pesos(monto)} de ${MESES[mes - 1]} ${anio} hoy son`} cifra={pesos(r.hoy)} detalle={`Inflación acumulada: ${porcentaje(r.acumulada, 1)} (IPC, INDEC).`} nombreArchivo="inflacion" />}
    />
  );
}

function Selector<T extends number>({ etiqueta, valor, onChange, opciones }: { etiqueta: string; valor: T; onChange: (v: T) => void; opciones: { valor: T; etiqueta: string }[] }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label">{etiqueta}</span>
      <select
        value={valor}
        onChange={(e) => onChange(Number(e.target.value) as T)}
        className="h-11 appearance-none rounded-(--radius-control) border border-border-strong bg-surface-2 bg-[length:16px] bg-[right_12px_center] bg-no-repeat px-3.5 pr-9 text-[16px] font-medium outline-none focus:border-accent"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2380868f' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}
