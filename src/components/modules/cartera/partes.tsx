"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORICOS, Donut } from "@/components/charts/donut";
import { Cifra } from "@/components/ui/cifra";
import { Delta } from "@/components/ui/delta";
import { ProviderMark } from "@/components/ui/provider-mark";
import { SegmentedControl } from "@/components/ui/segmented";
import type { AnalisisCartera } from "@/lib/cartera/valuacion";
import type { PosicionValuada } from "@/lib/calculos";
import { DISCLAIMER_IDEAS, type Idea } from "@/lib/insights/reglas";
import { delta, dinero, dolares, mesAnio, numero, pesos, pesosCompacto, porcentaje, puntos } from "@/lib/format";
import { cn } from "@/lib/cn";

export type Unidad = "ARS" | "USD" | "REAL";

/** La respuesta grande: cuánto vale tu cartera, con la variación del día. */
export function HeroCartera({ a, unidad }: { a: AnalisisCartera; unidad: Unidad }) {
  const valor = unidad === "USD" ? a.totalUsd : unidad === "REAL" ? a.totalReal : a.totalArs;
  return (
    <div className="flex flex-col gap-2" data-testid="total-cartera">
      <Cifra valor={valor} moneda={unidad === "USD" ? "US$" : "$"} decimales={unidad === "USD" ? 2 : 0} className="text-hero" />
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
        {a.variacionDia && unidad !== "REAL" ? (
          <>
            <Delta valor={unidad === "USD" ? a.variacionDia.monto / a.mep : a.variacionDia.monto} tipo="pesos" decimales={unidad === "USD" ? 2 : 0} className="font-medium" />
            <span className="text-text-2">hoy ({delta(a.variacionDia.fraccion, 2)})</span>
          </>
        ) : unidad === "REAL" && a.inicio ? (
          <span className="text-text-2">En pesos de {mesAnio(a.inicio)}, descontada la inflación.</span>
        ) : null}
        {unidad === "USD" && <span className="text-text-2">· al MEP de {pesos(a.mep, 2)}</span>}
      </p>
    </div>
  );
}

/** "¿Le ganaste a la inflación?" y la comparación contra IPC, MEP y plazo fijo. */
export function Comparacion({ a }: { a: AnalisisCartera }) {
  const twr = a.rendimiento.ars?.twr?.toNumber() ?? null;
  const xirr = a.rendimiento.ars?.xirr?.toNumber() ?? null;
  const { ipc, mep, plazoFijo } = a.benchmarks;
  const real = twr !== null && ipc !== null ? (1 + twr) / (1 + ipc) - 1 : null;
  const meses = a.inicio ? Math.max(1, Math.round((Date.parse(a.hoy) - Date.parse(a.inicio)) / (30.44 * 86_400_000))) : 0;
  const filas = [
    { k: "Tu cartera", v: twr, destacado: true },
    { k: "Inflación (IPC)", v: ipc },
    { k: "Dólar MEP", v: mep },
    { k: "Plazo fijo a 30 días", v: plazoFijo },
  ].filter((f) => f.v !== null) as { k: string; v: number; destacado?: boolean }[];
  const max = Math.max(...filas.map((f) => Math.abs(f.v)), 0.0001);

  return (
    <section aria-labelledby="titulo-inflacion" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-16">
      <div className="flex flex-col gap-2">
        <h2 id="titulo-inflacion" className="text-label">
          ¿Le ganaste a la inflación?
        </h2>
        {real !== null ? (
          <>
            <p className="text-h2">{real >= 0 ? `Sí, por ${puntos(real, 1).replace("+", "")}.` : `No, por ${puntos(-real, 1).replace("+", "")}.`}</p>
            <p className="text-text-2">
              En {meses} {meses === 1 ? "mes" : "meses"} tu cartera rindió {porcentaje(twr!, 1)} en pesos y los precios subieron {porcentaje(ipc!, 1)}.
              {xirr !== null && <> Contando cuándo pusiste cada peso, tu plata rindió {porcentaje(xirr, 1)} anual (TIR).</>}
            </p>
          </>
        ) : (
          <p className="text-text-2">Necesitamos al menos un mes de historia para responder.</p>
        )}
      </div>
      <ul className="flex flex-col gap-4 self-end">
        {filas.map((f) => (
          <li key={f.k} className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)_72px] items-center gap-4">
            <span className={cn("truncate text-chico", f.destacado ? "font-medium text-text" : "text-text-2")}>{f.k}</span>
            <span className="h-2 overflow-hidden rounded-full bg-surface-2">
              <span className={cn("block h-full origin-left rounded-full", f.destacado ? "bg-accent" : "bg-text-3/50")} style={{ transform: `scaleX(${Math.max(0.02, Math.abs(f.v) / max)})` }} />
            </span>
            <span className={cn("tabular text-right text-chico", f.destacado ? "font-medium" : "text-text-2")}>{porcentaje(f.v, 1)}</span>
          </li>
        ))}
        <li className="text-micro">Desde {a.inicio ? mesAnio(a.inicio) : "—"}. Tu cartera se mide con TWR (sin el efecto de tus aportes), como un índice.</li>
      </ul>
    </section>
  );
}

export function Distribucion({ a }: { a: AnalisisCartera }) {
  const [vista, setVista] = useState<"tipo" | "moneda">("tipo");
  const [activo, setActivo] = useState<string | null>(null);
  const lista = vista === "tipo" ? a.distribucion.porTipo : a.distribucion.porMoneda;
  // Más de 6 categorías: el resto se agrupa en "Otros".
  const datos = lista.length > 6 ? [...lista.slice(0, 5), { clave: "otros", etiqueta: "Otros", valor: lista.slice(5).reduce((s, x) => s + x.valor, 0), fraccion: lista.slice(5).reduce((s, x) => s + x.fraccion, 0) }] : lista;
  const sel = datos.find((d) => d.clave === activo);
  return (
    <section aria-labelledby="titulo-dist" className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 id="titulo-dist" className="text-h3">
          Distribución
        </h2>
        <SegmentedControl
          etiqueta="Ver distribución por"
          tamano="sm"
          valor={vista}
          onChange={setVista}
          opciones={[
            { valor: "tipo", etiqueta: "Tipo" },
            { valor: "moneda", etiqueta: "Moneda" },
          ]}
        />
      </div>
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
        <Donut
          datos={datos}
          activo={activo}
          onActivo={setActivo}
          centro={
            <>
              <span className="tabular text-[22px] font-medium tracking-[-0.02em]">{sel ? porcentaje(sel.fraccion, 0) : pesosCompacto(a.totalArs)}</span>
              <span className="max-w-[120px] text-micro">{sel ? sel.etiqueta : "total"}</span>
            </>
          }
        />
        <ul className="flex w-full flex-col">
          {datos.map((d, i) => (
            <li
              key={d.clave}
              onPointerEnter={() => setActivo(d.clave)}
              onPointerLeave={() => setActivo(null)}
              className={cn("flex items-center gap-3 border-b border-border py-2.5 transition-opacity last:border-0", activo && activo !== d.clave && "opacity-40")}
            >
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: CATEGORICOS[i % CATEGORICOS.length] }} />
              <span className="min-w-0 flex-1 truncate text-[15px]">{d.etiqueta}</span>
              <span className="tabular text-chico text-text-2">{pesosCompacto(d.valor)}</span>
              <span className="tabular w-12 text-right text-[15px] font-medium">{porcentaje(d.fraccion, 0)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Ideas({ ideas }: { ideas: Idea[] }) {
  if (ideas.length === 0) return null;
  return (
    <section aria-labelledby="titulo-ideas" className="flex flex-col gap-4">
      <h2 id="titulo-ideas" className="text-h3">
        Ideas <span className="tabular text-text-3">({ideas.length})</span>
      </h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {ideas.map((i) => (
          <li key={i.id} className="card flex flex-col gap-2 p-5">
            <p className="text-[16px] leading-[22px] font-semibold tracking-[-0.01em] text-pretty">{i.titulo}</p>
            <p className="text-chico text-text-2 text-pretty">{i.cuenta}</p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
              {i.enlace ? (
                <Link href={i.enlace.href} className="text-chico font-medium text-accent hover:underline">
                  {i.enlace.etiqueta}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-micro">{DISCLAIMER_IDEAS}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Posiciones({ posiciones, total, onElegir }: { posiciones: PosicionValuada[]; total: number; onElegir: (p: PosicionValuada) => void }) {
  return (
    <section aria-labelledby="titulo-pos" className="flex flex-col gap-4">
      <h2 id="titulo-pos" className="text-h3">
        Posiciones
      </h2>
      <ul className="border-t border-border" data-testid="posiciones">
        {posiciones.map((p) => {
          const usd = p.activo.moneda === "USD";
          return (
            <li key={p.activoId}>
              <button type="button" onClick={() => onElegir(p)} className="presionable grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border py-3.5 text-left md:grid-cols-[28px_minmax(0,1fr)_140px_120px_72px] md:gap-x-5">
                <ProviderMark proveedorId={p.activo.proveedorId ?? p.activo.ticker ?? p.activoId} sigla={p.activo.ticker ? p.activo.ticker.slice(0, 2) : undefined} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{p.activo.nombre}</span>
                  <span className="block truncate text-chico text-text-3">
                    {p.activo.ticker ? `${p.activo.ticker} · ` : ""}
                    {cantidadLegible(p)}
                    {p.sinPrecio && <span className="text-warn"> · sin precio: valuado al costo</span>}
                  </span>
                </span>
                <span className="text-right">
                  <span className="tabular block text-[15px] font-medium">{usd ? dolares(p.valor.toNumber()) : pesos(p.valorArs.toNumber())}</span>
                  <span className="tabular block text-micro md:hidden">{porcentaje(p.valorArs.toNumber() / total, 1)} de la cartera</span>
                  {usd && <span className="tabular hidden text-micro md:block">{pesos(p.valorArs.toNumber())}</span>}
                </span>
                <span className="hidden text-right md:block">
                  <Delta valor={p.variacion?.toNumber() ?? null} className="text-chico" />
                  <span className="block text-micro">desde la compra</span>
                </span>
                <span className="tabular hidden text-right text-chico text-text-2 md:block">{porcentaje(p.valorArs.toNumber() / total, 1)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function cantidadLegible(p: PosicionValuada): string {
  const t = p.activo.tipo;
  if (t === "billetera" || t === "plazo_fijo" || t === "fci") return p.activo.tna ? `${porcentaje(p.activo.tna, 1)} TNA` : "Saldo";
  if (t === "efectivo_usd") return "Efectivo";
  if (t === "lecap" || t === "bono" || t === "on") return `${numero(p.cantidad.toNumber(), 0)} nominales`;
  if (t === "cripto") return `${numero(p.cantidad.toNumber(), 6, 0)} ${p.activo.ticker ?? ""}`;
  return `${numero(p.cantidad.toNumber(), 0)} ${p.cantidad.eq(1) ? "unidad" : "unidades"} · costo ${dinero(p.costoPromedio.toNumber(), p.activo.moneda)}`;
}
