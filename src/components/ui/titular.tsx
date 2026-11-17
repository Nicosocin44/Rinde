import { createElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Titular animado: cada palabra sube y se enfoca, escalonada (70 ms entre palabras).
 * Acepta saltos de línea con "\n". El texto completo queda accesible para lectores de pantalla.
 */
export function Titular({ texto, como = "h1", className, destacar }: { texto: string; como?: "h1" | "h2" | "p"; className?: string; destacar?: string[] }) {
  let i = 0;
  const lineas = texto.split("\n");
  const contenido: ReactNode = lineas.map((linea, l) => (
    <span key={l} className="block">
      {linea.split(" ").map((palabra, p) => {
        const indice = i++;
        const marcada = destacar?.some((d) => palabra.toLowerCase().includes(d.toLowerCase()));
        return (
          <span key={p} aria-hidden className={cn("palabra", marcada && "text-sol")} style={{ "--i": indice } as React.CSSProperties}>
            {palabra}
            {p < linea.split(" ").length - 1 ? " " : ""}
          </span>
        );
      })}
    </span>
  ));
  return createElement(
    como,
    { className },
    <>
      <span className="sr-only">{texto.replace(/\n/g, " ")}</span>
      {contenido}
    </>,
  );
}
