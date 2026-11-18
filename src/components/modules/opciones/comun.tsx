"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NumberField } from "@/components/ui/money-input";
import { SegmentedControl } from "@/components/ui/segmented";
import type { CadenaOpciones, VencimientoOpciones } from "@/lib/data/types";
import { fechaCorta, fechaLarga, nombreMes } from "@/lib/format";
import { cn } from "@/lib/cn";

const SOLAPAS = [
  { href: "/mercados/opciones", etiqueta: "Cadena" },
  { href: "/mercados/opciones/tasas", etiqueta: "Tasas" },
  { href: "/mercados/opciones/estrategias", etiqueta: "Estrategias" },
];

/** Las tres partes de Opciones: cadena, tasas (lanzamiento cubierto y cajas) y la calculadora de estrategias. */
export function SubnavOpciones() {
  const ruta = usePathname();
  return (
    <nav aria-label="Opciones" className="sin-scrollbar -mx-4 overflow-x-auto px-4">
      <ul className="inline-flex h-11 items-stretch rounded-full bg-surface-2 p-1">
        {SOLAPAS.map((s) => {
          const activa = ruta === s.href;
          return (
            <li key={s.href} className="flex">
              <Link
                href={s.href}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "flex items-center rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition-colors duration-(--duration-short)",
                  activa ? "bg-inverse text-on-inverse" : "text-text-2 hover:text-text",
                )}
              >
                {s.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const CLAVE_VENCIMIENTO = "rinde.opciones.vencimiento";
const CLAVE_COMISION = "rinde.opciones.comision";
/** Comisión + derechos de mercado de referencia (fracción). Cada persona pone la de su broker. */
export const COMISION_INICIAL = 0.005;

/**
 * El vencimiento elegido. Arranca en el de más volumen (el que mira la mayoría) y se recuerda al pasar de una
 * solapa a otra durante la visita.
 */
export function useVencimiento(cadena: CadenaOpciones): [VencimientoOpciones, (fecha: string) => void] {
  const principal = cadena.vencimientos.reduce((m, v) => (v.volumen > m.volumen ? v : m), cadena.vencimientos[0]!);
  const [fecha, setFecha] = useState(principal.fecha);
  useEffect(() => {
    try {
      const guardada = window.sessionStorage.getItem(CLAVE_VENCIMIENTO);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferencia guardada: solo existe en el navegador
      if (guardada && cadena.vencimientos.some((v) => v.fecha === guardada)) setFecha(guardada);
    } catch {
      // Sin almacenamiento: queda el de más volumen.
    }
  }, [cadena.vencimientos]);
  const elegir = (f: string) => {
    setFecha(f);
    try {
      window.sessionStorage.setItem(CLAVE_VENCIMIENTO, f);
    } catch {
      // Nada: solo no se recuerda.
    }
  };
  return [cadena.vencimientos.find((v) => v.fecha === fecha) ?? principal, elegir];
}

/** La comisión de cada persona (comisión + derechos de mercado, en fracción), recordada en su navegador. */
export function useComision(): [number, (c: number) => void] {
  const [comision, setComision] = useState(COMISION_INICIAL);
  useEffect(() => {
    try {
      const guardada = Number(window.localStorage.getItem(CLAVE_COMISION));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferencia guardada: solo existe en el navegador
      if (window.localStorage.getItem(CLAVE_COMISION) !== null && Number.isFinite(guardada) && guardada >= 0 && guardada < 0.05) setComision(guardada);
    } catch {
      // Sin almacenamiento: queda la de referencia.
    }
  }, []);
  const elegir = (c: number) => {
    setComision(c);
    try {
      window.localStorage.setItem(CLAVE_COMISION, String(c));
    } catch {
      // Nada: solo no se recuerda.
    }
  };
  return [comision, elegir];
}

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Título de la sección, cuándo vence y el selector de vencimiento. */
export function EncabezadoVencimiento({ titulo, id, cadena, v, onElegir, children }: { titulo: string; id: string; cadena: CadenaOpciones; v: VencimientoOpciones; onElegir: (f: string) => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-[22px] font-semibold tracking-tight">
          {titulo}
        </h2>
        <p className="text-chico text-text-2">
          Vence el {fechaLarga(v.fecha).toLowerCase()} · {v.dias === 0 ? "hoy" : v.dias === 1 ? "mañana" : `faltan ${v.dias} días`}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {children}
        <div className="sin-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <SegmentedControl
            etiqueta="Vencimiento"
            valor={v.fecha}
            onChange={onElegir}
            opciones={cadena.vencimientos.map((x) => ({ valor: x.fecha, etiqueta: `${mayuscula(nombreMes(x.fecha))} ${x.fecha.slice(8, 10)}`, ariaLabel: `Vencimiento del ${fechaCorta(x.fecha, true)}` }))}
          />
        </div>
      </div>
    </div>
  );
}

/** Campo de comisión (en %, como la pone el broker). */
export function CampoComision({ comision, onChange, className }: { comision: number; onChange: (c: number) => void; className?: string }) {
  return <NumberField etiqueta="Tu comisión + derechos" valor={Math.round(comision * 10000) / 100} onChange={(x) => onChange(Math.max(0, Math.min(4.99, x)) / 100)} sufijo="%" min={0} max={4.99} paso={0.05} decimales={2} className={cn("w-44", className)} />;
}
