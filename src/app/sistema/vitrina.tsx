"use client";

import { useState } from "react";
import { AreaApilada } from "@/components/charts/area-apilada";
import { BarrasMensuales } from "@/components/charts/barras-mensuales";
import { Donut } from "@/components/charts/donut";
import { Sparkline } from "@/components/charts/sparkline";
import { YieldCurve } from "@/components/charts/yield-curve";
import { Button, IconButton } from "@/components/ui/button";
import { Cifra, CifraPorcentaje } from "@/components/ui/cifra";
import { DataTable, EtiquetaMejor } from "@/components/ui/data-table";
import { Delta } from "@/components/ui/delta";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/estados";
import { FreshnessBadge, SourceNote } from "@/components/ui/frescura";
import { MetricExplainer } from "@/components/ui/metric-explainer";
import { MoneyInput, NumberField } from "@/components/ui/money-input";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ProviderMark } from "@/components/ui/provider-mark";
import { SegmentedControl } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { FUENTES } from "@/lib/data/types";
import { numero, pesos } from "@/lib/format";
import { Search } from "lucide-react";

const TOKENS = ["bg", "bg-raised", "surface", "surface-2", "border", "border-strong", "text", "text-2", "text-3", "accent", "accent-soft", "gain", "loss", "warn"];

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border-t border-border pt-8">
      <h2 className="text-label">{titulo}</h2>
      {children}
    </section>
  );
}

function Tokens() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {(["dark", "light"] as const).map((t) => (
        <div key={t} data-theme={t} className="rounded-(--radius-panel) border border-border bg-bg p-5 text-text">
          <p className="mb-4 text-[15px] font-semibold">{t === "dark" ? "Dark · vitrina" : "Light · día"}</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {TOKENS.map((k) => (
              <li key={k} className="flex items-center gap-2 text-chico">
                <span className="size-6 shrink-0 rounded-[6px] border border-border" style={{ background: `var(--c-${k})` }} />
                <span className="text-text-2">{k}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Cifra valor={1584.99} className="text-cifra" />
            <Delta valor={0.0025} />
            <Delta valor={-0.001} />
            <FreshnessBadge estado="live" />
            <FreshnessBadge estado="sample" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Interactivos() {
  const toast = useToast();
  const [seg, setSeg] = useState("30");
  const [valor, setValor] = useState(1584.99);
  const [monto, setMonto] = useState(1_000_000);
  const [tasa, setTasa] = useState(24);
  const [slider, setSlider] = useState(90);
  const [sheet, setSheet] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  return (
    <>
      <Bloque titulo="Tipografía">
        <div className="flex flex-col gap-4">
          <p className="text-display">Display 72</p>
          <p className="text-h1">H1 · La foto de hoy</p>
          <p className="text-h2">H2 · ¿Dónde rinde más tu plata?</p>
          <p className="text-h3">H3 · Todos los dólares</p>
          <Cifra valor={12480300} decimales={0} className="text-hero" />
          <CifraPorcentaje fraccion={0.245} sufijo="TNA" className="text-cifra" />
          <p>Cuerpo 16/24 · Comparamos todo en la misma tasa para que sea justo.</p>
          <p className="text-chico">Chico 14/20 · Plazo fijo a 30 días</p>
          <p className="text-label">Label · mayúsculas</p>
          <p className="text-micro">Micro · Fuente: BCRA · actualizado 18:41</p>
        </div>
      </Bloque>

      <Bloque titulo="Botones y controles">
        <div className="flex flex-wrap items-center gap-3">
          <Button variante="primario">Mi cartera</Button>
          <Button>Secundario</Button>
          <Button variante="fantasma">Fantasma</Button>
          <Button variante="primario" tamano="lg">
            Grande
          </Button>
          <IconButton aria-label="Buscar">
            <Search />
          </IconButton>
          <SegmentedControl
            etiqueta="Plazo"
            valor={seg}
            onChange={setSeg}
            opciones={["0", "30", "60", "90", "180"].map((v) => ({ valor: v, etiqueta: v === "0" ? "Hoy" : `${v} d` }))}
          />
          <SegmentedControl etiqueta="Modo" tamano="sm" valor={seg === "0" ? "a" : "b"} onChange={() => {}} opciones={[{ valor: "a", etiqueta: "Simple" }, { valor: "b", etiqueta: "Pro" }]} />
        </div>
      </Bloque>

      <Bloque titulo="Number ticker (interacción firma 1)">
        <div className="flex flex-wrap items-center gap-6">
          <span className="text-hero">
            <NumberTicker texto={`$ ${numero(valor, 2)}`} valor={valor} />
          </span>
          <Button onClick={() => setValor((v) => Math.round((v + (Math.random() - 0.45) * 20) * 100) / 100)}>Cambiar precio</Button>
        </div>
      </Bloque>

      <Bloque titulo="Entradas">
        <div className="grid max-w-3xl gap-5 md:grid-cols-2">
          <MoneyInput etiqueta="Tu plata" valor={monto} onChange={setMonto} tamano="lg" />
          <NumberField etiqueta="TNA" valor={tasa} onChange={setTasa} sufijo="%" decimales={2} />
          <Slider etiqueta="Plazo" valor={slider} onChange={setSlider} min={7} max={365} formato={(v) => `${v} días`} />
        </div>
        <p className="text-chico text-text-2">Probá escribir “1,5M” o “500k” en el monto: {pesos(monto)}</p>
      </Bloque>

      <Bloque titulo="Overlays">
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={() => setSheet(true)}>Abrir sheet</Button>
          <Button onClick={() => toast("Movimiento guardado")}>Mostrar toast</Button>
          <MetricExplainer
            titulo="¿De dónde sale $ 19.726?"
            formula="Intereses = capital × TNA × días ÷ 365"
            pasos={[
              { etiqueta: "Capital", valor: "$ 1.000.000" },
              { etiqueta: "TNA", valor: "24,00 %" },
              { etiqueta: "Días", valor: "30" },
            ]}
            resultado="$ 19.726,03"
            fuente="Ejemplo"
          />
        </div>
        <Sheet abierto={sheet} onCambio={setSheet} titulo="Sheet" descripcion="Desde abajo en mobile, lateral en desktop.">
          <p className="text-text-2">Contenido del sheet. En mobile se cierra arrastrando hacia abajo.</p>
        </Sheet>
      </Bloque>

      <Bloque titulo="Datos">
        <div className="flex flex-wrap items-center gap-4">
          {["bna", "mercadopago", "uala", "belo", "galicia"].map((p) => (
            <ProviderMark key={p} proveedorId={p} />
          ))}
          <EtiquetaMejor />
          <Sparkline valores={[1, 3, 2, 4, 3, 5, 6, 5, 7]} />
          <Sparkline valores={[7, 5, 6, 4, 5, 3, 2]} />
        </div>
        <SourceNote fuentes={[FUENTES.bcra, FUENTES.argentinadatos]} actualizado="2026-11-16T21:41:00.000Z" estado="live" />
        <DataTable
          etiqueta="Ejemplo"
          filas={[
            { id: "a", nombre: "Banco A", tna: 0.24 },
            { id: "b", nombre: "Billetera B", tna: 0.215 },
            { id: "c", nombre: "Fondo C", tna: 0.205 },
          ]}
          columnas={[
            { id: "nombre", encabezado: "Opción", valorOrden: (f) => f.nombre, celda: (f) => <span className="font-medium">{f.nombre}</span> },
            { id: "tna", encabezado: "TNA", alineacion: "derecha", valorOrden: (f) => f.tna, celda: (f) => `${numero(f.tna * 100, 2)} %` },
          ]}
          clave={(f) => f.id}
          esMejor={(_, i) => i === 0}
          ordenPorDefecto={{ columna: "tna", direccion: "desc" }}
          topSticky="top-[64px]"
        />
      </Bloque>

      <Bloque titulo="Gráficos">
        <div className="grid gap-8 lg:grid-cols-2">
          <YieldCurve
            alto={220}
            puntos={[
              { id: "a", x: 12, y: 0.268, etiqueta: "S30N6" },
              { id: "b", x: 58, y: 0.264, etiqueta: "T15E7" },
              { id: "c", x: 100, y: 0.279, etiqueta: "S26F7" },
              { id: "d", x: 163, y: 0.299, etiqueta: "T30A7" },
              { id: "e", x: 224, y: 0.306, etiqueta: "T30J7" },
            ]}
            ajuste={[12, 60, 110, 160, 224].map((x) => ({ x, y: 0.262 + x * 0.0002 }))}
            seleccionado={sel}
            onSeleccionar={setSel}
          />
          <AreaApilada puntos={Array.from({ length: 11 }, (_, i) => ({ x: i, base: 1 + i * 1.2, extra: Math.pow(1.22, i) - 1 }))} formatoY={(v) => `${numero(v, 0)} M`} formatoX={(x) => `${x}a`} alto={220} />
          <div className="flex items-center gap-8">
            <Donut datos={[{ clave: "a", valor: 40 }, { clave: "b", valor: 25 }, { clave: "c", valor: 15 }, { clave: "d", valor: 10 }, { clave: "e", valor: 6 }, { clave: "f", valor: 4 }]} tamano={160} />
            <BarrasMensuales datos={Array.from({ length: 12 }, (_, i) => ({ mes: `m${i}`, valor: 0.02 + (i % 4) * 0.004, proyectado: i > 9 }))} className="max-w-xs" />
          </div>
        </div>
      </Bloque>

      <Bloque titulo="Estados">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-24 w-full" />
          </div>
          <EmptyState titulo="Todavía no cargaste nada." ayuda="Cargá lo que tenés y te mostramos cuánto rinde." accion={<Button variante="primario">Cargar movimiento</Button>} />
          <ErrorState titulo="No pudimos actualizar el dólar cripto." detalle="Mostramos el último dato (18:12)." />
        </div>
      </Bloque>
    </>
  );
}

export function Vitrina() {
  return (
    <ToastProvider>
      <div className="flex flex-col gap-12">
        <Bloque titulo="Color (tokens de DISENO.md §3)">
          <Tokens />
        </Bloque>
        <Interactivos />
      </div>
    </ToastProvider>
  );
}
