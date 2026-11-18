import { Skeleton } from "@/components/ui/estados";
import { semanaInicial } from "@/lib/calendario/semana";
import { hoyAR } from "@/lib/calculos";
import { obtenerSemana } from "@/lib/data";
import { SemanaInteractiva } from "./semana-cliente";

/** Calendario semanal de Mercados (arriba a la derecha). Si no hay datos, no ocupa lugar. */
export async function CalendarioSemanal() {
  const hoy = hoyAR();
  const base = semanaInicial(hoy);
  const r = await obtenerSemana(base);
  if (!r.ok) return null;
  return <SemanaInteractiva inicial={r.data} hoy={hoy} base={base} />;
}

/** Mientras carga: el mismo tamaño, para que no salte la página. */
export function CalendarioSemanalCargando() {
  return (
    <div className="w-full lg:w-[540px]" aria-hidden>
      <Skeleton className="mb-2 h-8 w-32" />
      <Skeleton className="h-[112px] w-full" />
      <Skeleton className="mt-2 h-5 w-64" />
    </div>
  );
}
