import { Escena } from "@/components/escenas/escena";
import { Director } from "./director";
import { ButtonLink } from "@/components/ui/button";
import { delta, mesAnio } from "@/lib/format";
import type { PuntoComparacion } from "./datos";

const SERIES = [
  { clave: "cartera", nombre: "Tu cartera", trazo: 3.5 },
  { clave: "inflacion", nombre: "Inflación", trazo: 2 },
  { clave: "dolar", nombre: "Dólar MEP", trazo: 2 },
] as const;

/**
 * Escena 4 · Tu cartera. La cartera de ejemplo (rotulada) contra la inflación y el dólar MEP, en base 100
 * desde el primer aporte. Las tres líneas se dibujan con el scroll; cuando terminan, aparece el veredicto.
 */
export function EscenaCartera({ serie, inicio, vsInflacion, vsDolar }: { serie: PuntoComparacion[]; inicio: string; vsInflacion: number; vsDolar: number }) {
  const valores = serie.flatMap((p) => [p.cartera, p.inflacion, p.dolar]);
  const min = Math.min(...valores) * 0.97;
  const max = Math.max(...valores) * 1.02;
  const W = 1000;
  const H = 400;
  const x = (i: number) => (i / (serie.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const camino = (k: "cartera" | "inflacion" | "dolar") => serie.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p[k]).toFixed(1)}`).join(" ");
  const ultimo = serie.at(-1)!;
  const veredicto = (v: number, contra: "la inflación" | "el dólar") => (v >= 0 ? `Le ganó ${contra === "la inflación" ? "a la inflación" : "al dólar"}` : `Perdió contra ${contra}`);
  // Etiquetas al final de cada línea, separadas si chocan (mínimo 15 % del alto entre una y otra).
  const etiquetas = SERIES.map((s) => ({ ...s, v: ultimo[s.clave], top: (y(ultimo[s.clave]) / H) * 100 })).sort((a, b) => a.top - b.top);
  for (let i = 1; i < etiquetas.length; i++) etiquetas[i]!.top = Math.max(etiquetas[i]!.top, etiquetas[i - 1]!.top + 15);
  const exceso = etiquetas.at(-1)!.top - 100;
  if (exceso > 0) etiquetas.forEach((e) => (e.top -= exceso));

  return (
    <Escena
      etiqueta="Tu cartera"
      alto={220}
      altoMobile={200}
      className="sobre-color a-lo-ancho lamina-cerrada mt-16 bg-lila lg:mt-24"
      director={<Director coreografia="cartera" comienzo="top 60%" />}
      claseInterior="flex flex-col"
    >
      <div className="flex h-full flex-col justify-start gap-5 pt-[92px] pb-28 md:justify-center md:gap-8 md:pt-24 md:pb-14">
        <div data-titulo className="grid gap-2 md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)] md:items-end md:gap-12">
          <h2 className="text-h1 text-balance max-md:text-[36px]">¿Le ganaste a la inflación y al dólar?</h2>
          <p className="max-w-[44ch] text-[15px] leading-[22px] text-text-2 max-md:hidden md:text-[17px] md:leading-[26px]">
            Cargás lo que tenés y lo medimos contra lo que importa, con la misma vara: cuánto valdría cada peso si lo hubieras dejado en inflación o en dólares.
          </p>
        </div>

        <figure className="relative">
          <div className="relative h-[230px] md:h-[min(360px,38svh)]">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-y-0 left-0 h-full w-[calc(100%-7.5rem)] overflow-visible md:w-[calc(100%-10rem)]" aria-hidden>
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="currentColor" strokeOpacity={0.12} vectorEffect="non-scaling-stroke" />
              ))}
              <line x1={0} x2={W} y1={y(100)} y2={y(100)} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              {SERIES.map((s) => (
                <path
                  key={s.clave}
                  data-linea
                  d={camino(s.clave)}
                  pathLength={1}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={s.clave === "cartera" ? 1 : 0.55}
                  strokeWidth={s.trazo}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={1}
                  strokeDashoffset={0}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {etiquetas.map((s) => {
              const v = s.v;
              return (
                <span key={s.clave} data-fin className="absolute right-0 flex w-[7rem] -translate-y-1/2 items-center md:w-[9.25rem]" style={{ top: `${s.top}%` }}>
                  <span className={s.clave === "cartera" ? "rounded-full bg-tinta px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-papel md:text-[13px]" : "rounded-full bg-papel/70 px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap md:text-[13px]"}>
                    {s.nombre} {delta(v / 100 - 1, 0)}
                  </span>
                </span>
              );
            })}
          </div>
          <figcaption className="mt-2 flex justify-between text-micro">
            <span>{mesAnio(inicio)} = 100</span>
            <span>Hoy</span>
          </figcaption>
        </figure>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end md:gap-10">
          {[
            { valor: vsInflacion, texto: veredicto(vsInflacion, "la inflación") },
            { valor: vsDolar, texto: veredicto(vsDolar, "el dólar") },
          ].map((v) => (
            <div key={v.texto} data-veredicto className="flex items-baseline gap-3 border-t border-border pt-3 md:flex-col md:gap-1">
              <span data-cifra data-valor={v.valor} className="font-display text-[34px] leading-none font-extrabold tracking-[-0.04em] tabular-nums md:text-[56px]">
                {delta(v.valor, 1)}
              </span>
              <span className="text-[14px] font-semibold md:text-[16px]">{v.texto}</span>
            </div>
          ))}
          <div className="flex flex-col gap-2 md:items-end">
            <ButtonLink href="/cartera" variante="primario" tamano="md" flecha>
              Armar mi cartera
            </ButtonLink>
            <span className="flex items-start gap-1.5 text-[12px] leading-[16px] font-semibold">
              <span aria-hidden className="mt-[5px] size-1.5 shrink-0 rounded-full bg-tinta" />
              Datos de ejemplo: una cartera inventada, con precios reales.
            </span>
          </div>
        </div>
      </div>
    </Escena>
  );
}
