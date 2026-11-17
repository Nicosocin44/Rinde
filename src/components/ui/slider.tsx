"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/** Slider: riel de 4 px, thumb de 20 px con sombra mínima, valor flotante al arrastrar. */
export function Slider({
  valor,
  onChange,
  min,
  max,
  paso = 1,
  etiqueta,
  formato = (v) => String(v),
  className,
}: {
  valor: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  paso?: number;
  etiqueta: string;
  formato?: (v: number) => string;
  className?: string;
}) {
  const id = useId();
  const [arrastrando, setArrastrando] = useState(false);
  const pct = ((valor - min) / (max - min)) * 100;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-label">
          {etiqueta}
        </label>
        <span className="tabular text-chico font-medium">{formato(valor)}</span>
      </div>
      <div className="relative flex h-6 items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        {arrastrando && (
          <span
            className="tabular pointer-events-none absolute -top-8 -translate-x-1/2 rounded-(--radius-chip) bg-inverse px-2 py-1 text-[12px] font-medium text-on-inverse"
            style={{ left: `calc(${pct}% + ${10 - pct * 0.2}px)` }}
          >
            {formato(valor)}
          </span>
        )}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={paso}
          value={valor}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={() => setArrastrando(true)}
          onPointerUp={() => setArrastrando(false)}
          onBlur={() => setArrastrando(false)}
          className="rinde-slider relative w-full"
        />
      </div>
    </div>
  );
}
