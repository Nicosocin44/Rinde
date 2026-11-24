import { Escena } from "@/components/escenas/escena";
import { Director } from "./director";
import { pesos, porcentaje } from "@/lib/format";
import type { MesMacizo } from "./datos";

/**
 * Escena 6 · Macizo o hueco. El scroll es el tiempo: un contador va del mes 0 al 12 y, mes a mes, la plata
 * quieta pierde poder de compra (queda como un contorno que se achica: hueca) mientras la puesta a rendir
 * se llena (maciza). Todo en pesos de hoy, con la inflación esperada del REM. Cálculos con decimal.js en
 * el servidor; acá solo se interpola entre meses para dibujar.
 */
export function EscenaMacizo({ monto, tea, nombre, inflacion, informeRem, meses }: { monto: number; tea: number; nombre: string; inflacion: number; informeRem: string; meses: MesMacizo[] }) {
  const ultimo = meses.at(-1)!;
  const tope = Math.max(1, ...meses.map((m) => m.rindeReal / monto)) * 1.04;
  const escala = (v: number) => v / monto / tope;
  const diferencia = ultimo.rindeReal - ultimo.quietaReal;

  return (
    <Escena
      etiqueta="Macizo o hueco"
      alto={260}
      fluidoMobile
      className="inversa a-lo-ancho lamina-cerrada mt-16 bg-bg text-text lg:mt-24"
      director={<Director coreografia="macizo" comienzo="top 40%" datos={{ monto, tope, meses }} />}
      claseInterior="flex flex-col"
    >
      <div className="flex h-full flex-col justify-start gap-5 pt-[92px] pb-28 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-16 md:pt-24 md:pb-14">
        <div data-titulo className="flex flex-col gap-3 md:gap-6">
          <h2 className="text-h1 text-balance max-md:text-[36px]">La misma plata, dos destinos.</h2>
          <p className="max-w-[44ch] text-[15px] leading-[22px] text-text-2 md:text-[17px] md:leading-[26px]">
            {pesos(monto, 0)} durante un año. En un caso queda quieta en la cuenta; en el otro, va a {nombre} al {porcentaje(tea, 1)} TEA. Con la inflación que espera el mercado ({porcentaje(inflacion, 1)} en 12 meses), todo en pesos de hoy.
          </p>
          <p className="flex items-baseline gap-3 max-md:hidden" aria-hidden>
            <span data-mes className="text-gigante">
              {meses.length - 1}
            </span>
            <span className="font-display text-[28px] font-bold tracking-[-0.02em]">meses después</span>
          </p>
        </div>

        <div className="flex min-h-[240px] flex-1 flex-col gap-3 md:h-[min(560px,62svh)]">
          <p className="text-[14px] font-semibold text-text-2 md:hidden" aria-hidden>
            Mes <span data-mes className="tabular-nums text-text">{meses.length - 1}</span> de {meses.length - 1}
          </p>
          <div className="relative grid min-h-[200px] flex-1 grid-cols-2 gap-4 md:gap-8">
            {[
              { clave: "hueca", titulo: "Quieta", detalle: "pierde poder de compra", valor: ultimo.quietaReal },
              { clave: "maciza", titulo: "Puesta a rendir", detalle: nombre, valor: ultimo.rindeReal },
            ].map((c) => (
              <div key={c.clave} className="flex min-h-0 flex-col">
                <p className="font-display text-[22px] leading-none font-extrabold tracking-[-0.03em] tabular-nums md:text-[34px]">
                  <span {...{ [`data-valor-${c.clave}`]: true }}>{pesos(Math.round(c.valor / 100) * 100, 0)}</span>
                </p>
                <div className="relative mt-3 min-h-0 flex-1">
                  {/* Referencia: lo que pusiste. */}
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-accent" style={{ bottom: `${(1 / tope) * 100}%` }}>
                    {c.clave === "hueca" && <span className="absolute -top-[22px] left-0 rounded-full bg-bg px-1.5 text-[11px] font-semibold whitespace-nowrap text-accent md:text-[12px]">Lo que pusiste</span>}
                  </div>
                  <div
                    {...{ [`data-${c.clave}`]: true }}
                    className={
                      c.clave === "hueca"
                        ? "absolute inset-0 origin-bottom rounded-(--radius-card) border-[3px] border-text will-change-transform"
                        : "absolute inset-0 origin-bottom rounded-(--radius-card) bg-text will-change-transform"
                    }
                    style={{ transform: `scaleY(${escala(c.valor)})` }}
                  />
                </div>
                <p className="mt-3 text-[15px] leading-tight font-bold md:text-[17px]">{c.titulo}</p>
                <p className="truncate text-[13px] text-text-2 md:text-[14px]">{c.detalle}</p>
              </div>
            ))}
          </div>
        </div>

        <div data-cierre className="flex flex-col gap-1.5 md:col-span-2 md:flex-row md:items-end md:justify-between md:gap-10">
          <p className="max-w-[34ch] font-display text-[19px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[26px]">
            Al mes 12, la diferencia es de {pesos(Math.round(diferencia / 100) * 100, 0)} en pesos de hoy.
          </p>
          <p className="max-w-[52ch] text-micro md:text-right">
            Supuestos: la tasa de hoy se mantiene 12 meses y la inflación es la del REM del BCRA ({informeRem}). Es una simulación, no una promesa de rendimiento.
          </p>
        </div>
      </div>
    </Escena>
  );
}
