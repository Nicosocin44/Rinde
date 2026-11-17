"use client";

import { ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { MoneyInput } from "@/components/ui/money-input";
import type { CotizacionDolar } from "@/lib/data/types";
import { dolares, pesos } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Conversor pesos ↔ dólares con todos los tipos de cambio a la vez (así se ve la diferencia). */
export function Conversor({ cotizaciones }: { cotizaciones: CotizacionDolar[] }) {
  const [direccion, setDireccion] = useState<"a-dolares" | "a-pesos">("a-dolares");
  const [monto, setMonto] = useState(direccion === "a-dolares" ? 1_000_000 : 1000);
  const tipos = cotizaciones.filter((c) => c.id !== "mayorista");
  const resultados = tipos.map((c) => {
    // A dólares: cuántos comprás (al precio de venta). A pesos: cuánto recibís al vender (al de compra, si existe).
    const precio = direccion === "a-dolares" ? c.venta : (c.compra ?? c.venta);
    return { c, precio, resultado: direccion === "a-dolares" ? monto / precio : monto * precio };
  });
  const mejor = direccion === "a-dolares" ? Math.max(...resultados.map((r) => r.resultado)) : Math.max(...resultados.map((r) => r.resultado));

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-16">
      <div className="flex flex-col gap-4">
        <MoneyInput
          etiqueta={direccion === "a-dolares" ? "Tenés en pesos" : "Tenés en dólares"}
          moneda={direccion === "a-dolares" ? "$" : "US$"}
          valor={monto}
          onChange={setMonto}
          tamano="lg"
          decimales={direccion === "a-dolares" ? 0 : 2}
        />
        <button
          type="button"
          onClick={() => {
            setDireccion((d) => (d === "a-dolares" ? "a-pesos" : "a-dolares"));
            setMonto(direccion === "a-dolares" ? 1000 : 1_000_000);
          }}
          className="inline-flex items-center gap-2 self-start text-chico font-medium text-accent"
        >
          <ArrowUpDown className="size-4" />
          {direccion === "a-dolares" ? "Pasar de dólares a pesos" : "Pasar de pesos a dólares"}
        </button>
        <p className="text-chico text-text-2">
          {direccion === "a-dolares" ? "Calculamos con el precio al que comprás cada dólar." : "Calculamos con el precio al que vendés cada dólar (en la tarjeta no se puede vender)."}
        </p>
      </div>
      <ul className="border-t border-border">
        {resultados.map(({ c, precio, resultado }) => (
          <li key={c.id} className="flex items-center justify-between gap-4 border-b border-border py-4">
            <div>
              <p className="text-[16px] font-medium">{c.nombre}</p>
              <p className="tabular text-chico text-text-3">a {pesos(precio, 2)}</p>
            </div>
            <p className={cn("tabular text-[22px] font-medium tracking-[-0.02em]", resultado === mejor ? "text-text" : "text-text-2")}>
              {direccion === "a-dolares" ? dolares(resultado) : pesos(resultado)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
