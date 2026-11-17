"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useShell } from "./shell-context";

/**
 * Encabezado de página: título grande estilo iOS que, en mobile, se colapsa a la barra superior al scrollear.
 */
export function PageHeader({
  titulo,
  bajada,
  acciones,
  eyebrow,
  className,
}: {
  titulo: string;
  bajada?: ReactNode;
  acciones?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { setTituloCompacto } = useShell();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setTituloCompacto(e && !e.isIntersecting && e.boundingClientRect.top < 0 ? titulo : null), {
      rootMargin: "-52px 0px 0px 0px",
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      setTituloCompacto(null);
    };
  }, [titulo, setTituloCompacto]);

  return (
    <div className={cn("flex flex-col gap-4 pt-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:pt-14", className)}>
      <div className="flex min-w-0 flex-col gap-2 lg:gap-3">
        {eyebrow && <div className="text-chico text-text-3">{eyebrow}</div>}
        <h1 ref={ref} className="text-h1 text-balance">
          {titulo}
        </h1>
        {bajada && <div className="max-w-2xl text-[16px] leading-[24px] text-text-2 text-pretty lg:text-[17px] lg:leading-[26px]">{bajada}</div>}
      </div>
      {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
    </div>
  );
}
