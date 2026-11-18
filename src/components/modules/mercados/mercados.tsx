"use client";

import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable, type Columna } from "@/components/ui/data-table";
import { Delta } from "@/components/ui/delta";
import { SegmentedControl } from "@/components/ui/segmented";
import { ProviderMark } from "@/components/ui/provider-mark";
import type { Accion, Cedear, Cripto } from "@/lib/data/types";
import { dolares, numero, pesos, pesosCompacto, porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";

function Buscador({ valor, onChange, placeholder }: { valor: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex h-10 w-full items-center gap-2 rounded-(--radius-control) border border-border-strong bg-surface-2 px-3 focus-within:border-accent sm:max-w-xs">
      <Search className="size-4 text-text-3" />
      <span className="sr-only">Buscar</span>
      <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-text-3" />
    </label>
  );
}

export function TablaCedears({ cedears }: { cedears: Cedear[] }) {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [sector, setSector] = useState("Todos");
  const [todos, setTodos] = useState(false);
  const sectores = useMemo(() => ["Todos", ...new Set(cedears.map((c) => c.sector).filter((s): s is string => !!s))].slice(0, 9), [cedears]);
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return cedears.filter((c) => (sector === "Todos" || c.sector === sector) && (!t || c.ticker.toLowerCase().includes(t) || (c.nombre ?? "").toLowerCase().includes(t)));
  }, [cedears, q, sector]);
  const visibles = todos || q ? filtrados : filtrados.slice(0, 40);

  const columnas: Columna<Cedear>[] = [
    {
      id: "ticker",
      encabezado: "CEDEAR",
      valorOrden: (c) => c.ticker,
      celda: (c) => (
        <span className="flex items-center gap-3">
          <ProviderMark activo={c.ticker} sigla={c.ticker.slice(0, 2)} />
          {c.nombre ? (
            <span>
              <span className="block font-medium">{c.nombre}</span>
              <span className="block font-mono text-[12px] text-text-3">{c.ticker}</span>
            </span>
          ) : (
            <span className="font-mono text-[14px] font-medium">{c.ticker}</span>
          )}
        </span>
      ),
    },
    { id: "sector", encabezado: "Sector", solo: "desktop", celda: (c) => <span className="text-chico text-text-2">{c.sector ?? "—"}</span> },
    { id: "ars", encabezado: "Precio $", alineacion: "derecha", valorOrden: (c) => c.precioArs, celda: (c) => <span>{pesos(c.precioArs, 2)}</span> },
    { id: "usd", encabezado: "Precio US$", alineacion: "derecha", solo: "desktop", valorOrden: (c) => c.precioUsd, celda: (c) => <span className="text-text-2">{c.precioUsd ? numero(c.precioUsd, 2) : "—"}</span> },
    { id: "var", encabezado: "Var.", alineacion: "derecha", valorOrden: (c) => c.variacion, celda: (c) => <Delta valor={c.variacion} en="tabla" className="text-chico" /> },
    { id: "mep", encabezado: "MEP implícito", alineacion: "derecha", solo: "pro", valorOrden: (c) => c.mepImplicito, celda: (c) => <span className="text-text-2">{c.mepImplicito ? pesos(c.mepImplicito, 2) : "—"}</span> },
    { id: "ccl", encabezado: "CCL implícito", alineacion: "derecha", solo: "pro-desktop", valorOrden: (c) => c.cclImplicito, celda: (c) => <span className="text-text-2">{c.cclImplicito ? pesos(c.cclImplicito, 2) : "—"}</span> },
    { id: "vol", encabezado: "Volumen", alineacion: "derecha", solo: "desktop", valorOrden: (c) => c.volumenArs, celda: (c) => <span className="text-chico text-text-3">{pesosCompacto(c.volumenArs)}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Buscador valor={q} onChange={setQ} placeholder="Buscá Apple, NVDA, MELI…" />
        <div className="sin-scrollbar -mx-4 overflow-x-auto px-4">
          <SegmentedControl etiqueta="Sector" tamano="sm" valor={sector} onChange={setSector} opciones={sectores.map((s) => ({ valor: s, etiqueta: s }))} />
        </div>
      </div>
      <DataTable
        etiqueta="CEDEARs"
        filas={visibles}
        columnas={columnas}
        clave={(c) => c.ticker}
        enlace={(c) => `/activo/${encodeURIComponent(c.ticker)}`}
        ordenPorDefecto={{ columna: "vol", direccion: "desc" }}
        filaMovil={(c) => (
          <span className="flex items-center gap-3">
            <ProviderMark activo={c.ticker} sigla={c.ticker.slice(0, 2)} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{c.nombre ?? c.ticker}</span>
              <span className="block font-mono text-[12px] text-text-3">{c.ticker}</span>
            </span>
            <span className="text-right">
              <span className="tabular block text-[15px] font-medium">{pesos(c.precioArs, 2)}</span>
              <Delta valor={c.variacion} className="text-micro" />
            </span>
          </span>
        )}
      />
      {!todos && !q && filtrados.length > 40 && (
        <button type="button" onClick={() => setTodos(true)} className="self-start text-chico font-medium text-accent hover:underline">
          Ver los {filtrados.length} CEDEARs con operaciones hoy
        </button>
      )}
    </div>
  );
}

export function TablaAcciones({ acciones }: { acciones: Accion[] }) {
  const params = useSearchParams();
  const [panel, setPanel] = useState<"líder" | "general">("líder");
  const [q, setQ] = useState(params.get("q") ?? "");
  const filas = acciones.filter((a) => a.panel === panel && (!q || a.ticker.toLowerCase().includes(q.toLowerCase()) || (a.nombre ?? "").toLowerCase().includes(q.toLowerCase())));
  const columnas: Columna<Accion>[] = [
    {
      id: "ticker",
      encabezado: "Acción",
      valorOrden: (a) => a.ticker,
      celda: (a) => (
        <span className="flex items-center gap-3">
          <ProviderMark activo={a.ticker} sigla={a.ticker.slice(0, 2)} />
          <span>
            <span className="block font-medium">{a.nombre ?? a.ticker}</span>
            <span className="block font-mono text-[12px] text-text-3">{a.ticker}</span>
          </span>
        </span>
      ),
    },
    { id: "precio", encabezado: "Precio", alineacion: "derecha", valorOrden: (a) => a.precio, celda: (a) => <span>{pesos(a.precio, 2)}</span> },
    { id: "var", encabezado: "Var.", alineacion: "derecha", valorOrden: (a) => a.variacion, celda: (a) => <Delta valor={a.variacion} en="tabla" className="text-chico" /> },
    { id: "vol", encabezado: "Volumen", alineacion: "derecha", solo: "desktop", valorOrden: (a) => a.volumen, celda: (a) => <span className="text-chico text-text-3">{pesosCompacto(a.volumen)}</span> },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          etiqueta="Panel"
          valor={panel}
          onChange={setPanel}
          opciones={[
            { valor: "líder", etiqueta: "Panel líder" },
            { valor: "general", etiqueta: "Panel general" },
          ]}
        />
        <Buscador valor={q} onChange={setQ} placeholder="Buscá GGAL, YPF…" />
      </div>
      <DataTable
        etiqueta="Acciones argentinas"
        filas={filas}
        columnas={columnas}
        clave={(a) => a.ticker}
        enlace={(a) => `/activo/${encodeURIComponent(a.ticker)}`}
        ordenPorDefecto={{ columna: "vol", direccion: "desc" }}
        filaMovil={(a) => (
          <span className="flex items-center justify-between gap-3">
            <ProviderMark activo={a.ticker} sigla={a.ticker.slice(0, 2)} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{a.nombre ?? a.ticker}</span>
              <span className="block font-mono text-[12px] text-text-3">{a.ticker}</span>
            </span>
            <span className="text-right">
              <span className="tabular block text-[15px] font-medium">{pesos(a.precio, 2)}</span>
              <Delta valor={a.variacion} className="text-micro" />
            </span>
          </span>
        )}
      />
    </div>
  );
}

export function VistaCripto({ criptos }: { criptos: Cripto[] }) {
  const [sel, setSel] = useState<Cripto["simbolo"]>("BTC");
  const c = criptos.find((x) => x.simbolo === sel) ?? criptos[0];
  if (!c) return null;
  return (
    <div className="flex flex-col gap-10">
      <ul className="grid grid-cols-2 border-y border-border lg:grid-cols-4">
        {criptos.map((x, i) => (
          <li key={x.simbolo} className={cn("border-border", i % 2 === 1 && "border-l", i >= 2 && "border-t lg:border-t-0", i > 0 && "lg:border-l")}>
            <button type="button" aria-pressed={sel === x.simbolo} onClick={() => setSel(x.simbolo)} className={cn("presionable flex w-full flex-col gap-1 px-4 py-5 text-left transition-colors lg:px-6", sel === x.simbolo && "bg-surface-2/60")}>
              <span className="flex items-center gap-2 text-label">
                <ProviderMark activo={x.simbolo} sigla={x.simbolo.slice(0, 2)} tamano={28} />
                {x.nombre}
              </span>
              <span className="tabular text-[24px] font-medium tracking-[-0.02em] lg:text-[28px]">{x.precioUsd && x.precioUsd > 2 ? dolares(x.precioUsd, 0) : pesos(x.precioArs, 2)}</span>
              <span className="tabular text-chico text-text-2">{x.precioUsd && x.precioUsd > 2 ? pesos(x.precioArs) : "promedio entre exchanges"}</span>
            </button>
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-4">
        <h2 className="text-h3">
          Dónde comprar {c.nombre} con pesos <span className="text-text-3">({c.exchanges.length} exchanges)</span>
        </h2>
        <ul className="border-t border-border">
          {c.exchanges.slice(0, 12).map((e, i) => (
            <li key={e.id} className={cn("grid grid-cols-[20px_28px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-3 md:grid-cols-[20px_28px_minmax(0,1fr)_140px_140px_80px]", i === 0 && "bg-accent-soft")}>
              <span className={cn("tabular text-chico", i === 0 ? "font-semibold text-accent" : "text-text-3")}>{i + 1}</span>
              <ProviderMark proveedorId={e.id} />
              <span className="truncate text-[15px] font-medium">{e.nombre}</span>
              <span className="tabular text-right text-[15px] font-medium">{pesos(e.compras, 2)}</span>
              <span className="tabular hidden text-right text-text-2 md:block">{pesos(e.vendes, 2)}</span>
              <span className="tabular hidden text-right text-chico text-text-3 md:block">{porcentaje(e.spread, 2)}</span>
            </li>
          ))}
        </ul>
        <p className="text-micro">Precio final para comprar (con comisiones) · vendés a · spread. Sin P2P.</p>
      </section>
    </div>
  );
}
