import { Skeleton } from "@/components/ui/estados";
import { eventosDeLaSemana, mesInicial } from "@/lib/calendario/mes";
import { semanaInicial } from "@/lib/calendario/semana";
import { hoyAR } from "@/lib/calculos";
import { esFinDeSemana } from "@/lib/calculos/fechas";
import { obtenerSemana } from "@/lib/data";
import { CalendarioMes } from "./calendario-mes";

/**
 * El calendario de Mercados (punto 26): arriba a la derecha, un botón chico que abre el mes entero. El botón dice
 * cuánto pasa en la semana (la que viene, si es fin de semana); el mes se pide recién al abrirlo.
 */
export async function CalendarioMercados() {
  const hoy = hoyAR();
  const r = await obtenerSemana(semanaInicial(hoy));
  return <CalendarioMes hoy={hoy} inicial={mesInicial(hoy)} cuantos={r.ok ? eventosDeLaSemana(r.data) : 0} cuando={esFinDeSemana(hoy) ? "la semana que viene" : "esta semana"} />;
}

/** Mientras carga: el mismo tamaño que el botón, para que no salte la página. */
export function CalendarioMercadosCargando() {
  return <Skeleton className="h-11 w-60 rounded-full" />;
}
