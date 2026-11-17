"use client";

import { YieldCurve } from "@/components/charts/yield-curve";
import type { Lecap } from "@/lib/data/types";
import { porcentaje } from "@/lib/format";

export function CurvaMini({ letras, ajuste }: { letras: Lecap[]; ajuste: { dias: number; tea: number }[] }) {
  return (
    <YieldCurve
      mini
      alto={150}
      puntos={letras.map((l) => ({ id: l.ticker, x: l.dias, y: l.tea, etiqueta: `${l.ticker} ${porcentaje(l.tea, 1)}` }))}
      ajuste={ajuste.map((p) => ({ x: p.dias, y: p.tea }))}
    />
  );
}
