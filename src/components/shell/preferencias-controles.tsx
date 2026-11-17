"use client";

import { Moon, Sun } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented";
import { IconButton } from "@/components/ui/button";
import { cambiarModo, cambiarTema, usePreferencias } from "@/lib/preferencias";

/** Toggle Simple/Pro (progressive disclosure): Simple habla en pesos por mes; Pro muestra TEM, TIR y duration. */
export function ToggleModo({ tamano = "sm" }: { tamano?: "sm" | "md" }) {
  const { modo } = usePreferencias();
  return (
    <SegmentedControl
      etiqueta="Nivel de detalle"
      tamano={tamano}
      valor={modo}
      onChange={cambiarModo}
      opciones={[
        { valor: "simple", etiqueta: "Simple" },
        { valor: "pro", etiqueta: "Pro" },
      ]}
    />
  );
}

export function ToggleTema() {
  const { tema } = usePreferencias();
  const siguiente = tema === "dark" ? "light" : "dark";
  return (
    <IconButton aria-label={tema === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} onClick={() => cambiarTema(siguiente)}>
      {/* Ambos íconos en el DOM: el CSS muestra el que corresponde, sin depender de la hidratación. */}
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </IconButton>
  );
}
