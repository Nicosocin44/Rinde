"use client";

import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { resolverProveedor } from "@data/ar/proveedores";
import { MetricExplainer } from "@/components/ui/metric-explainer";
import { MoneyInput } from "@/components/ui/money-input";
import { ProviderMark } from "@/components/ui/provider-mark";
import { SegmentedControl } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/estados";
import type { OpcionPesos } from "@/lib/data/types";
import { numero, pesos, pesosCompacto, porcentaje } from "@/lib/format";
import { diasDeCalculo, dondeRindeMas, type OpcionComparador, type PlazoWidget } from "@/lib/rankings/pesos";
import { cn } from "@/lib/cn";

const PLAZOS: { valor: `${PlazoWidget}`; etiqueta: string; ariaLabel: string }[] = [
  { valor: "0", etiqueta: "Hoy", ariaLabel: "Disponible hoy mismo" },
  { valor: "30", etiqueta: "30 d", ariaLabel: "30 días" },
  { valor: "60", etiqueta: "60 d", ariaLabel: "60 días" },
  { valor: "90", etiqueta: "90 d", ariaLabel: "90 días" },
  { valor: "180", etiqueta: "180 d", ariaLabel: "180 días" },
];

const TIPO: Record<OpcionPesos["tipo"], string> = {
  billetera: "Billetera",
  cuenta: "Cuenta remunerada",
  fci: "Fondo de dinero",
  plazo_fijo: "Plazo fijo",
  caucion: "Caución",
  lecap: "Letra del Tesoro",
};

const LIQUIDEZ: Record<OpcionPesos["liquidez"], string> = {
  inmediata: "Al instante",
  "24hs": "En 24 h",
  al_vencimiento: "Al vencimiento",
  mercado: "Vendible en el mercado",
};

/**
 * "¿Dónde rinde más tu plata?": monto + plazo + liquidez → top 5 con "ganás $X en el período".
 * La feature estrella. El orden sale solo de la ganancia en pesos (ver lib/rankings/pesos.ts).
 */
export function DondeRinde({ opciones, montoInicial = 1_000_000, compacto = false }: { opciones: OpcionComparador[]; montoInicial?: number; compacto?: boolean }) {
  const [monto, setMonto] = useState(montoInicial);
  const [plazo, setPlazo] = useState<PlazoWidget>(30);
  const [soloLiquidez, setSoloLiquidez] = useState(false);
  // El reordenamiento animado (FLIP) se activa recién con la primera interacción: en la carga no mide nada.
  const [animar, setAnimar] = useState(false);
  const inicial = monto === montoInicial && plazo === 30 && !soloLiquidez;
  if (!inicial && !animar) setAnimar(true);

  const resultados = useMemo(() => dondeRindeMas(opciones, { monto, plazo, soloLiquidez }), [opciones, monto, plazo, soloLiquidez]);
  const dias = diasDeCalculo(plazo);
  const mejor = resultados[0];
  const peor = resultados[resultados.length - 1];
  const textoPeriodo = plazo === 0 ? "por mes" : `en ${dias} días`;

  return (
    <div className="flex flex-col gap-6" data-testid="donde-rinde">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end lg:grid-cols-[minmax(0,320px)_auto_auto] lg:gap-4">
        <MoneyInput valor={monto} onChange={setMonto} etiqueta="Tu plata" tamano="lg" id="monto-rinde" />
        <div className="flex flex-col gap-1.5">
          <span className="text-label" id="plazo-rinde">
            ¿Por cuánto tiempo?
          </span>
          <SegmentedControl
            etiqueta="Plazo"
            valor={`${plazo}` as `${PlazoWidget}`}
            onChange={(v) => setPlazo(Number(v) as PlazoWidget)}
            opciones={PLAZOS}
            ancho="lleno"
            className="h-14 sm:min-w-[360px] [&_button]:text-[15px]"
          />
        </div>
        <label className="flex h-11 cursor-pointer items-center gap-3 self-end lg:h-14 text-[15px] text-text-2 select-none sm:col-span-2 lg:col-span-1">
          <span
            role="switch"
            aria-checked={soloLiquidez}
            aria-label="Necesito sacarla cuando quiera"
            tabIndex={0}
            onClick={() => setSoloLiquidez((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setSoloLiquidez((v) => !v);
              }
            }}
            className={cn("relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-(--duration-short)", soloLiquidez ? "bg-accent" : "bg-surface-2 ring-1 ring-border-strong ring-inset")}
          >
            <span className={cn("absolute top-[3px] left-0 size-5 rounded-full bg-white shadow-(--shadow-thumb) transition-transform duration-(--duration-short) ease-(--ease-standard)", soloLiquidez ? "translate-x-[21px]" : "translate-x-[3px]")} />
          </span>
          <span onClick={() => setSoloLiquidez((v) => !v)}>Necesito sacarla cuando quiera</span>
        </label>
      </div>

      {resultados.length === 0 || !mejor ? (
        <EmptyState titulo="No hay opciones para esa combinación." ayuda="Probá con otro plazo o sin la condición de liquidez." />
      ) : (
        <div className="flex flex-col">
          <p className="mb-5 max-w-3xl text-[17px] leading-[26px] text-text-2 text-pretty lg:text-[19px] lg:leading-[28px]" aria-live="polite">
            Con <span className="tabular font-medium text-text">{pesos(monto)}</span>, lo que más rinde {plazo === 0 ? "con la plata disponible" : `a ${dias} días`} es{" "}
            <span className="font-medium text-text">{mejor.opcion.nombre}</span>: ganás{" "}
            <span className="tabular font-medium text-text">{pesos(mejor.ganancia)}</span>
            {plazo === 0 ? " por mes" : ""}
            {peor && peor !== mejor && peor.ganancia < mejor.ganancia ? (
              <>
                , <span className="tabular">{pesos(mejor.ganancia - peor.ganancia, 0)}</span> más que la {["", "primera", "segunda", "tercera", "cuarta", "quinta"][resultados.length]} opción.
              </>
            ) : (
              "."
            )}
          </p>

          <ol className="flex flex-col border-t border-border">
            <AnimatePresence initial={false} mode="popLayout">
              {resultados.map((r, i) => (
                <m.li
                  key={r.opcion.id}
                  layout={animar ? "position" : false}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ type: "spring", stiffness: 420, damping: 36, mass: 1 }}
                  className={cn("relative border-b border-border", i === 0 && "bg-accent-soft")}
                >
                  <FilaResultado r={r} posicion={i + 1} mejor={i === 0} textoPeriodo={textoPeriodo} compacto={compacto} />
                </m.li>
              ))}
            </AnimatePresence>
          </ol>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <MetricExplainer
              titulo={`¿De dónde sale ${pesos(mejor.ganancia)}?`}
              formula="Ganancia = monto × ((1 + TEA)^(días / 365) − 1)"
              pasos={[
                { etiqueta: "Monto", valor: pesos(mejor.superaTope && mejor.opcion.tope ? mejor.opcion.tope : monto) + (mejor.superaTope ? " (hasta el tope)" : "") },
                { etiqueta: `TNA de ${mejor.opcion.nombre}`, valor: porcentaje(mejor.opcion.tna, 2) },
                {
                  etiqueta: mejor.opcion.plazoDias ? `TEA (renovando cada ${mejor.opcion.plazoDias} días)` : "TEA (con capitalización diaria)",
                  valor: porcentaje(mejor.opcion.tea, 2),
                },
                { etiqueta: "Días", valor: numero(dias, 0) },
              ]}
              resultado={pesos(mejor.ganancia)}
              fuente={mejor.opcion.fuenteId === "cnv" ? "CNV vía ArgentinaDatos (variación de la cuotaparte)" : mejor.opcion.fuenteId === "data912" ? "data912 (precios de BYMA)" : "ArgentinaDatos"}
              ancla="/metodologia#donde-rinde"
            />
            <p className="text-micro">Es una comparación, no una recomendación. Las tasas pueden cambiar sin aviso.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function FilaResultado({ r, posicion, mejor, textoPeriodo, compacto }: { r: ReturnType<typeof dondeRindeMas>[number]; posicion: number; mejor: boolean; textoPeriodo: string; compacto: boolean }) {
  const proveedor = resolverProveedor(r.opcion.proveedorId);
  return (
    <div className={cn("grid grid-cols-[20px_28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-3.5 sm:px-4 lg:grid-cols-[24px_28px_minmax(0,1.1fr)_minmax(0,1fr)_96px_128px] lg:gap-x-5 lg:py-4", compacto && "lg:py-3.5")}>
      <span className={cn("tabular text-chico", mejor ? "font-semibold text-accent" : "text-text-3")}>{posicion}</span>
      <ProviderMark proveedorId={r.opcion.proveedorId} sigla={proveedor.sigla} />
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[15px] leading-[20px] font-medium">
          <span className="line-clamp-2 lg:truncate">{r.opcion.nombre}</span>
          {mejor && <span className="shrink-0 rounded-(--radius-chip) bg-accent px-1.5 py-px text-[11px] font-semibold text-on-inverse dark:text-bg">Mejor</span>}
        </p>
        <p className="truncate text-chico text-text-3">
          {TIPO[r.opcion.tipo]} · {r.opcion.plazoDias && r.opcion.tipo !== "lecap" ? `${r.opcion.plazoDias} días` : LIQUIDEZ[r.opcion.liquidez].toLowerCase()}
          {r.superaTope && r.opcion.tope && <span className="text-warn"> · rinde hasta {pesosCompacto(r.opcion.tope)}</span>}
        </p>
      </div>
      {/* Barra comparativa: fina (8 px), radio completo; la mejor en accent, el resto en gris. Se anima con transform. */}
      <div className="col-span-2 col-start-3 row-start-2 h-2 overflow-hidden rounded-full bg-surface-2 lg:col-span-1 lg:col-start-4 lg:row-start-1">
        <div
          className={cn("h-full origin-left rounded-full transition-transform duration-(--duration-base) ease-(--ease-standard)", mejor ? "bg-accent" : "bg-text-3/50")}
          style={{ transform: `scaleX(${Math.max(0.02, r.proporcion)})` }}
        />
      </div>
      <div className="text-right lg:col-start-5">
        <p className="tabular text-[15px] font-medium">{porcentaje(r.opcion.tea, 1)}</p>
        <p className="text-micro">
          <span className="solo-simple">TEA</span>
          <span className="solo-pro tabular">TNA {porcentaje(r.opcion.tna, 1)}</span>
        </p>
      </div>
      <div className="hidden text-right lg:col-start-6 lg:block">
        <p className={cn("tabular text-[17px] font-medium tracking-[-0.01em]", mejor ? "text-text" : "text-text")}>+ {pesos(r.ganancia)}</p>
        <p className="text-micro">{textoPeriodo}</p>
      </div>
      <p className="tabular col-span-2 col-start-3 row-start-3 -mt-0.5 text-chico text-text-2 lg:hidden">
        Ganás <span className="font-medium text-text">{pesos(r.ganancia)}</span> {textoPeriodo}
      </p>
    </div>
  );
}

export function LinkComparador() {
  return (
    <Link href="/pesos" className="text-chico font-medium text-accent hover:underline">
      Ver todas las opciones
    </Link>
  );
}
