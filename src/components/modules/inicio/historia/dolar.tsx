import { Escena } from "@/components/escenas/escena";
import { Director } from "./director";
import { ButtonLink } from "@/components/ui/button";
import { FreshnessBadge } from "@/components/ui/frescura";
import { ProviderMark } from "@/components/ui/provider-mark";
import type { EstadoDato } from "@/lib/data/types";
import { pesos } from "@/lib/format";
import type { ProveedorPrecio } from "./datos";

/**
 * Escena 3 · El dólar. Una regla de precios compartida: cada proveedor llega desde la derecha hasta su
 * precio final (con comisiones). Cuando llegó el último, aparece la guía del más barato y la diferencia
 * contra el más caro se arma número por número. Todo es el ranking real de hoy.
 */
export function EscenaDolar({ proveedores, asOf, estado }: { proveedores: ProveedorPrecio[]; asOf: string; estado: EstadoDato }) {
  const precios = proveedores.map((p) => p.compras);
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  const rango = Math.max(max - min, min * 0.004);
  const desde = min - rango * 0.12;
  const hasta = max + rango * 0.08;
  const pos = (v: number) => ((v - desde) / (hasta - desde)) * 100;
  const barato = proveedores[0]!;
  const caro = proveedores.at(-1)!;
  const ahorro = caro.costoMil - barato.costoMil;

  return (
    <Escena
      etiqueta="El dólar"
      alto={220}
      altoMobile={200}
      director={<Director coreografia="dolar" comienzo="top 65%" />}
      claseInterior="flex flex-col"
    >
      <div className="flex h-full flex-col justify-start gap-6 pt-[92px] pb-28 md:justify-center md:gap-10 md:pt-24 md:pb-14">
        <div data-titulo className="grid gap-2 md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)] md:items-end md:gap-12">
          <h2 className="text-h1 text-balance max-md:text-[36px]">El dólar más barato, app por app.</h2>
          <p className="max-w-[44ch] text-[15px] leading-[22px] text-text-2 max-md:hidden md:text-[17px] md:leading-[26px]">
            Bancos, billeteras y exchanges, con el precio final que pagás: comisiones incluidas. Ordenados de más barato a más caro para comprar.
          </p>
        </div>

        <div className="relative">
          <ol className="flex flex-col" aria-label="Precio final para comprar un dólar, de más barato a más caro">
            {proveedores.map((p, i) => (
              <li key={p.id} className="grid grid-cols-[7.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 border-t border-border py-[7px] md:grid-cols-[14rem_minmax(0,1fr)_8rem] md:gap-6 md:py-2">
                <span className="flex min-w-0 items-center gap-2.5">
                  <ProviderMark proveedorId={p.id} className="max-md:hidden" />
                  <span className="truncate text-[14px] font-semibold md:text-[16px]">{p.nombre}</span>
                </span>
                <span className="relative h-5 md:h-6">
                  <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border-strong" />
                  <span data-punto aria-hidden className="absolute inset-0 will-change-transform" data-pos={pos(p.compras)} style={{ translate: `${pos(p.compras)}% 0` }}>
                    <span className={i === 0 ? "absolute top-1/2 -left-2 size-4 -translate-y-1/2 rounded-full bg-verde ring-4 ring-verde/25 md:-left-2.5 md:size-5" : "absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rounded-full bg-text md:-left-2 md:size-4"} />
                  </span>
                </span>
                <span className="text-right font-display text-[16px] font-bold tracking-[-0.02em] tabular-nums md:text-[22px]">{pesos(p.compras, 2)}</span>
              </li>
            ))}
          </ol>
          {/* Guía vertical en el precio más barato. */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[calc(7.5rem+12px)] right-[calc(5.5rem+12px)] md:left-[calc(14rem+24px)] md:right-[calc(8rem+24px)]">
            <span data-guia className="absolute inset-y-0 w-px origin-top border-l border-dashed border-gain" style={{ left: `${pos(min)}%` }} />
            <span data-ganador className="absolute -top-6 -translate-x-1/2 rounded-full bg-verde px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-tinta md:-top-7 md:text-[12px]" style={{ left: `${pos(min)}%` }}>
              El más barato
            </span>
          </div>
        </div>

        <div data-cierre className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <p className="max-w-[30ch] font-display text-[19px] leading-[1.2] font-bold tracking-[-0.02em] md:max-w-[34ch] md:text-[26px]">
            USD 1.000 te cuestan <span data-ahorro data-valor={ahorro} className="tabular-nums">{pesos(ahorro, 0)}</span> menos en {barato.nombre} que en {caro.nombre}.
          </p>
          <div className="flex flex-col gap-3 md:items-end">
            <ButtonLink href="/dolar/comprar" variante="secundario" tamano="md" flecha>
              Ver todos los precios
            </ButtonLink>
            <p className="flex flex-col gap-1 text-micro md:items-end">
              <FreshnessBadge estado={estado} asOf={asOf} />
              <span>Fuente: CriptoYa y DolarAPI. Precio final para comprar, con comisiones.</span>
            </p>
          </div>
        </div>
      </div>
    </Escena>
  );
}
