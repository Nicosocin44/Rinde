import { Escena } from "@/components/escenas/escena";
import { Director } from "./director";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { AlertaDemo } from "./datos";

/**
 * Escena 5 · Alertas. Tres alertas de ejemplo, evaluadas con los datos de hoy, bajan una por una
 * como notificaciones (una por cada tramo de scroll) y quedan apiladas. La que se cumple hoy se marca.
 */
export function EscenaAlertas({ alertas }: { alertas: AlertaDemo[] }) {
  return (
    <Escena
      etiqueta="Alertas"
      alto={200}
      altoMobile={190}
      director={<Director coreografia="alertas" comienzo="top 55%" />}
      claseInterior="flex flex-col"
    >
      <div className="flex h-full flex-col justify-start gap-6 pt-[92px] pb-28 md:grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-center md:gap-16 md:pt-24 md:pb-14">
        <div data-titulo className="flex flex-col gap-3 md:gap-5">
          <h2 className="text-h1 text-balance max-md:text-[36px]">Te avisamos antes.</h2>
          <p className="max-w-[40ch] text-[15px] leading-[22px] text-text-2 md:text-[18px] md:leading-[28px]">
            Si el dólar pasa un valor, si una billetera sube la tasa o si una letra rinde más que el plazo fijo. Vos ponés la condición; nosotros miramos el mercado.
          </p>
          <p className="text-micro md:hidden">Alertas de ejemplo, evaluadas con los datos reales de este momento.</p>
          <div className="mt-1">
            <ButtonLink href="/alertas" variante="primario" tamano="md" flecha>
              Crear una alerta
            </ButtonLink>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:gap-4">
          <ul className="flex flex-col gap-2.5 md:gap-3.5" aria-label="Alertas de ejemplo, evaluadas con los datos de hoy">
            {alertas.map((a) => (
              <li
                key={a.id}
                data-aviso
                className={cn(
                  "flex items-start gap-3.5 rounded-(--radius-card) border p-4 shadow-[0_22px_50px_-28px_rgba(0,0,0,0.45)] will-change-transform md:gap-4 md:p-5",
                  a.cumplida ? "sobre-color border-transparent bg-verde" : "border-border bg-surface",
                )}
              >
                <span aria-hidden className={cn("mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[11px] font-display text-[17px] font-extrabold", a.cumplida ? "bg-tinta text-papel" : "bg-inverse text-on-inverse")}>
                  r
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center justify-between gap-3 text-[12px] font-semibold text-text-3">
                    <span>Alerta</span>
                    <span>{a.cumplida ? "ahora" : "vigilando"}</span>
                  </p>
                  <p className="mt-0.5 text-[15px] leading-[20px] font-semibold text-pretty md:text-[16px] md:leading-[22px]">{a.texto}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-text-2 md:text-[14px]">
                    {a.cumplida ? (
                      <span data-marca className="inline-flex items-center gap-1.5 rounded-full bg-tinta px-2 py-0.5 text-[12px] font-semibold text-papel">
                        Se cumple hoy
                      </span>
                    ) : (
                      <span>Todavía no.</span>
                    )}
                    {a.actual && <span className="tabular-nums">Hoy: {a.actual}</span>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-micro max-md:hidden">Alertas de ejemplo, evaluadas con los datos reales de este momento.</p>
        </div>
      </div>
    </Escena>
  );
}
