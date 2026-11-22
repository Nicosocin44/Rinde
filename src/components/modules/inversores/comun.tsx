import { Cifra } from "@/components/ui/cifra";
import { ProviderMark } from "@/components/ui/provider-mark";
import { iniciales, tickerLogo, type Inversor, type Posicion } from "@/lib/inversores/datos";
export { etiquetaTrimestre } from "@/lib/inversores/datos";
import { fechaCorta, pesosCompacto } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Monograma del inversor (sin fotos, como las marcas del resto del sitio). */
export function MarcaInversor({ inversor, tamano = 40, className }: { inversor: Inversor; tamano?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[-0.01em]", inversor.grupo === "argentina" ? "bg-accent/12 text-accent" : "bg-surface-2 text-text", className)}
      style={{ width: tamano, height: tamano, fontSize: tamano >= 56 ? 20 : tamano >= 40 ? 14 : 12 }}
    >
      {iniciales(inversor)}
    </span>
  );
}

/** Logos de las primeras posiciones, encimados. */
export function LogosPosiciones({ posiciones, cantidad = 4 }: { posiciones: Posicion[]; cantidad?: number }) {
  return (
    <span className="flex -space-x-1.5">
      {posiciones.slice(0, cantidad).map((p) => (
        <ProviderMark key={p.cusip} activo={tickerLogo(p)} sigla={(p.ticker ?? p.nombre).slice(0, 2)} tamano={28} className="ring-2 ring-surface" />
      ))}
    </span>
  );
}

export const montoUsd = (x: number) => pesosCompacto(x, "US$");

/** Monto grande en dólares: en millones o, desde mil millones, en miles de millones (así entra en 375 px). */
export function CifraMonto({ valor, className }: { valor: number; className?: string }) {
  const grande = valor >= 1e9;
  return <Cifra valor={grande ? valor / 1e9 : valor / 1e6} moneda="US$" decimales={grande ? 1 : 0} sufijo={grande ? "mil millones" : "millones"} className={cn("text-hero max-sm:text-[52px]", className)} />;
}

/** "Cartera al 30 sep 2026 · informada el 14 nov 2026". */
export function fechasInforme(t: { periodo: string; presentado: string }): string {
  return `Cartera al ${fechaCorta(t.periodo, true)} · informada el ${fechaCorta(t.presentado, true)}`;
}

/** Lo que el 13F muestra y lo que no, y que no es una recomendación (siempre a la vista). */
export function AvisoInversores({ className }: { className?: string }) {
  return (
    <div role="note" className={cn("max-w-3xl border-l-2 border-border-strong pl-4 text-chico text-text-2", className)}>
      <p>
        Información pública de la SEC (formulario 13F), que los fondos de EE.UU. con más de US$ 100 millones presentan cada trimestre, hasta 45 días después del cierre. Muestra
        solo acciones y ETF que cotizan en EE.UU. y que el fondo tiene compradas: no incluye bonos, acciones que cotizan solo en BYMA, ventas en corto ni opciones.
      </p>
      <p className="mt-2">No es una recomendación de inversión. Rinde no está relacionado con estos inversores.</p>
    </div>
  );
}
