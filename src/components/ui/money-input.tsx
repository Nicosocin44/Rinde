"use client";

import { useId, useState } from "react";
import { interpretarMonto, numero } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Input de dinero: formatea en vivo ($ 1.000.000), acepta "1M", "1,5M" o "500k", sin flechas nativas
 * y con teclado numérico en mobile.
 */
export function MoneyInput({
  valor,
  onChange,
  etiqueta,
  moneda = "$",
  min = 0,
  max = 1e12,
  decimales = 0,
  className,
  tamano = "md",
  ocultarEtiqueta = false,
  id: idExterno,
}: {
  valor: number;
  onChange: (v: number) => void;
  etiqueta: string;
  moneda?: string;
  min?: number;
  max?: number;
  decimales?: number;
  className?: string;
  tamano?: "md" | "lg";
  ocultarEtiqueta?: boolean;
  id?: string;
}) {
  const idInterno = useId();
  const id = idExterno ?? idInterno;
  const [texto, setTexto] = useState<string | null>(null);
  const mostrado = texto ?? (valor ? numero(valor, decimales, 0) : "");

  const alEscribir = (bruto: string) => {
    // Formato en vivo: si es una cifra simple, la mostramos con separadores mientras se escribe.
    const soloCifra = /^[\d.]*$/.test(bruto.replace(/\s/g, ""));
    if (soloCifra) {
      const n = Number(bruto.replace(/[.\s]/g, "") || 0);
      setTexto(n ? numero(n, 0, 0) : "");
      if (Number.isFinite(n)) onChange(Math.min(max, n));
      return;
    }
    setTexto(bruto);
    const n = interpretarMonto(bruto);
    if (n !== null && n >= min) onChange(Math.min(max, n));
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("text-label", ocultarEtiqueta && "sr-only")}>
        {etiqueta}
      </label>
      <div
        className={cn(
          "group flex items-baseline gap-1.5 rounded-(--radius-control) border border-border-strong bg-surface-2 px-3.5 transition-colors",
          "focus-within:border-accent focus-within:bg-surface",
          tamano === "lg" ? "h-14" : "h-11",
        )}
      >
        <span className={cn("self-center text-text-3", tamano === "lg" ? "text-[18px]" : "text-[15px]")}>{moneda}</span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={mostrado}
          onChange={(e) => alEscribir(e.target.value)}
          onBlur={() => setTexto(null)}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            "tabular h-full w-full min-w-0 bg-transparent font-medium text-text outline-none placeholder:text-text-3",
            tamano === "lg" ? "text-[24px] tracking-[-0.02em]" : "text-[16px]",
          )}
          placeholder="0"
        />
      </div>
    </div>
  );
}

/** Input numérico genérico (tasas, años) con sufijo. */
export function NumberField({
  valor,
  onChange,
  etiqueta,
  sufijo,
  min,
  max,
  paso = 1,
  decimales = 2,
  className,
}: {
  valor: number;
  onChange: (v: number) => void;
  etiqueta: string;
  sufijo?: string;
  min?: number;
  max?: number;
  paso?: number;
  decimales?: number;
  className?: string;
}) {
  const id = useId();
  const [texto, setTexto] = useState<string | null>(null);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label">
        {etiqueta}
      </label>
      <div className="flex h-11 items-center gap-2 rounded-(--radius-control) border border-border-strong bg-surface-2 px-3.5 transition-colors focus-within:border-accent focus-within:bg-surface">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={texto ?? numero(valor, decimales, 0)}
          onChange={(e) => {
            setTexto(e.target.value);
            const n = Number(e.target.value.replace(/\./g, "").replace(",", "."));
            if (Number.isFinite(n)) onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)));
          }}
          onBlur={() => setTexto(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const n = valor + (e.key === "ArrowUp" ? paso : -paso);
              onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, Number(n.toFixed(6)))));
              setTexto(null);
            }
          }}
          className="tabular h-full w-full min-w-0 bg-transparent text-[16px] font-medium outline-none"
        />
        {sufijo && <span className="shrink-0 text-chico text-text-3">{sufijo}</span>}
      </div>
    </div>
  );
}
