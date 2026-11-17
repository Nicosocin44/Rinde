import Link from "next/link";
import type { EstadoDato, Fuente } from "@/lib/data/types";
import { fechaCorta, hora } from "@/lib/format";
import { cn } from "@/lib/cn";

const ETIQUETA: Record<EstadoDato, string> = {
  live: "En vivo",
  delayed: "Demorado 20 min",
  close: "Cierre",
  stale: "Desactualizado",
  sample: "Datos de ejemplo",
};

/** Interacción firma 9: punto de 6 px con un halo que late cada 2 s (solo "En vivo"). */
export function PuntoVivo({ estado = "live", className }: { estado?: EstadoDato; className?: string }) {
  const color = estado === "live" ? "bg-gain" : estado === "delayed" || estado === "sample" || estado === "stale" ? "bg-warn" : "bg-text-3";
  return (
    <span className={cn("relative inline-flex size-1.5 shrink-0", className)} aria-hidden>
      {estado === "live" && <span className={cn("absolute inset-0 rounded-full animate-pulso", color)} />}
      <span className={cn("relative inline-flex size-1.5 rounded-full", color)} />
    </span>
  );
}

/** Punto + estado: "En vivo" / "Demorado 20 min" / "Cierre 16 nov" / "Datos de ejemplo". */
export function FreshnessBadge({ estado, asOf, className }: { estado: EstadoDato; asOf?: string | null; className?: string }) {
  const texto = estado === "close" && asOf ? `Cierre ${fechaCorta(asOf)}` : estado === "stale" && asOf ? `Último dato: ${fechaCorta(asOf)}` : ETIQUETA[estado];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-micro whitespace-nowrap", (estado === "sample" || estado === "stale") && "text-warn", className)}>
      <PuntoVivo estado={estado} />
      {texto}
    </span>
  );
}

/** Micro: "Fuente: BCRA · ArgentinaDatos · actualizado 18:41". */
export function SourceNote({
  fuentes,
  actualizado,
  estado,
  metodologia = "/metodologia",
  className,
  children,
}: {
  fuentes: Pick<Fuente, "name" | "url">[];
  actualizado?: string | null;
  estado?: EstadoDato;
  metodologia?: string | false;
  className?: string;
  children?: React.ReactNode;
}) {
  const unicas = [...new Map(fuentes.map((f) => [f.name, f])).values()];
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-micro", className)}>
      {estado && <FreshnessBadge estado={estado} asOf={actualizado} />}
      {estado && <span aria-hidden>·</span>}
      <span>
        Fuente:{" "}
        {unicas.map((f, i) => (
          <span key={f.name}>
            {i > 0 && " · "}
            {f.url.startsWith("http") ? (
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-text-2 hover:underline">
                {f.name}
              </a>
            ) : (
              f.name
            )}
          </span>
        ))}
      </span>
      {actualizado && (
        <>
          <span aria-hidden>·</span>
          <span>actualizado {esHoy(actualizado) ? hora(actualizado) : `${fechaCorta(actualizado)}${actualizado.length > 10 ? ` ${hora(actualizado)}` : ""}`}</span>
        </>
      )}
      {children}
      {metodologia && (
        <>
          <span aria-hidden>·</span>
          <Link href={metodologia} className="underline-offset-2 hover:text-text-2 hover:underline">
            ¿Cómo lo calculamos?
          </Link>
        </>
      )}
    </p>
  );
}

function esHoy(iso: string): boolean {
  if (iso.length <= 10) return false;
  return fechaCorta(iso) === fechaCorta(new Date());
}
