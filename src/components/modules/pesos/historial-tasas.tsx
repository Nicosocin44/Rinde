import { HISTORIAL_TASAS } from "@data/historico/tasas";
import { resolverProveedor } from "@data/ar/proveedores";
import { Sparkline } from "@/components/charts/sparkline";
import { ProviderMark } from "@/components/ui/provider-mark";
import { cambiosPlazoFijo, rangoHistorial } from "@/lib/historial/tasas";
import { fechaCorta, porcentaje, puntos } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Cuántos bancos se muestran (los de mejor tasa hoy). */
const BANCOS = 10;

/**
 * Cómo cambió la tasa de plazo fijo de cada banco desde que empezamos a guardarlas (una foto por día hábil).
 * Nadie más publica este historial: con pocos días, avisa desde cuándo se guarda.
 */
export function HistorialPlazoFijo() {
  const rango = rangoHistorial(HISTORIAL_TASAS);
  if (!rango) return null;
  const bancos = cambiosPlazoFijo(HISTORIAL_TASAS).slice(0, BANCOS);

  return (
    <section aria-labelledby="historial-tasas" className="mt-12 lg:mt-16">
      <h2 id="historial-tasas" className="text-h3">
        Cómo cambiaron las tasas
      </h2>
      {rango.dias < 2 ? (
        <p className="mt-2 max-w-2xl text-chico text-text-2">
          Empezamos a guardar la tasa de cada banco el {fechaCorta(rango.desde, true)}, una vez por día hábil. Nadie más publica este historial: en unos días vas a ver acá si cada banco subió o
          bajó su tasa.
        </p>
      ) : (
        <>
          <p className="mt-2 mb-5 max-w-2xl text-chico text-text-2">
            Tasa a 30 días de los {BANCOS} bancos que más pagan hoy, desde el {fechaCorta(rango.desde, true)} ({rango.dias} días guardados).
          </p>
          <ul className="border-t border-border">
            {bancos.map((b) => {
              const p = resolverProveedor(b.entidad, "banco");
              return (
                <li key={b.entidad} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-3 sm:grid-cols-[28px_minmax(0,1fr)_96px_80px_96px]">
                  <ProviderMark proveedorId={p.id} sigla={p.sigla} />
                  <span className="truncate text-[15px] font-medium">{p.nombre}</span>
                  <span className="hidden sm:block">
                    <Sparkline valores={b.serie.map((s) => s.tna)} ancho={96} alto={24} />
                  </span>
                  <span className="tabular hidden text-right text-[15px] sm:block">{porcentaje(b.actual, 2)}</span>
                  <span className={cn("tabular text-right text-chico", b.cambio > 0 ? "text-gain" : b.cambio < 0 ? "text-loss" : "text-text-3")}>
                    {b.cambio === 0 ? "sin cambios" : puntos(b.cambio, 2)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
