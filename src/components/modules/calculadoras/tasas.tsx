"use client";

import { useMemo, useState } from "react";
import { CompartirResultado } from "@/components/ui/compartir";
import { NumberField } from "@/components/ui/money-input";
import { SegmentedControl } from "@/components/ui/segmented";
import { convertirTasa } from "@/lib/calculos";
import { porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";
import { MarcoCalculadora } from "./marco";

type Tipo = "tna" | "tea" | "tem";

const EXPLICACION: Record<Tipo, string> = {
  tna: "Tasa nominal anual: la que publican los bancos. No incluye la reinversión de intereses.",
  tea: "Tasa efectiva anual: lo que rinde en un año si reinvertís los intereses. Sirve para comparar.",
  tem: "Tasa efectiva mensual: lo que rinde en un mes (convención 30/365).",
};

export function ConversorTasas() {
  const [valor, setValor] = useState(24);
  const [tipo, setTipo] = useState<Tipo>("tna");
  const [dias, setDias] = useState(30);
  const r = useMemo(() => convertirTasa(valor / 100, tipo, dias), [valor, tipo, dias]);
  const filas: { t: Tipo; v: number }[] = [
    { t: "tna", v: r.tna.toNumber() },
    { t: "tea", v: r.tea.toNumber() },
    { t: "tem", v: r.tem.toNumber() },
  ];
  return (
    <MarcoCalculadora
      ancla="tasas"
      entradas={
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-label">Tengo una</span>
            <SegmentedControl
              etiqueta="Tipo de tasa"
              ancho="lleno"
              valor={tipo}
              onChange={setTipo}
              opciones={[
                { valor: "tna", etiqueta: "TNA" },
                { valor: "tea", etiqueta: "TEA" },
                { valor: "tem", etiqueta: "TEM" },
              ]}
            />
          </div>
          <NumberField etiqueta="De" valor={valor} onChange={setValor} sufijo="%" min={0} max={1000} paso={0.5} decimales={2} />
          <NumberField etiqueta="Capitalizando cada" valor={dias} onChange={(v) => setDias(Math.max(1, Math.round(v)))} sufijo="días" min={1} max={365} paso={1} decimales={0} />
          <p className="text-micro">Un plazo fijo capitaliza al vencimiento (30 días). Una billetera o un fondo de dinero, todos los días (1).</p>
        </>
      }
      resultado={
        <ul className="border-t border-border" aria-live="polite">
          {filas.map((f) => (
            <li key={f.t} className="flex flex-col gap-1 border-b border-border py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
              <div className="max-w-sm">
                <p className="text-[17px] font-semibold">{f.t.toUpperCase()}</p>
                <p className="text-chico text-text-2">{EXPLICACION[f.t]}</p>
              </div>
              <p className={cn("tabular text-[40px] leading-none font-medium tracking-[-0.03em]", f.t === tipo && "text-text-3")}>{porcentaje(f.v, 2)}</p>
            </li>
          ))}
        </ul>
      }
      pie={<CompartirResultado titulo={`${porcentaje(valor / 100, 2)} ${tipo.toUpperCase()} equivale a`} cifra={`${porcentaje(r.tea.toNumber(), 2)} TEA`} detalle={`${porcentaje(r.tna.toNumber(), 2)} TNA · ${porcentaje(r.tem.toNumber(), 2)} TEM, capitalizando cada ${dias} días.`} nombreArchivo="tasas" />}
    />
  );
}
