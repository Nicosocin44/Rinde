import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Seccion = { id: string; titulo: string; contenido: ReactNode };

/** Documento largo con índice lateral pegajoso (desktop). Tipografía de lectura: 17/28, ancho de línea cómodo. */
export function Documento({ secciones, className }: { secciones: Seccion[]; className?: string }) {
  return (
    <div className={cn("grid gap-12 pt-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:pt-14", className)}>
      <nav aria-label="En esta página" className="hidden lg:block">
        <ul className="sticky top-[120px] flex flex-col gap-1 border-l border-border">
          {secciones.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-1 pl-4 text-chico text-text-2 transition-colors hover:border-text-3 hover:text-text">
                {s.titulo}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex max-w-[720px] flex-col gap-16">
        {secciones.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-[120px]">
            <h2 className="mb-4 text-h3">{s.titulo}</h2>
            <div className="prosa">{s.contenido}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Fórmula en bloque, monoespaciada y discreta. */
export function Formula({ children }: { children: ReactNode }) {
  return <pre className="my-4 overflow-x-auto rounded-(--radius-control) bg-surface-2 px-4 py-3 font-mono text-[13px] leading-[22px] whitespace-pre-wrap text-text">{children}</pre>;
}
