"use client";

import { useMemo, useState } from "react";
import { bonoPorTicker } from "@data/ar/bonos-usd";
import { YieldCurve } from "@/components/charts/yield-curve";
import { DataTable, type Columna } from "@/components/ui/data-table";
import { Delta } from "@/components/ui/delta";
import { Destello } from "@/components/ui/destello";
import { MoneyInput } from "@/components/ui/money-input";
import { calculadoraFlujos, metricasBono } from "@/lib/calculos";
import type { BonoUsd, ObligacionNegociable } from "@/lib/data/types";
import { dolares, fechaCorta, numero, pesosCompacto, porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";

const COLOR_NY = "var(--c-accent)";
const COLOR_LOCAL = "var(--c-text-2)";

export function Bonos({ bonos, ajustes }: { bonos: BonoUsd[]; ajustes: { ny: { x: number; y: number }[]; local: { x: number; y: number }[] } }) {
  const [resaltado, setResaltado] = useState<string | null>(null);

  const columnas: Columna<BonoUsd>[] = [
    {
      id: "ticker",
      encabezado: "Bono",
      valorOrden: (b) => b.ticker,
      celda: (b) => (
        <span className="flex items-center gap-2.5">
          <span className="size-2 rounded-full" style={{ background: resaltado === b.ticker ? "var(--c-accent)" : b.ley === "Nueva York" ? COLOR_NY : COLOR_LOCAL }} />
          <span className="font-mono text-[14px] font-medium">{b.ticker}</span>
          <span className="hidden text-chico text-text-3 lg:inline">{b.nombre}</span>
        </span>
      ),
    },
    { id: "ley", encabezado: "Ley", solo: "desktop", valorOrden: (b) => b.ley, celda: (b) => <span className="text-chico text-text-2">{b.ley === "Nueva York" ? "Nueva York" : "Argentina"}</span> },
    { id: "precio", encabezado: "Precio US$", alineacion: "derecha", valorOrden: (b) => b.precioUsd, celda: (b) => <Destello valor={b.precioUsd}>{numero(b.precioUsd, 2)}</Destello> },
    { id: "var", encabezado: "Var.", alineacion: "derecha", solo: "desktop", valorOrden: (b) => b.variacion, celda: (b) => <Delta valor={b.variacion} className="text-chico" /> },
    { id: "tir", encabezado: "TIR", alineacion: "derecha", valorOrden: (b) => b.tir, celda: (b) => <span className="font-medium">{porcentaje(b.tir, 2)}</span> },
    { id: "duration", encabezado: "Duration", alineacion: "derecha", solo: "pro", valorOrden: (b) => b.duration, celda: (b) => <span className="text-text-2">{numero(b.duration, 2)}</span> },
    { id: "paridad", encabezado: "Paridad", alineacion: "derecha", solo: "pro-desktop", valorOrden: (b) => b.paridad, celda: (b) => <span className="text-text-2">{porcentaje(b.paridad, 1)}</span> },
    { id: "cupon", encabezado: "Cupón", alineacion: "derecha", solo: "pro-desktop", celda: (b) => <span className="text-text-2">{porcentaje(b.cuponActual, 3)}</span> },
    {
      id: "pago",
      encabezado: "Próximo pago",
      alineacion: "derecha",
      solo: "desktop",
      valorOrden: (b) => b.proximoPago?.fecha ?? null,
      celda: (b) => (b.proximoPago ? <span className="text-chico text-text-2">{fechaCorta(b.proximoPago.fecha, true)} · US$ {numero(b.proximoPago.monto, 2)}</span> : null),
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="card p-4 pt-5 lg:p-6">
        <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-chico text-text-2">
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: COLOR_NY }} /> Globales (ley Nueva York)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: COLOR_LOCAL }} /> Bonares (ley argentina)
          </span>
        </div>
        <YieldCurve
          alto={300}
          puntos={bonos.map((b) => ({ id: b.ticker, x: b.duration, y: b.tir, etiqueta: b.ticker, color: b.ley === "Nueva York" ? COLOR_NY : COLOR_LOCAL }))}
          ajuste={[]}
          ajustesExtra={[
            { puntos: ajustes.ny, color: COLOR_NY },
            { puntos: ajustes.local, color: COLOR_LOCAL },
          ]}
          seleccionado={resaltado}
          onSeleccionar={setResaltado}
          formatoY={(v) => porcentaje(v, 1)}
          formatoX={(v) => `${numero(v, 0)} años`}
        />
        <p className="mt-2 text-micro">TIR contra duration (años promedio hasta cobrar los flujos). Tocá una fila para ver la ficha del bono, con sus pagos.</p>
      </div>
      <DataTable
        etiqueta="Bonos soberanos en dólares"
        filas={bonos}
        columnas={columnas}
        clave={(b) => b.ticker}
        ordenPorDefecto={{ columna: "tir", direccion: "desc" }}
        resaltada={resaltado}
        onResaltar={setResaltado}
        enlace={(b) => `/activo/${b.ticker}`}
        filaMovil={(b) => (
          <span className="flex items-center gap-3">
            <span className="size-2 shrink-0 rounded-full" style={{ background: b.ley === "Nueva York" ? COLOR_NY : COLOR_LOCAL }} />
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[15px] font-medium">{b.ticker}</span>
              <span className="block truncate text-chico text-text-3">
                {b.nombre} · US$ {numero(b.precioUsd, 2)}
              </span>
            </span>
            <span className="text-right">
              <span className="tabular block text-[15px] font-medium">{porcentaje(b.tir, 1)}</span>
              <span className="block text-micro">TIR</span>
            </span>
          </span>
        )}
      />
    </div>
  );
}

/** Calculadora "invierto US$ X, ¿cuánto cobro y cuándo?" (también en la ficha de cada bono). */
export function CalculadoraFlujos({ b, liquidacion }: { b: BonoUsd; liquidacion: string }) {
  const [monto, setMonto] = useState(1000);
  const def = bonoPorTicker.get(b.ticker)!;
  const r = useMemo(() => calculadoraFlujos(def, monto, b.precioUsd, liquidacion), [def, monto, b.precioUsd, liquidacion]);
  const m = useMemo(() => metricasBono(def, b.precioUsd, liquidacion), [def, b.precioUsd, liquidacion]);
  return (
    <div className="flex flex-col gap-6" data-testid="calculadora-flujos">
      <MoneyInput etiqueta="Invertís" moneda="US$" valor={monto} onChange={setMonto} tamano="lg" decimales={2} />
      <div>
        <p className="text-label">Cobrás en total</p>
        <p className="tabular mt-1 text-cifra">{dolares(r.totalCobrado.toNumber())}</p>
        <p className="mt-1 text-chico text-text-2">
          Comprás {numero(r.nominales.toNumber(), 0)} nominales a US$ {numero(b.precioUsd, 2)}. TIR {porcentaje(b.tir, 2)}, si se cumplen todos los pagos.
        </p>
      </div>
      {/* El encabezado va dentro de la caja con scroll (fijo arriba) para que las columnas queden alineadas con o sin barra,
          y el margen derecho separa los números de la barra de scroll. */}
      <div className="max-h-[360px] overflow-y-auto">
        <div className="sticky top-0 grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-border bg-bg pr-4 pb-2 text-label">
          <span>Fecha</span>
          <span className="w-20 text-right">Interés</span>
          <span className="w-24 text-right">Capital</span>
        </div>
        <ul>
          {r.cobros.map((c) => (
            <li key={c.fecha} className="tabular grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-border py-2 pr-4 text-chico last:border-0">
              <span className="text-text-2">{fechaCorta(c.fecha, true)}</span>
              <span className="w-20 text-right">{numero(c.cupon.toNumber(), 2)}</span>
              <span className={cn("w-24 text-right", c.amortizacion.isZero() && "text-text-3")}>{numero(c.amortizacion.toNumber(), 2)}</span>
            </li>
          ))}
        </ul>
      </div>
      {m && (
        <p className="text-micro">
          Valor técnico US$ {numero(m.valorTecnico.toNumber(), 2)} · paridad {porcentaje(m.paridad.toNumber(), 1)} · duration {numero(m.duration.toNumber(), 2)} años. Liquidación {fechaCorta(liquidacion, true)}. Flujos según el prospecto del canje
          2020, por cada 100 nominales originales. No incluye comisiones ni impuestos.
        </p>
      )}
    </div>
  );
}

export function TablaOns({ ons }: { ons: ObligacionNegociable[] }) {
  const columnas: Columna<ObligacionNegociable>[] = [
    { id: "ticker", encabezado: "ON", valorOrden: (o) => o.ticker, celda: (o) => <span className="font-mono text-[14px] font-medium">{o.ticker}</span> },
    { id: "usd", encabezado: "Precio US$", alineacion: "derecha", valorOrden: (o) => o.precioUsd, celda: (o) => <Destello valor={o.precioUsd}>{numero(o.precioUsd, 2)}</Destello> },
    { id: "var", encabezado: "Var.", alineacion: "derecha", valorOrden: (o) => o.variacion, celda: (o) => <Delta valor={o.variacion} className="text-chico" /> },
    { id: "ops", encabezado: "Operaciones", alineacion: "derecha", solo: "desktop", valorOrden: (o) => o.operaciones, celda: (o) => <span className="text-text-2">{numero(o.operaciones, 0)}</span> },
    { id: "vol", encabezado: "Volumen (nominales)", alineacion: "derecha", solo: "desktop", valorOrden: (o) => o.volumen, celda: (o) => <span className="text-text-2">{pesosCompacto(o.volumen, "")}</span> },
  ];
  return (
    <DataTable
      etiqueta="Obligaciones negociables"
      filas={ons}
      columnas={columnas}
      clave={(o) => o.ticker}
      ordenPorDefecto={{ columna: "ops", direccion: "desc" }}
      filaMovil={(o) => (
        <span className="flex items-center justify-between gap-3">
          <span className="font-mono text-[15px] font-medium">{o.ticker}</span>
          <span className="text-right">
            <span className="tabular block text-[15px] font-medium">
                <Destello valor={o.precioUsd}>US$ {numero(o.precioUsd, 2)}</Destello>
              </span>
            <Delta valor={o.variacion} className="text-micro" />
          </span>
        </span>
      )}
    />
  );
}
