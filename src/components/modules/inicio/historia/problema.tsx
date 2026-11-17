import { Escena } from "@/components/escenas/escena";
import { Director } from "./director";
import { FreshnessBadge } from "@/components/ui/frescura";
import { pesosCompacto } from "@/lib/format";
import type { Pieza } from "./datos";

const TIPO: Record<string, string> = {
  billetera: "Billetera",
  plazo_fijo: "Plazo fijo",
  efectivo_usd: "Dólares",
  cedear: "CEDEAR",
  lecap: "Letra del Tesoro",
  cripto: "Cripto",
  bono: "Bono",
  accion: "Acción",
};

/** Dónde descansa cada ficha (en % del área) y su inclinación. Desordenadas a propósito. */
const LUGARES = [
  { x: 0, y: 3, r: -6, dx: -1, dy: -1 },
  { x: 54, y: 0, r: 4, dx: 1, dy: -1 },
  { x: 7, y: 36, r: 3, dx: -1, dy: 0 },
  { x: 57, y: 35, r: -5, dx: 1, dy: 0 },
  { x: 1, y: 70, r: 5, dx: -1, dy: 1 },
  { x: 51, y: 69, r: -3, dx: 1, dy: 1 },
];

/**
 * Escena 1 · El problema. Seis fichas de la cartera de ejemplo entran desde los bordes y quedan
 * desordenadas, cada una con su monto y un "¿rinde?" donde debería estar la tasa.
 */
export function EscenaProblema({ piezas }: { piezas: Pieza[] }) {
  const total = piezas.reduce((s, p) => s + (p.valorArs ?? 0), 0);
  return (
    <Escena
      etiqueta="El problema"
      alto={190}
      altoMobile={170}
      director={<Director coreografia="problema" comienzo="top 85%" />}
      claseInterior="flex flex-col"
    >
      <div className="flex h-full flex-col gap-5 pt-24 pb-28 md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center md:gap-12 md:pt-20 md:pb-12">
        <div className="flex flex-col gap-3 md:gap-4 lg:gap-6">
          <h2 className="text-h1 text-balance max-md:text-[36px]">Tu plata está repartida y no sabés si rinde.</h2>
          <p className="max-w-[42ch] text-[15px] leading-[22px] text-text-2 md:text-[16px] md:leading-[25px] lg:text-[19px] lg:leading-[29px]">
            Un poco en la billetera, un plazo fijo que vence, dólares guardados, algún CEDEAR. Cada lugar tiene su app y su forma de mostrar la tasa, y ninguno te dice si le estás ganando a la inflación.
          </p>
          <p data-cierre className="hidden font-display text-[22px] leading-[1.15] font-bold tracking-[-0.02em] md:block lg:text-[28px]">
            {piezas.length} lugares{total > 0 && <>, {pesosCompacto(total)} en total</>}. ¿Cuánto rinde todo junto?
          </p>
        </div>

        <div className="relative min-h-[270px] flex-1 md:h-[min(560px,70svh)] md:flex-none">
          {piezas.map((p, i) => {
            const l = LUGARES[i % LUGARES.length]!;
            return (
              <div
                key={p.id}
                data-ficha
                className="absolute w-[45%] will-change-transform md:w-[41%]"
                style={{ left: `${l.x}%`, top: `${l.y * 0.9}%`, rotate: `${l.r}deg` }}
              >
                <div className="flex flex-col gap-1.5 rounded-(--radius-card) border border-border bg-surface p-3 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] md:gap-2 md:p-3.5 lg:gap-3 lg:p-5">
                  <p className="hidden text-[12px] font-semibold text-text-3 md:block lg:text-[13px]">{TIPO[p.tipo] ?? p.tipo}</p>
                  <p className="truncate font-display text-[15px] leading-tight md:text-[16px] font-bold tracking-[-0.02em] lg:text-[21px]">{p.tipo === "plazo_fijo" ? p.nombre.replace(/^Plazo fijo /, "") : p.nombre}</p>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <span className="tabular text-[13px] font-medium text-text-2 md:text-[14px] lg:text-[16px]">{p.valorArs !== null ? pesosCompacto(p.valorArs) : "—"}</span>
                    <span className="rounded-full border border-dashed border-text-3 bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-text md:px-2.5 md:text-[12px] lg:text-[14px]">¿rinde?</span>
                  </div>
                </div>
              </div>
            );
          })}
          <FreshnessBadge estado="sample" className="absolute right-0 bottom-0 max-md:hidden" />
        </div>
        <div data-cierre className="flex flex-col gap-1.5 md:hidden">
          <p className="font-display text-[19px] leading-[1.2] font-bold tracking-[-0.02em]">
            {piezas.length} lugares{total > 0 && <>, {pesosCompacto(total)} en total</>}. ¿Cuánto rinde todo junto?
          </p>
          <FreshnessBadge estado="sample" />
        </div>
      </div>
    </Escena>
  );
}
