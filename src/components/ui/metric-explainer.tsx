"use client";

import dynamic from "next/dynamic";
import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import type { PanelExplicador as Panel } from "./metric-explainer-panel";

export type { PasoFormula } from "./metric-explainer-panel";

const PanelExplicador = dynamic(() => import("./metric-explainer-panel").then((m) => m.PanelExplicador), { ssr: false });

/**
 * "¿De dónde sale este número?": la fórmula escrita y completada con los valores reales, la fuente y un link
 * a /metodologia. Este botón es liviano; el panel (popover o sheet, con Radix) se baja recién al tocarlo.
 */
export function MetricExplainer(props: ComponentProps<typeof Panel>) {
  const [cargado, setCargado] = useState(false);
  if (cargado) return <PanelExplicador {...props} abiertoInicial />;
  return (
    <button
      type="button"
      onClick={() => setCargado(true)}
      onPointerEnter={() => void import("./metric-explainer-panel")}
      className={cn(
        "inline-flex items-center gap-1 text-chico text-text-2 underline decoration-border-strong decoration-dotted underline-offset-4 transition-colors hover:text-text hover:decoration-text-3",
        props.className,
      )}
    >
      {props.etiqueta ?? "¿De dónde sale este número?"}
    </button>
  );
}
