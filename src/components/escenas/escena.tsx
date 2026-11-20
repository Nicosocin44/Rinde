import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SiNoEntra } from "./si-no-entra";

/**
 * Escena de la historia (componente de servidor): un contenedor alto con un interior pegajoso (sticky)
 * de una pantalla. El movimiento lo pone `director`, un componente de cliente chico que conecta GSAP a
 * este HTML: así React no hidrata el contenido de la escena.
 *
 * Sin JavaScript o antes de hidratar, se ve el estado final (el HTML ya viene armado).
 * Si el contenido no entra en la pantalla (notebooks bajas), la escena fluye sin quedar fija: ver `SiNoEntra`.
 */
export function Escena({
  id,
  etiqueta,
  alto = 220,
  altoMobile,
  fluidoMobile = false,
  director,
  className,
  claseInterior,
  children,
}: {
  id?: string;
  etiqueta: string;
  /** Alto total del contenedor, en % de la pantalla (100 = sin recorrido extra). */
  alto?: number;
  altoMobile?: number;
  /** En mobile, sin interior pegajoso: el contenido fluye y la coreografía se reparte en su recorrido. */
  fluidoMobile?: boolean;
  director: ReactNode;
  className?: string;
  claseInterior?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={etiqueta}
      data-escena
      data-fluido={fluidoMobile ? "true" : undefined}
      className={cn("escena h-(--alto-m) md:h-(--alto)", fluidoMobile && "max-md:h-auto", className)}
      style={{ "--alto": `${alto}svh`, "--alto-m": `${altoMobile ?? alto}svh` } as React.CSSProperties}
    >
      <div className={cn("escena-interior", fluidoMobile && "max-md:static max-md:h-auto max-md:overflow-visible", claseInterior)}>{children}</div>
      <SiNoEntra />
      {director}
    </section>
  );
}
