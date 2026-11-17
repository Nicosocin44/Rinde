"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import type { Excluido } from "@/lib/data/types";
import { cn } from "@/lib/cn";

/** Bloque desplegable con hairline: "Excluimos N. ¿Por qué?", condiciones especiales, etc. */
export function Desplegable({ titulo, ayuda, children, abiertoInicial = false }: { titulo: string; ayuda?: string; children: ReactNode; abiertoInicial?: boolean }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  return (
    <section className="border-t border-border">
      <button type="button" aria-expanded={abierto} onClick={() => setAbierto(!abierto)} className="flex w-full items-center justify-between gap-4 py-4 text-left">
        <span>
          <span className="block text-[15px] font-medium">{titulo}</span>
          {ayuda && <span className="block text-chico text-text-3">{ayuda}</span>}
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-text-3 transition-transform duration-(--duration-base) ease-(--ease-standard)", abierto && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }} className="pb-4">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function Excluidos({ excluidos, que = "datos" }: { excluidos: Excluido[]; que?: string }) {
  if (excluidos.length === 0) return null;
  return (
    <Desplegable titulo={`Excluimos ${excluidos.length} ${que}. ¿Por qué?`} ayuda="Validamos cada dato antes de mostrarlo: vencidos, desactualizados, fuera de rango o duplicados quedan afuera.">
      <ul className="flex flex-col">
        {excluidos.map((e, i) => (
          <li key={`${e.id}-${i}`} className="flex justify-between gap-4 border-b border-border py-2.5 text-chico last:border-0">
            <span>{e.id}</span>
            <span className="text-right text-text-3">{e.reason}</span>
          </li>
        ))}
      </ul>
    </Desplegable>
  );
}
