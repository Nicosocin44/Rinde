"use client";

import { ArrowDown } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Columna<T> = {
  id: string;
  encabezado: ReactNode;
  celda: (fila: T, i: number) => ReactNode;
  /** Si existe, la columna es ordenable. */
  valorOrden?: (fila: T) => number | string | null;
  alineacion?: "izquierda" | "derecha";
  /** "pro": solo en modo Pro. "desktop": solo ≥ 1024 px. */
  solo?: "pro" | "desktop" | "pro-desktop";
  ancho?: string;
  /** Orden inicial al tocar la columna. */
  ordenInicial?: "asc" | "desc";
};

/**
 * DataTable: encabezado pegajoso, labels en mayúsculas text-3, filas de 52 px, sin cebra, hover surface-2,
 * números a la derecha y tabulares, columnas ordenables (flecha que rota), la fila "mejor" con accent-soft.
 * En mobile se convierte en lista (`filaMovil`). Las filas se mueven a su nueva posición al reordenar (FLIP).
 */
export function DataTable<T>({
  filas,
  columnas,
  clave,
  esMejor,
  onClickFila,
  enlace,
  filaMovil,
  orden: ordenControlado,
  onOrden,
  ordenPorDefecto,
  etiqueta,
  vacio,
  resaltada,
  onResaltar,
  className,
}: {
  filas: T[];
  columnas: Columna<T>[];
  clave: (fila: T) => string;
  esMejor?: (fila: T, i: number) => boolean;
  onClickFila?: (fila: T) => void;
  /**
   * Cada fila lleva a una página (por ejemplo, la ficha de un activo). Toda la fila es clickeable, la primera celda es
   * un link de verdad (teclado y lectores de pantalla) y en mobile la fila entera es el link.
   */
  enlace?: (fila: T) => string;
  filaMovil?: (fila: T, i: number) => ReactNode;
  orden?: { columna: string; direccion: "asc" | "desc" } | null;
  onOrden?: (o: { columna: string; direccion: "asc" | "desc" }) => void;
  ordenPorDefecto?: { columna: string; direccion: "asc" | "desc" };
  etiqueta: string;
  vacio?: ReactNode;
  /** Fila resaltada desde afuera (hover sincronizado con un gráfico). */
  resaltada?: string | null;
  onResaltar?: (clave: string | null) => void;
  className?: string;
}) {
  const router = useRouter();
  const [ordenLocal, setOrdenLocal] = useState(ordenPorDefecto ?? null);
  const orden = ordenControlado !== undefined ? ordenControlado : ordenLocal;

  const ordenadas = useMemo(() => {
    if (!orden) return filas;
    const col = columnas.find((c) => c.id === orden.columna);
    if (!col?.valorOrden) return filas;
    const signo = orden.direccion === "asc" ? 1 : -1;
    return [...filas].sort((a, b) => {
      const va = col.valorOrden!(a);
      const vb = col.valorOrden!(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return (typeof va === "string" ? va.localeCompare(String(vb), "es") : va - (vb as number)) * signo;
    });
  }, [filas, columnas, orden]);

  const ordenar = (col: Columna<T>) => {
    if (!col.valorOrden) return;
    const nuevo =
      orden?.columna === col.id
        ? { columna: col.id, direccion: orden.direccion === "asc" ? ("desc" as const) : ("asc" as const) }
        : { columna: col.id, direccion: col.ordenInicial ?? (col.alineacion === "derecha" ? ("desc" as const) : ("asc" as const)) };
    if (onOrden) onOrden(nuevo);
    if (ordenControlado === undefined) setOrdenLocal(nuevo);
  };

  const claseSolo = (c: Columna<T>) =>
    c.solo === "pro" ? "solo-pro" : c.solo === "desktop" ? "hidden lg:table-cell" : c.solo === "pro-desktop" ? "solo-pro hidden lg:table-cell" : "";

  if (filas.length === 0) return <>{vacio ?? null}</>;

  return (
    <div className={className}>
      {/* Desktop / tablet: tabla */}
      <table className={cn("w-full border-collapse text-[15px]", filaMovil && "hidden md:table")} aria-label={etiqueta}>
        {/* El encabezado no queda fijo al bajar: con las barras de arriba escondidas flotaba solo y se encimaba con las
            filas (pedido de Benja, 25/11/2026). */}
        <thead className="bg-bg">
          <tr className="shadow-[inset_0_-1px_0_var(--c-border)]">
            {columnas.map((c) => {
              const activa = orden?.columna === c.id;
              return (
                <th
                  key={c.id}
                  scope="col"
                  aria-sort={activa ? (orden!.direccion === "asc" ? "ascending" : "descending") : undefined}
                  className={cn("h-10 px-3 text-label font-medium first:pl-0 last:pr-0", c.alineacion === "derecha" ? "text-right" : "text-left", claseSolo(c))}
                  style={c.ancho ? { width: c.ancho } : undefined}
                >
                  {c.valorOrden ? (
                    <button
                      type="button"
                      onClick={() => ordenar(c)}
                      className={cn("inline-flex items-center gap-1 transition-colors hover:text-text-2", activa && "text-text-2", c.alineacion === "derecha" && "flex-row-reverse")}
                    >
                      {c.encabezado}
                      <ArrowDown
                        className={cn(
                          "size-3 transition-[transform,opacity] duration-(--duration-short) ease-(--ease-standard)",
                          activa ? "opacity-100" : "opacity-0",
                          activa && orden?.direccion === "asc" && "rotate-180",
                        )}
                      />
                    </button>
                  ) : (
                    c.encabezado
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {ordenadas.map((f, i) => {
              const k = clave(f);
              const mejor = esMejor?.(f, i) ?? false;
              return (
                <m.tr
                  key={k}
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ type: "spring", stiffness: 420, damping: 36, mass: 1 }}
                  onClick={
                    enlace
                      ? (e) => {
                          // Un click en el link de la primera celda ya navega solo.
                          if (!(e.target as HTMLElement).closest("a")) router.push(enlace(f));
                        }
                      : onClickFila
                        ? () => onClickFila(f)
                        : undefined
                  }
                  onPointerEnter={onResaltar ? () => onResaltar(k) : undefined}
                  onPointerLeave={onResaltar ? () => onResaltar(null) : undefined}
                  className={cn(
                    "h-[52px] shadow-[inset_0_-1px_0_var(--c-border)] transition-colors duration-(--duration-micro)",
                    mejor ? "bg-accent-soft" : "hover:bg-surface-2/60",
                    resaltada === k && !mejor && "bg-surface-2/60",
                    (onClickFila || enlace) && "cursor-pointer",
                  )}
                >
                  {columnas.map((c, j) => (
                    <td key={c.id} className={cn("px-3 py-2 first:pl-3 last:pr-3", c.alineacion === "derecha" && "tabular text-right", claseSolo(c))}>
                      {enlace && j === 0 ? (
                        <Link href={enlace(f)} className="rounded-(--radius-chip) outline-offset-4 hover:underline hover:decoration-border-strong hover:underline-offset-4">
                          {c.celda(f, i)}
                        </Link>
                      ) : (
                        c.celda(f, i)
                      )}
                    </td>
                  ))}
                </m.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>

      {/* Mobile: lista con las dos métricas clave por fila. */}
      {filaMovil && (
        <ul className="flex flex-col border-t border-border md:hidden" aria-label={etiqueta}>
          <AnimatePresence initial={false}>
            {ordenadas.map((f, i) => (
              <m.li
                key={clave(f)}
                layout="position"
                transition={{ type: "spring", stiffness: 420, damping: 36, mass: 1 }}
                className={cn("border-b border-border", esMejor?.(f, i) && "bg-accent-soft")}
              >
                {enlace ? (
                  <Link href={enlace(f)} className="presionable block w-full px-3 py-3 text-left">
                    {filaMovil(f, i)}
                  </Link>
                ) : onClickFila ? (
                  <button type="button" onClick={() => onClickFila(f)} className="presionable block w-full px-3 py-3 text-left">
                    {filaMovil(f, i)}
                  </button>
                ) : (
                  <div className="px-3 py-3">{filaMovil(f, i)}</div>
                )}
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

/** Etiqueta "Mejor" para la fila destacada. */
export function EtiquetaMejor() {
  return <span className="shrink-0 rounded-(--radius-chip) bg-accent px-1.5 py-px text-[11px] font-semibold text-on-inverse dark:text-bg">Mejor</span>;
}
