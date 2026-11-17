"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Estado compartido del shell:
 *  - el título compacto que aparece en la barra superior mobile cuando el título grande sale de pantalla;
 *  - la paleta ⌘K (abrir/cerrar desde cualquier lado).
 */
type Shell = {
  tituloCompacto: string | null;
  setTituloCompacto: (t: string | null) => void;
  paletaAbierta: boolean;
  setPaletaAbierta: (v: boolean) => void;
  masAbierto: boolean;
  setMasAbierto: (v: boolean) => void;
};

const Contexto = createContext<Shell | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [tituloCompacto, setTituloCompacto] = useState<string | null>(null);
  const [paletaAbierta, setPaletaAbierta] = useState(false);
  const [masAbierto, setMasAbierto] = useState(false);
  const valor = useMemo(
    () => ({ tituloCompacto, setTituloCompacto, paletaAbierta, setPaletaAbierta, masAbierto, setMasAbierto }),
    [tituloCompacto, paletaAbierta, masAbierto],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useShell(): Shell {
  const s = useContext(Contexto);
  if (!s) throw new Error("useShell fuera de ShellProvider");
  return s;
}
