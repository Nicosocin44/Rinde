"use client";

import { useMemo, useState } from "react";
import { DataTable, EtiquetaMejor, type Columna } from "@/components/ui/data-table";
import { ProviderMark } from "@/components/ui/provider-mark";
import { SegmentedControl } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { PartnerCTA } from "@/components/ui/partner-cta";
import type { OpcionPesos } from "@/lib/data/types";
import { fechaCorta, pesos, pesosCompacto, porcentaje } from "@/lib/format";
import { gananciaPeriodo } from "@/lib/calculos";
import { ordenarOpciones } from "@/lib/rankings/pesos";
import { cn } from "@/lib/cn";
import { GARANTIA, LIQUIDEZ_OPCION, TIPO_OPCION } from "./etiquetas";

type Filtro = "todas" | "liquidas" | "fci" | "plazo_fijo" | "lecap";

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: "todas", etiqueta: "Todas" },
  { valor: "liquidas", etiqueta: "Billeteras y cuentas" },
  { valor: "fci", etiqueta: "Fondos" },
  { valor: "plazo_fijo", etiqueta: "Plazo fijo" },
  { valor: "lecap", etiqueta: "Letras" },
];

/**
 * Comparador unificado: todo normalizado a TEA para comparar peras con peras. Sin duplicados:
 * un plazo fijo por banco (a 30 días) y una clase por fondo.
 */
export function Comparador({ opciones }: { opciones: OpcionPesos[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [detalle, setDetalle] = useState<OpcionPesos | null>(null);
  const [todas, setTodas] = useState(false);
  const LIMITE = 12;

  const comparables = useMemo(
    () => ordenarOpciones(opciones.filter((o) => !o.condicionEspecial && (o.tipo !== "plazo_fijo" || o.plazoDias === 30))),
    [opciones],
  );
  const filas = useMemo(
    () =>
      comparables.filter((o) =>
        filtro === "todas" ? true : filtro === "liquidas" ? o.tipo === "billetera" || o.tipo === "cuenta" : filtro === "lecap" ? o.tipo === "lecap" || o.tipo === "caucion" : o.tipo === filtro,
      ),
    [comparables, filtro],
  );
  const mejorId = filas[0]?.id;

  const columnas: Columna<OpcionPesos>[] = [
    {
      id: "nombre",
      encabezado: "Opción",
      valorOrden: (o) => o.nombre,
      celda: (o) => (
        <span className="flex items-center gap-3">
          <ProviderMark proveedorId={o.proveedorId} />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium">{o.nombre}</span>
              {o.id === mejorId && <EtiquetaMejor />}
            </span>
            <span className="block truncate text-chico text-text-3">{o.detalle ?? TIPO_OPCION[o.tipo]}</span>
          </span>
        </span>
      ),
    },
    { id: "tipo", encabezado: "Tipo", solo: "desktop", valorOrden: (o) => TIPO_OPCION[o.tipo], celda: (o) => <span className="text-chico text-text-2">{TIPO_OPCION[o.tipo]}</span> },
    { id: "liquidez", encabezado: "Liquidez", celda: (o) => <span className="text-chico text-text-2">{o.plazoDias && o.tipo !== "lecap" ? `${o.plazoDias} días` : LIQUIDEZ_OPCION[o.liquidez]}</span> },
    { id: "tope", encabezado: "Tope", alineacion: "derecha", solo: "desktop", valorOrden: (o) => o.tope ?? Infinity, celda: (o) => <span className="text-chico text-text-2">{o.tope ? pesosCompacto(o.tope) : "Sin tope"}</span> },
    { id: "tna", encabezado: "TNA", alineacion: "derecha", solo: "pro", valorOrden: (o) => o.tna, celda: (o) => <span className="text-text-2">{porcentaje(o.tna, 2)}</span> },
    { id: "tem", encabezado: "TEM", alineacion: "derecha", solo: "pro-desktop", valorOrden: (o) => o.tem, celda: (o) => <span className="text-text-2">{porcentaje(o.tem, 2)}</span> },
    { id: "tea", encabezado: "TEA", alineacion: "derecha", valorOrden: (o) => o.tea, celda: (o) => <span className="font-medium">{porcentaje(o.tea, 2)}</span> },
    {
      id: "mes",
      encabezado: "Con $1M ganás",
      alineacion: "derecha",
      valorOrden: (o) => o.tea,
      celda: (o) => <span className="text-text-2">{pesos(gananciaPeriodo(Math.min(1_000_000, o.tope ?? Infinity), o.tea, 30).toNumber())}/mes</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6" data-testid="comparador">
      <div className="sin-scrollbar -mx-4 overflow-x-auto px-4">
        <SegmentedControl etiqueta="Filtrar por tipo" valor={filtro} onChange={setFiltro} opciones={FILTROS} />
      </div>
      <DataTable
        etiqueta="Comparador de tasas en pesos"
        filas={todas ? filas : filas.slice(0, LIMITE)}
        columnas={columnas}
        clave={(o) => o.id}
        esMejor={(o) => o.id === mejorId}
        onClickFila={setDetalle}
        ordenPorDefecto={{ columna: "tea", direccion: "desc" }}
        filaMovil={(o) => (
          <span className="flex items-center gap-3">
            <ProviderMark proveedorId={o.proveedorId} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[15px] font-medium">
                <span className="truncate">{o.nombre}</span>
                {o.id === mejorId && <EtiquetaMejor />}
              </span>
              <span className="block truncate text-chico text-text-3">
                {TIPO_OPCION[o.tipo]} · {o.plazoDias && o.tipo !== "lecap" ? `${o.plazoDias} días` : LIQUIDEZ_OPCION[o.liquidez].toLowerCase()}
              </span>
            </span>
            <span className="text-right">
              <span className="tabular block text-[15px] font-medium">{porcentaje(o.tea, 1)}</span>
              <span className="block text-micro">TEA</span>
            </span>
          </span>
        )}
      />
      {filas.length > LIMITE && (
        <button type="button" onClick={() => setTodas((v) => !v)} className="self-start text-chico font-medium text-accent hover:underline">
          {todas ? "Mostrar solo las 12 mejores" : `Ver las ${filas.length - LIMITE} opciones restantes`}
        </button>
      )}
      <Sheet abierto={detalle !== null} onCambio={(v) => !v && setDetalle(null)} titulo={detalle?.nombre ?? ""} descripcion={detalle ? TIPO_OPCION[detalle.tipo] : undefined}>
        {detalle && <DetalleOpcion o={detalle} />}
      </Sheet>
    </div>
  );
}

export function DetalleOpcion({ o }: { o: OpcionPesos }) {
  const filas: [string, string][] = [
    ["TNA", porcentaje(o.tna, 2)],
    ["TEA", porcentaje(o.tea, 2)],
    ["TEM", porcentaje(o.tem, 2)],
    ["Liquidez", o.plazoDias && o.tipo !== "lecap" ? `Al vencimiento (${o.plazoDias} días)` : LIQUIDEZ_OPCION[o.liquidez]],
    ["Tope", o.tope ? pesos(o.tope) : "Sin tope"],
    ["Riesgo", o.riesgo.charAt(0).toUpperCase() + o.riesgo.slice(1)],
    ["Garantía", GARANTIA[o.garantia]],
    ["Dato del", fechaCorta(o.asOf, true)],
  ];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-label">Con $ 1.000.000 ganás</p>
        <p className="tabular mt-1 text-cifra">
          {pesos(gananciaPeriodo(Math.min(1_000_000, o.tope ?? Infinity), o.tea, 30).toNumber())} <span className="text-[0.55em] font-medium text-text-2">por mes</span>
        </p>
      </div>
      <dl>
        {filas.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-6 border-b border-border py-3 last:border-0">
            <dt className="shrink-0 text-chico text-text-2">{k}</dt>
            <dd className={cn("text-right", k === "Garantía" ? "text-chico" : "tabular font-medium")}>{v}</dd>
          </div>
        ))}
      </dl>
      {o.condicion && <p className="rounded-(--radius-control) bg-surface-2 px-3.5 py-3 text-chico text-text-2">{o.condicion}</p>}
      <PartnerCTA proveedorId={o.proveedorId} nombre={o.nombre} />
      <p className="text-micro">Es una comparación, no una recomendación. Verificá la tasa vigente en la entidad antes de invertir.</p>
    </div>
  );
}
