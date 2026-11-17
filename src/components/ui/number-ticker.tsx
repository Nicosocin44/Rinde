"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Interacción firma 1: cuando un precio cambia, los dígitos ruedan como un odómetro (solo los que
 * cambian) y la cifra se tiñe de verde o rojo durante 600 ms. Sin parpadeos.
 *
 * Recibe el texto ya formateado (es-AR) y el valor numérico para saber si subió o bajó.
 * Los dígitos se alinean desde la derecha, así una cifra que gana un dígito no desplaza al resto.
 */
export function NumberTicker({ texto, valor, className }: { texto: string; valor: number; className?: string }) {
  const [anterior, setAnterior] = useState(valor);
  const [tono, setTono] = useState<"sube" | "baja" | null>(null);
  const [pulso, setPulso] = useState(0);
  if (valor !== anterior) {
    // Patrón "guardar información de renders anteriores": React lo procesa antes de pintar.
    setAnterior(valor);
    setTono(valor > anterior ? "sube" : "baja");
    setPulso((p) => p + 1);
  }

  const caracteres = [...texto];
  return (
    <span
      key={pulso}
      className={cn("tabular inline-flex whitespace-nowrap", tono === "sube" && "tinte-sube", tono === "baja" && "tinte-baja", className)}
      aria-label={texto}
      role="text"
    >
      {caracteres.map((c, i) => {
        // Clave desde la derecha: la posición de unidades siempre es la misma columna.
        const clave = caracteres.length - i;
        return /\d/.test(c) ? <Digito key={clave} digito={Number(c)} /> : <span key={`s${clave}-${c}`} aria-hidden>{c}</span>;
      })}
    </span>
  );
}

function Digito({ digito }: { digito: number }) {
  // El dígito invisible fija el ancho y el alto exactos (cifras tabulares: todas miden lo mismo).
  return (
    <span aria-hidden className="relative inline-block overflow-hidden">
      <span className="invisible">{digito}</span>
      <span
        className="absolute inset-x-0 top-0 flex flex-col items-center transition-transform duration-[560ms] ease-(--ease-standard)"
        style={{ transform: `translateY(calc(-1lh * ${digito}))` }}
      >
        {"0123456789".split("").map((n) => (
          <span key={n} className="block h-[1lh]">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}
