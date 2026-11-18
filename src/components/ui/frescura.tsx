import type { EstadoDato, Fuente } from "@/lib/data/types";
import { fechaCorta } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EstadoDiscreto } from "./estado-dato";

const ETIQUETA: Record<EstadoDato, string> = {
  live: "En vivo",
  delayed: "Demorado 20 min",
  close: "Cierre",
  stale: "Desactualizado",
  sample: "Datos de ejemplo",
};

/** Interacción firma 9: punto de 6 px; el halo late una sola vez cuando el punto aparece o llega un dato nuevo (regla: nada en loop). */
export function PuntoVivo({ estado = "live", className }: { estado?: EstadoDato; className?: string }) {
  const color = estado === "live" ? "bg-gain" : estado === "delayed" || estado === "sample" || estado === "stale" ? "bg-warn" : "bg-text-3";
  return (
    <span className={cn("relative inline-flex size-1.5 shrink-0", className)} aria-hidden>
      {estado === "live" && <span className={cn("absolute inset-0 rounded-full animate-pulso", color)} />}
      <span className={cn("relative inline-flex size-1.5 rounded-full", color)} />
    </span>
  );
}

/** Punto + estado con texto: "En vivo" / "Demorado 20 min" / "Cierre 16 nov". Solo donde el estado es el contenido (la escena de fuentes del Inicio); en el resto va `EstadoDiscreto`. */
export function FreshnessBadge({ estado, asOf, className }: { estado: EstadoDato; asOf?: string | null; className?: string }) {
  const texto = estado === "close" && asOf ? `Cierre ${fechaCorta(asOf)}` : estado === "stale" && asOf ? `Último dato: ${fechaCorta(asOf)}` : ETIQUETA[estado];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-micro whitespace-nowrap", (estado === "sample" || estado === "stale") && "text-warn", className)}>
      <PuntoVivo estado={estado} />
      {texto}
    </span>
  );
}

/**
 * Lo que queda al pie de cada dato. Desde el 18/11/2026 (pedido de los fundadores) las fuentes no se escriben en cada
 * pantalla: están en el pie del sitio y en /metodologia. Acá solo queda el estado, discreto: un punto que al tocarlo
 * dice si el dato está demorado o es del cierre, y de qué hora. `fuentes`, `metodologia` y `children` se mantienen para
 * no cambiar cada pantalla, pero ya no se muestran.
 */
export function SourceNote({
  actualizado,
  estado,
  className,
}: {
  fuentes: Pick<Fuente, "name" | "url">[];
  actualizado?: string | null;
  estado?: EstadoDato;
  metodologia?: string | false;
  className?: string;
  children?: React.ReactNode;
}) {
  if (!estado || estado === "live") return null;
  return (
    <p className={cn("flex items-center", className)}>
      <EstadoDiscreto estado={estado} asOf={actualizado} />
    </p>
  );
}
