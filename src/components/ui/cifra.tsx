import { partes, SIN_DATO } from "@/lib/format";
import { cn } from "@/lib/cn";
import { NumberTicker } from "./number-ticker";

/**
 * Cifra compuesta: el signo de moneda más chico y alineado arriba. En las cifras grandes (compuesta), el signo,
 * la coma y los decimales van del mismo color que el número (pedido de los fundadores, 18/11/2026).
 * En las chicas (compuesta={false}) el signo y los decimales se atenúan, salvo con `uniforme`.
 * Ej.: <Cifra valor={1584.99} /> → $ 1.584,99 con "$" al 60 %.
 */
export function Cifra({
  valor,
  moneda = "$",
  decimales = 2,
  animado = false,
  sufijo,
  className,
  claseDecimales,
  compuesta = true,
  uniforme = false,
}: {
  valor: number | null | undefined;
  moneda?: string | null;
  decimales?: number;
  /** Usa el number ticker (requiere JS; para valores que se actualizan). */
  animado?: boolean;
  sufijo?: string;
  className?: string;
  claseDecimales?: string;
  /** false para tamaños chicos: el signo va en línea y del mismo tamaño. */
  compuesta?: boolean;
  /** En cifras chicas, true deja el signo y los decimales del mismo color que el número. Las grandes ya son así. */
  uniforme?: boolean;
}) {
  const atenuar = !compuesta && !uniforme;
  const p = valor === null || valor === undefined ? null : partes(valor, decimales);
  if (!p) return <span className={cn("tabular text-text-3", className)}>{SIN_DATO}</span>;
  const entero = `${p.negativo ? "−" : ""}${p.entero}`;
  return (
    <span className={cn("tabular inline-flex items-baseline whitespace-nowrap", className)}>
      {moneda &&
        (compuesta ? (
          <span className="mr-[0.14em] self-start pt-[0.12em] text-[0.6em] leading-none font-medium">{moneda}</span>
        ) : (
          <span className={cn("mr-[0.25em]", atenuar && "text-text-2")}>{moneda}</span>
        ))}
      {animado ? <NumberTicker texto={entero} valor={valor ?? 0} /> : <span>{entero}</span>}
      {decimales > 0 && (
        <span className={cn(atenuar && "text-text-2", claseDecimales)}>
          {animado ? <NumberTicker texto={`,${p.decimal}`} valor={valor ?? 0} /> : `,${p.decimal}`}
        </span>
      )}
      {sufijo && <span className="ml-[0.2em] text-[0.5em] font-medium text-text-2">{sufijo}</span>}
    </span>
  );
}

/** Porcentaje grande: "24,5" + "%" chico. Recibe fracción. */
export function CifraPorcentaje({ fraccion, decimales = 1, className, sufijo }: { fraccion: number | null | undefined; decimales?: number; className?: string; sufijo?: string }) {
  const p = fraccion === null || fraccion === undefined ? null : partes(fraccion * 100, decimales);
  if (!p) return <span className={cn("tabular text-text-3", className)}>{SIN_DATO}</span>;
  return (
    <span className={cn("tabular inline-flex items-baseline whitespace-nowrap", className)}>
      <span>
        {p.negativo ? "−" : ""}
        {p.entero}
      </span>
      {decimales > 0 && <span>,{p.decimal}</span>}
      <span className="ml-[0.08em] text-[0.55em] font-medium">%</span>
      {sufijo && <span className="ml-[0.3em] text-[0.4em] font-medium tracking-normal text-text-2">{sufijo}</span>}
    </span>
  );
}
