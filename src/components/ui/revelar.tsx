"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Interacción firma 7: revelado al scrollear. Fundido + 12 px hacia arriba, escalonado cada 40 ms
 * (con `indice`). Una sola vez por elemento.
 */
export function Revelar({ children, indice = 0, className, como: Como = "div" }: { children: ReactNode; indice?: number; className?: string; como?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.visible = "true";
            obs.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <Como
      ref={(el: HTMLElement | null) => {
        ref.current = el;
      }}
      className={cn("revelar", className)}
      style={{ "--i": indice } as React.CSSProperties}
    >
      {children}
    </Como>
  );
}
