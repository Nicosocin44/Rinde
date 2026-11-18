"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { LARGO_MAXIMO_GRUPO, normalizarGrupo } from "@/lib/favoritos/grupos";

const NUEVO = "__nuevo__";

const flecha = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2380868f' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

/**
 * Elegir el grupo de un activo que se sigue: los sugeridos, los propios, "Sin grupo" y "Nuevo grupo…", que abre un
 * campo para escribir el nombre. Lo usan la ficha y "Organizar" en Siguiendo.
 */
export function ElegirGrupo({
  valor,
  grupos,
  onCambio,
  etiqueta,
  compacto = false,
  className,
}: {
  valor: string | null;
  grupos: string[];
  onCambio: (grupo: string | null) => void;
  /** Nombre accesible ("Grupo de Nvidia"). */
  etiqueta: string;
  compacto?: boolean;
  className?: string;
}) {
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const alto = compacto ? "h-10 text-[14px]" : "h-11 text-[16px]";

  if (creando) {
    const listo = normalizarGrupo(nombre, grupos);
    return (
      <form
        className={cn("flex min-w-0 items-center gap-1.5", className)}
        onSubmit={(e) => {
          e.preventDefault();
          if (!listo) return;
          onCambio(listo);
          setCreando(false);
          setNombre("");
        }}
      >
        <input
          autoFocus
          value={nombre}
          maxLength={LARGO_MAXIMO_GRUPO}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setCreando(false)}
          placeholder="Nombre del grupo"
          aria-label={`Nombre del grupo nuevo (${etiqueta.toLowerCase()})`}
          className={cn("w-full min-w-0 rounded-(--radius-control) border border-border-strong bg-surface-2 px-3 text-text outline-none focus:border-accent focus:bg-surface", alto)}
        />
        <button type="submit" disabled={!listo} aria-label="Crear grupo" className={cn("grid aspect-square shrink-0 place-items-center rounded-full bg-inverse text-on-inverse disabled:opacity-40", alto)}>
          <Check className="size-4" />
        </button>
        <button type="button" onClick={() => setCreando(false)} aria-label="Cancelar" className={cn("grid aspect-square shrink-0 place-items-center rounded-full text-text-2 hover:bg-surface-2 hover:text-text", alto)}>
          <X className="size-4" />
        </button>
      </form>
    );
  }

  return (
    <select
      aria-label={etiqueta}
      value={valor ?? ""}
      onChange={(e) => (e.target.value === NUEVO ? setCreando(true) : onCambio(e.target.value || null))}
      className={cn(
        "min-w-0 appearance-none rounded-full border border-border-strong bg-surface bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9 pl-4 font-display font-semibold text-text outline-none focus:border-accent",
        alto,
        className,
      )}
      style={{ backgroundImage: flecha }}
    >
      <option value="">Sin grupo</option>
      {grupos.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
      <option value={NUEVO}>+ Nuevo grupo…</option>
    </select>
  );
}
