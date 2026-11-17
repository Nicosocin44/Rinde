import { delta as formatoDelta, puntos, pesosConSigno, SIN_DATO } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Variación con signo y flecha (el cambio nunca se comunica solo con color).
 * `en="tabla"` agrega un fondo al 10 %.
 */
export function Delta({
  valor,
  tipo = "porcentaje",
  decimales,
  en = "texto",
  neutroSiCero = true,
  className,
}: {
  valor: number | null | undefined;
  tipo?: "porcentaje" | "puntos" | "pesos";
  decimales?: number;
  en?: "texto" | "tabla";
  neutroSiCero?: boolean;
  className?: string;
}) {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return <span className={cn("tabular text-text-3", className)}>{SIN_DATO}</span>;
  }
  const umbral = tipo === "pesos" ? 0.5 : 0.00005;
  const direccion = Math.abs(valor) < umbral && neutroSiCero ? 0 : Math.sign(valor);
  const texto = tipo === "puntos" ? puntos(valor, decimales ?? 1) : tipo === "pesos" ? pesosConSigno(valor, decimales ?? 0) : formatoDelta(valor, decimales ?? 2);
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 whitespace-nowrap",
        direccion > 0 && "text-gain",
        direccion < 0 && "text-loss",
        direccion === 0 && "text-text-2",
        en === "tabla" && "rounded-(--radius-chip) px-1.5 py-0.5",
        en === "tabla" && direccion > 0 && "bg-gain/10",
        en === "tabla" && direccion < 0 && "bg-loss/10",
        className,
      )}
    >
      {direccion !== 0 && (
        <span aria-hidden className="text-[0.7em] leading-none">
          {direccion > 0 ? "▲" : "▼"}
        </span>
      )}
      <span>{texto}</span>
      <span className="sr-only">{direccion > 0 ? "sube" : direccion < 0 ? "baja" : "sin cambios"}</span>
    </span>
  );
}
