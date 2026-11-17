"use client";

import * as Popover from "@radix-ui/react-popover";
import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useEsDesktop } from "@/lib/use-media";
import { cn } from "@/lib/cn";
import { Sheet } from "./sheet";

export type PasoFormula = { etiqueta: string; valor: string };

/**
 * "¿De dónde sale este número?": la fórmula escrita y COMPLETADA con los valores reales,
 * la fuente y un link a /metodologia. Popover en desktop, sheet en mobile. Es parte de la identidad.
 */
export function PanelExplicador({
  titulo,
  formula,
  pasos,
  resultado,
  fuente,
  ancla = "/metodologia",
  children,
  className,
  etiqueta = "¿De dónde sale este número?",
  abiertoInicial = false,
}: {
  titulo: string;
  /** La fórmula en palabras: "Ganancia = monto × ((1 + TEA)^(días/365) − 1)". */
  formula: string;
  /** Cada término con su valor real. */
  pasos: PasoFormula[];
  /** El resultado, ya formateado. */
  resultado: string;
  fuente: string;
  ancla?: string;
  children?: ReactNode;
  className?: string;
  etiqueta?: string;
  abiertoInicial?: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const esDesktop = useEsDesktop();

  const contenido = (
    <div className="flex flex-col gap-4">
      <p className="rounded-(--radius-control) bg-surface-2 px-3 py-2.5 font-mono text-[12.5px] leading-[20px] text-text">{formula}</p>
      <dl className="flex flex-col">
        {pasos.map((p) => (
          <div key={p.etiqueta} className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0">
            <dt className="text-chico text-text-2">{p.etiqueta}</dt>
            <dd className="tabular text-chico font-medium">{p.valor}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-baseline justify-between gap-4 border-t border-border-strong pt-3">
        <span className="text-chico font-medium">Resultado</span>
        <span className="tabular text-[17px] font-medium">{resultado}</span>
      </div>
      {children}
      <p className="text-micro">
        Fuente: {fuente}.{" "}
        <Link href={ancla} className="underline underline-offset-2 hover:text-text-2">
          Ver la metodología completa
        </Link>
      </p>
    </div>
  );

  const disparador = (
    <button
      type="button"
      onClick={esDesktop ? undefined : () => setAbierto(true)}
      className={cn(
        "inline-flex items-center gap-1 text-chico text-text-2 underline decoration-border-strong decoration-dotted underline-offset-4 transition-colors hover:text-text hover:decoration-text-3",
        className,
      )}
    >
      {etiqueta}
    </button>
  );

  if (!esDesktop) {
    return (
      <>
        {disparador}
        <Sheet abierto={abierto} onCambio={setAbierto} titulo={titulo} lado="abajo">
          {contenido}
        </Sheet>
      </>
    );
  }

  return (
    <Popover.Root open={abierto} onOpenChange={setAbierto}>
      <Popover.Trigger asChild>{disparador}</Popover.Trigger>
      <AnimatePresence>
        {abierto && (
          <Popover.Portal forceMount>
            <Popover.Content asChild forceMount side="top" align="start" sideOffset={10} collisionPadding={16}>
              <m.div
                className="z-50 w-[380px] rounded-(--radius-card) border border-border bg-surface p-5 shadow-(--shadow-overlay)"
                initial={{ opacity: 0, scale: 0.98, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                style={{ transformOrigin: "var(--radix-popover-content-transform-origin)" }}
              >
                <p className="mb-3 text-[15px] font-semibold">{titulo}</p>
                {contenido}
              </m.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}
