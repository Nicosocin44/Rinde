"use client";

import { useState } from "react";
import { DataTable, EtiquetaMejor, type Columna } from "@/components/ui/data-table";
import { ProviderMark } from "@/components/ui/provider-mark";
import { Sheet } from "@/components/ui/sheet";
import type { Caucion, FondoMM, OpcionPesos, PlazoFijoBanco } from "@/lib/data/types";
import { fechaCorta, numero, pesos, pesosCompacto, porcentaje } from "@/lib/format";
import { teaDesdeTna } from "@/lib/calculos";
import { MetricExplainer } from "@/components/ui/metric-explainer";
import { cn } from "@/lib/cn";
import { DetalleOpcion } from "./comparador";
import { LIQUIDEZ_OPCION, TIPO_OPCION } from "./etiquetas";

const SIN = <span className="text-text-3">—</span>;

export function TablaPlazoFijo({ bancos }: { bancos: PlazoFijoBanco[] }) {
  const mejor = bancos[0]?.id;
  const col = (dias: 30 | 60 | 90 | 180 | 365, solo?: Columna<PlazoFijoBanco>["solo"]): Columna<PlazoFijoBanco> => ({
    id: `d${dias}`,
    encabezado: `${dias} días`,
    alineacion: "derecha",
    solo,
    valorOrden: (b) => b.porPlazo[dias] ?? null,
    celda: (b) => (b.porPlazo[dias] ? <span className={cn(dias === 30 && "font-medium")}>{porcentaje(b.porPlazo[dias], 2)}</span> : SIN),
  });
  const columnas: Columna<PlazoFijoBanco>[] = [
    {
      id: "banco",
      encabezado: "Banco",
      valorOrden: (b) => b.banco,
      celda: (b) => (
        <span className="flex items-center gap-3">
          <ProviderMark proveedorId={b.proveedorId} />
          <span className="font-medium">{b.banco}</span>
          {b.id === mejor && <EtiquetaMejor />}
        </span>
      ),
    },
    col(30),
    { id: "tea30", encabezado: "TEA 30 d", alineacion: "derecha", valorOrden: (b) => b.porPlazo[30] ?? null, celda: (b) => (b.porPlazo[30] ? <span className="text-text-2">{porcentaje(teaDesdeTna(b.porPlazo[30], 30).toNumber(), 2)}</span> : SIN) },
    col(60, "desktop"),
    col(90, "desktop"),
    col(180, "pro-desktop"),
    col(365, "pro-desktop"),
    { id: "noclientes", encabezado: "No clientes", alineacion: "derecha", solo: "desktop", valorOrden: (b) => b.tnaNoClientes, celda: (b) => (b.tnaNoClientes ? <span className="text-text-2">{porcentaje(b.tnaNoClientes, 2)}</span> : <span className="text-chico text-text-3">No ofrece</span>) },
  ];
  return (
    <DataTable
      etiqueta="Plazo fijo por banco"
      filas={bancos}
      columnas={columnas}
      clave={(b) => b.id}
      esMejor={(b) => b.id === mejor}
      ordenPorDefecto={{ columna: "d30", direccion: "desc" }}
      filaMovil={(b) => (
        <span className="flex items-center gap-3">
          <ProviderMark proveedorId={b.proveedorId} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-[15px] font-medium">
              <span className="truncate">{b.banco}</span>
              {b.id === mejor && <EtiquetaMejor />}
            </span>
            <span className="block text-chico text-text-3">{b.porPlazo[90] ? `90 días: ${porcentaje(b.porPlazo[90], 1)}` : b.tnaNoClientes ? "También para no clientes" : "Solo clientes"}</span>
          </span>
          <span className="text-right">
            <span className="tabular block text-[15px] font-medium">{porcentaje(b.porPlazo[30], 1)}</span>
            <span className="block text-micro">TNA 30 d</span>
          </span>
        </span>
      )}
    />
  );
}

export function TablaOpciones({ opciones, etiqueta }: { opciones: OpcionPesos[]; etiqueta: string }) {
  const [detalle, setDetalle] = useState<OpcionPesos | null>(null);
  const mejor = opciones[0]?.id;
  const columnas: Columna<OpcionPesos>[] = [
    {
      id: "nombre",
      encabezado: "Billetera o cuenta",
      valorOrden: (o) => o.nombre,
      celda: (o) => (
        <span className="flex items-center gap-3">
          <ProviderMark proveedorId={o.proveedorId} />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="font-medium">{o.nombre}</span>
              {o.id === mejor && <EtiquetaMejor />}
            </span>
            <span className="block truncate text-chico text-text-3">{o.detalle ?? TIPO_OPCION[o.tipo]}</span>
          </span>
        </span>
      ),
    },
    { id: "liquidez", encabezado: "Liquidez", solo: "desktop", celda: (o) => <span className="text-chico text-text-2">{o.plazoDias ? `${o.plazoDias} días` : LIQUIDEZ_OPCION[o.liquidez]}</span> },
    { id: "tope", encabezado: "Rinde hasta", alineacion: "derecha", valorOrden: (o) => o.tope ?? Infinity, celda: (o) => <span className="text-text-2">{o.tope ? pesosCompacto(o.tope) : "Sin tope"}</span> },
    { id: "tna", encabezado: "TNA", alineacion: "derecha", valorOrden: (o) => o.tna, celda: (o) => <span className="font-medium">{porcentaje(o.tna, 2)}</span> },
    { id: "tea", encabezado: "TEA", alineacion: "derecha", valorOrden: (o) => o.tea, celda: (o) => <span className="text-text-2">{porcentaje(o.tea, 2)}</span> },
    { id: "fecha", encabezado: "Dato del", alineacion: "derecha", solo: "pro-desktop", celda: (o) => <span className="text-chico text-text-3">{fechaCorta(o.asOf)}</span> },
  ];
  return (
    <>
      <DataTable
        etiqueta={etiqueta}
        filas={opciones}
        columnas={columnas}
        clave={(o) => o.id}
        esMejor={(o) => o.id === mejor}
        onClickFila={setDetalle}
        ordenPorDefecto={{ columna: "tna", direccion: "desc" }}
        filaMovil={(o) => (
          <span className="flex items-center gap-3">
            <ProviderMark proveedorId={o.proveedorId} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[15px] font-medium">
                <span className="truncate">{o.nombre}</span>
                {o.id === mejor && <EtiquetaMejor />}
              </span>
              <span className="block truncate text-chico text-text-3">{o.tope ? `Rinde hasta ${pesosCompacto(o.tope)}` : "Sin tope"}</span>
            </span>
            <span className="text-right">
              <span className="tabular block text-[15px] font-medium">{porcentaje(o.tna, 1)}</span>
              <span className="block text-micro">TNA</span>
            </span>
          </span>
        )}
      />
      <Sheet abierto={detalle !== null} onCambio={(v) => !v && setDetalle(null)} titulo={detalle?.nombre ?? ""} descripcion={detalle ? TIPO_OPCION[detalle.tipo] : undefined}>
        {detalle && <DetalleOpcion o={detalle} />}
      </Sheet>
    </>
  );
}

export function TablaFondos({ fondos }: { fondos: FondoMM[] }) {
  const mejor = fondos[0]?.id;
  const ejemplo = fondos[0];
  const columnas: Columna<FondoMM>[] = [
    {
      id: "fondo",
      encabezado: "Fondo",
      valorOrden: (f) => f.fondo,
      celda: (f) => (
        <span className="flex items-center gap-3">
          <ProviderMark proveedorId={f.proveedorId} />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="font-medium">{f.fondo}</span>
              {f.id === mejor && <EtiquetaMejor />}
            </span>
            <span className="block text-chico text-text-3">
              Clase {f.clase}
              {f.accesoPor ? ` · desde ${f.accesoPor}` : ""}
            </span>
          </span>
        </span>
      ),
    },
    { id: "patrimonio", encabezado: "Patrimonio", alineacion: "derecha", solo: "desktop", valorOrden: (f) => f.patrimonio, celda: (f) => <span className="text-text-2">{pesosCompacto(f.patrimonio)}</span> },
    { id: "vcp", encabezado: "Cuotaparte", alineacion: "derecha", solo: "pro-desktop", celda: (f) => <span className="text-text-2">{numero(f.vcp, 3)}</span> },
    { id: "periodo", encabezado: "Período", alineacion: "derecha", solo: "pro-desktop", celda: (f) => <span className="text-chico text-text-3">{fechaCorta(f.fechaVcpAnterior)} → {fechaCorta(f.fechaVcp)}</span> },
    { id: "tna", encabezado: "TNA", alineacion: "derecha", valorOrden: (f) => f.tna, celda: (f) => <span className="font-medium">{porcentaje(f.tna, 2)}</span> },
    { id: "tea", encabezado: "TEA", alineacion: "derecha", valorOrden: (f) => f.tea, celda: (f) => <span className="text-text-2">{porcentaje(f.tea, 2)}</span> },
  ];
  return (
    <div className="flex flex-col gap-4">
      <DataTable
        etiqueta="Fondos money market"
        filas={fondos}
        columnas={columnas}
        clave={(f) => f.id}
        esMejor={(f) => f.id === mejor}
        ordenPorDefecto={{ columna: "tna", direccion: "desc" }}
        filaMovil={(f) => (
          <span className="flex items-center gap-3">
            <ProviderMark proveedorId={f.proveedorId} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[15px] font-medium">
                <span className="truncate">{f.fondo}</span>
                {f.id === mejor && <EtiquetaMejor />}
              </span>
              <span className="block text-chico text-text-3">
                Clase {f.clase} · {pesosCompacto(f.patrimonio)}
              </span>
            </span>
            <span className="text-right">
              <span className="tabular block text-[15px] font-medium">{porcentaje(f.tna, 1)}</span>
              <span className="block text-micro">TNA</span>
            </span>
          </span>
        )}
      />
      {ejemplo && (
        <MetricExplainer
          titulo={`¿De dónde sale la TNA de ${ejemplo.fondo}?`}
          formula="TNA = (cuotaparte hoy ÷ cuotaparte de hace n días − 1) × 365 ÷ n"
          pasos={[
            { etiqueta: `Cuotaparte al ${fechaCorta(ejemplo.fechaVcp)}`, valor: numero(ejemplo.vcp, 3) },
            { etiqueta: `Cuotaparte al ${fechaCorta(ejemplo.fechaVcpAnterior)}`, valor: numero(ejemplo.vcp / (1 + (ejemplo.tna * ejemplo.dias) / 365), 3) },
            { etiqueta: "Días (n)", valor: String(ejemplo.dias) },
          ]}
          resultado={porcentaje(ejemplo.tna, 2)}
          fuente="CNV (cuotapartes) vía ArgentinaDatos"
          ancla="/metodologia#fci"
        />
      )}
    </div>
  );
}

export function TablaCauciones({ cauciones }: { cauciones: Caucion[] }) {
  const columnas: Columna<Caucion>[] = [
    { id: "plazo", encabezado: "Plazo", valorOrden: (c) => c.plazoDias, ordenInicial: "asc", celda: (c) => <span className="font-medium">{c.plazoDias} días</span> },
    { id: "tna", encabezado: "TNA", alineacion: "derecha", valorOrden: (c) => c.tna, celda: (c) => <span className="font-medium">{porcentaje(c.tna, 2)}</span> },
    { id: "tea", encabezado: "TEA", alineacion: "derecha", valorOrden: (c) => c.tea, celda: (c) => <span className="text-text-2">{porcentaje(c.tea, 2)}</span> },
    { id: "monto", encabezado: "Monto operado", alineacion: "derecha", solo: "desktop", valorOrden: (c) => c.monto, celda: (c) => <span className="text-text-2">{pesosCompacto(c.monto)}</span> },
    { id: "ganancia", encabezado: "Con $1M ganás", alineacion: "derecha", celda: (c) => <span className="text-text-2">{pesos((1_000_000 * c.tna * c.plazoDias) / 365)}</span> },
  ];
  return (
    <DataTable
      etiqueta="Tasas de caución"
      filas={cauciones}
      columnas={columnas}
      clave={(c) => String(c.plazoDias)}
      ordenPorDefecto={{ columna: "plazo", direccion: "asc" }}
      filaMovil={(c) => (
        <span className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-[15px] font-medium">{c.plazoDias} días</span>
            <span className="block text-chico text-text-3">Con $1M ganás {pesos((1_000_000 * c.tna * c.plazoDias) / 365)}</span>
          </span>
          <span className="text-right">
            <span className="tabular block text-[15px] font-medium">{porcentaje(c.tna, 1)}</span>
            <span className="block text-micro">TNA</span>
          </span>
        </span>
      )}
    />
  );
}
