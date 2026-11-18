"use client";

import { useState } from "react";
import { YieldCurve } from "@/components/charts/yield-curve";
import { DataTable, type Columna } from "@/components/ui/data-table";
import { Delta } from "@/components/ui/delta";
import { MetricExplainer } from "@/components/ui/metric-explainer";
import { MoneyInput } from "@/components/ui/money-input";
import { cobroAlVencimiento } from "@/lib/calculos";
import type { CurvaLecaps, Lecap } from "@/lib/data/types";
import { fechaCorta, numero, pesos, porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * LECAPs y BONCAPs: curva + tabla con hover sincronizado. Click → la ficha de la letra, que tiene la calculadora
 * ("si pongo $X hoy, al vencimiento cobro $Y").
 */
export function Lecaps({ curva }: { curva: CurvaLecaps }) {
  const [resaltada, setResaltada] = useState<string | null>(null);
  const enCurva = curva.letras.filter((l) => l.enCurva);

  const columnas: Columna<Lecap>[] = [
    {
      id: "ticker",
      encabezado: "Ticker",
      valorOrden: (l) => l.ticker,
      celda: (l) => (
        <span className="flex items-center gap-2.5">
          <span className={cn("size-2 rounded-full", resaltada === l.ticker ? "bg-accent" : l.enCurva ? "bg-text" : "bg-transparent ring-1 ring-text-3")} />
          <span className="font-mono text-[14px] font-medium">{l.ticker}</span>
          <span className="hidden text-micro xl:inline">{l.tipo}</span>
          {l.etiqueta && <span className="rounded-(--radius-chip) bg-warn/12 px-1.5 py-px text-[11px] font-medium text-warn">{l.etiqueta}</span>}
        </span>
      ),
    },
    { id: "vence", encabezado: "Vence", valorOrden: (l) => l.vencimiento, ordenInicial: "asc", celda: (l) => <span className="text-text-2">{fechaCorta(l.vencimiento, true)}</span> },
    { id: "dias", encabezado: "Días", alineacion: "derecha", valorOrden: (l) => l.dias, ordenInicial: "asc", celda: (l) => <span className="text-text-2">{l.dias}</span> },
    { id: "precio", encabezado: "Precio", alineacion: "derecha", solo: "pro", valorOrden: (l) => l.precio, celda: (l) => <span className="text-text-2">{numero(l.precio, 2)}</span> },
    { id: "var", encabezado: "Var.", alineacion: "derecha", solo: "pro-desktop", celda: (l) => <Delta valor={l.variacion} className="text-chico" /> },
    { id: "directo", encabezado: "Ganás al vencer", alineacion: "derecha", solo: "desktop", valorOrden: (l) => l.directo, celda: (l) => <span className="text-text-2">{porcentaje(l.directo, 2)}</span> },
    { id: "tna", encabezado: "TNA", alineacion: "derecha", solo: "pro", valorOrden: (l) => l.tna, celda: (l) => <span className="text-text-2">{porcentaje(l.tna, 2)}</span> },
    { id: "tem", encabezado: "TEM", alineacion: "derecha", solo: "pro", valorOrden: (l) => l.tem, celda: (l) => <span className="text-text-2">{porcentaje(l.tem, 2)}</span> },
    { id: "tea", encabezado: "TEA", alineacion: "derecha", valorOrden: (l) => l.tea, celda: (l) => <span className="font-medium">{porcentaje(l.tea, 2)}</span> },
    {
      id: "calc",
      encabezado: <span className="sr-only">Calcular</span>,
      alineacion: "derecha",
      celda: () => <span className="text-chico font-medium text-accent">Calcular</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="card p-4 pt-5 lg:p-6">
        <YieldCurve
          alto={320}
          puntos={enCurva.map((l) => ({ id: l.ticker, x: l.dias, y: l.tea, etiqueta: l.ticker, fechaX: l.vencimiento }))}
          ajuste={curva.ajuste.map((p) => ({ x: p.dias, y: p.tea }))}
          seleccionado={resaltada}
          onSeleccionar={setResaltada}
          formatoY={(v) => porcentaje(v, 1)}
        />
        <p className="mt-2 text-micro">Cada punto es una letra: días al vencimiento contra TEA. La línea es la curva ajustada. Tocá un punto o una fila.</p>
      </div>

      <DataTable
        etiqueta="LECAPs y BONCAPs"
        filas={curva.letras}
        columnas={columnas}
        clave={(l) => l.ticker}
        ordenPorDefecto={{ columna: "dias", direccion: "asc" }}
        resaltada={resaltada}
        onResaltar={setResaltada}
        enlace={(l) => `/activo/${l.ticker}`}
        filaMovil={(l) => (
          <span className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-mono text-[15px] font-medium">{l.ticker}</span>
                {l.etiqueta && <span className="truncate text-[11px] font-medium text-warn">{l.etiqueta}</span>}
              </span>
              <span className="block text-chico text-text-3">
                Vence el {fechaCorta(l.vencimiento, true)} · {l.dias} días
              </span>
            </span>
            <span className="text-right">
              <span className="tabular block text-[15px] font-medium">{porcentaje(l.tea, 1)}</span>
              <span className="block text-micro">TEA</span>
            </span>
          </span>
        )}
      />

    </div>
  );
}

/** Calculadora "si pongo $X hoy, ¿cuánto cobro al vencimiento?" (también en la ficha de cada letra). */
export function CalculadoraLecap({ l, liquidacion }: { l: Lecap; liquidacion: string }) {
  const [monto, setMonto] = useState(1_000_000);
  const c = cobroAlVencimiento(monto, l.precio, l.vf);
  return (
    <div className="flex flex-col gap-6" data-testid="calculadora-lecap">
      <MoneyInput etiqueta="Si ponés hoy" valor={monto} onChange={setMonto} tamano="lg" />
      <div>
        <p className="text-label">Al vencimiento cobrás</p>
        <p className="tabular mt-1 text-cifra">{pesos(c.cobro.toNumber())}</p>
        <p className="mt-1 text-chico text-text-2">
          Ganás <span className="tabular font-medium text-gain">{pesos(c.ganancia.toNumber())}</span> en {l.dias} días · {porcentaje(l.tea, 2)} TEA
        </p>
      </div>
      <dl>
        {[
          ["Precio (por 100 nominales)", numero(l.precio, 3)],
          ["Valor final (por 100 nominales)", `${numero(l.vf, 3)}${l.vfEstimado ? " (estimado)" : ""}`],
          ["Nominales que comprás", numero(c.nominales.toNumber(), 0)],
          ["Liquidación (24 h)", fechaCorta(liquidacion, true)],
          ["TNA · TEM", `${porcentaje(l.tna, 2)} · ${porcentaje(l.tem, 2)}`],
        ].map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-0">
            <dt className="text-chico text-text-2">{k}</dt>
            <dd className="tabular font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <MetricExplainer
        titulo="¿Cómo se calcula?"
        formula="Cobro = (monto ÷ (precio ÷ 100)) × valor final ÷ 100"
        pasos={[
          { etiqueta: "Monto", valor: pesos(monto) },
          { etiqueta: "Precio", valor: numero(l.precio, 3) },
          { etiqueta: "Valor final", valor: numero(l.vf, 3) },
        ]}
        resultado={pesos(c.cobro.toNumber())}
        fuente="Precio: data912 (BYMA, con demora). Valor final: tabla propia"
        ancla="/metodologia#lecaps"
      />
      <p className="text-micro">
        No incluye comisiones del broker. Si vendés antes del vencimiento, cobrás el precio de ese día, que puede ser mayor o menor. {l.vfEstimado && "El valor final es una estimación a partir del precio y la tasa publicados; la diferencia con el oficial es menor al 0,01 %."}
      </p>
    </div>
  );
}
