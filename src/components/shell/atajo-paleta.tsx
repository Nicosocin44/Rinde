"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useShell } from "./shell-context";

const CommandPalette = dynamic(() => import("./command-palette").then((m) => m.CommandPalette), { ssr: false });

/**
 * Atajo ⌘K liviano: escucha el teclado y recién la primera vez que se abre baja la paleta (Radix + Motion).
 * Así la paleta no pesa en la carga inicial.
 */
export function AtajoPaleta() {
  const { paletaAbierta, setPaletaAbierta } = useShell();
  const [montada, setMontada] = useState(false);
  if (paletaAbierta && !montada) setMontada(true);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletaAbierta(true);
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [setPaletaAbierta]);

  return montada ? <CommandPalette /> : null;
}
