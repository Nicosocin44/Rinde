"use client";

import { LayoutGroup, motion } from "motion/react";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type OpcionSegmento<T extends string> = { valor: T; etiqueta: ReactNode; ariaLabel?: string };

/**
 * Control segmentado tipo Apple. Interacción firma 2: el "thumb" viaja con spring-ui (layoutId compartido).
 * Teclado: flechas izquierda/derecha, Inicio y Fin.
 */
export function SegmentedControl<T extends string>({
  opciones,
  valor,
  onChange,
  etiqueta,
  tamano = "md",
  className,
  ancho = "auto",
}: {
  opciones: OpcionSegmento<T>[];
  valor: T;
  onChange: (v: T) => void;
  /** Nombre accesible del grupo. */
  etiqueta: string;
  tamano?: "sm" | "md";
  className?: string;
  ancho?: "auto" | "lleno";
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const indice = Math.max(0, opciones.findIndex((o) => o.valor === valor));

  const mover = (e: KeyboardEvent) => {
    let siguiente = indice;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") siguiente = (indice + 1) % opciones.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") siguiente = (indice - 1 + opciones.length) % opciones.length;
    else if (e.key === "Home") siguiente = 0;
    else if (e.key === "End") siguiente = opciones.length - 1;
    else return;
    e.preventDefault();
    onChange(opciones[siguiente]!.valor);
    refs.current[siguiente]?.focus();
  };

  return (
    <LayoutGroup id={id}>
      <div
        role="radiogroup"
        aria-label={etiqueta}
        onKeyDown={mover}
        className={cn(
          "relative inline-flex items-stretch rounded-(--radius-control) bg-surface-2 p-[3px]",
          ancho === "lleno" && "flex w-full",
          tamano === "sm" ? "h-8" : "h-9",
          className,
        )}
      >
        {opciones.map((o, i) => {
          const activo = o.valor === valor;
          return (
            <button
              key={o.valor}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={activo}
              aria-label={o.ariaLabel}
              tabIndex={activo ? 0 : -1}
              onClick={() => onChange(o.valor)}
              className={cn(
                "relative z-0 flex items-center justify-center rounded-[7px] font-medium whitespace-nowrap",
                ancho === "lleno" && "min-w-0 flex-1",
                "transition-colors duration-(--duration-short) ease-(--ease-standard) focus-visible:outline-offset-0",
                tamano === "sm" ? "px-2.5 text-[13px]" : "px-3.5 text-[14px]",
                activo ? "text-text" : "text-text-2 hover:text-text",
              )}
            >
              {activo && (
                <motion.span
                  layoutId="thumb"
                  className="absolute inset-0 -z-10 rounded-[7px] bg-surface shadow-(--shadow-thumb) dark:bg-[#2a2e35]"
                  transition={{ type: "spring", stiffness: 420, damping: 36, mass: 1 }}
                />
              )}
              <span className="relative">{o.etiqueta}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
