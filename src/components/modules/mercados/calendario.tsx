import { mesInicial } from "@/lib/calendario/mes";
import { hoyAR } from "@/lib/calculos";
import { CalendarioMes } from "./calendario-mes";

/**
 * El calendario de Mercados (punto 26): arriba a la derecha, un botón chico "Calendario" que abre el mes entero.
 * El mes se pide recién al abrirlo (o al pasar el mouse por el botón).
 */
export function CalendarioMercados() {
  const hoy = hoyAR();
  return <CalendarioMes hoy={hoy} inicial={mesInicial(hoy)} />;
}
