import { Bell } from "lucide-react";
import Link from "next/link";
import { CARTERA_DEMO } from "@data/samples/cartera-demo";
import { pais } from "@/config/countries/ar";
import { Sparkline } from "@/components/charts/sparkline";
import { CATEGORICOS } from "@/components/charts/donut";
import { ButtonLink } from "@/components/ui/button";
import { Cifra } from "@/components/ui/cifra";
import { Delta } from "@/components/ui/delta";
import { Revelar } from "@/components/ui/revelar";
import { hoyAR } from "@/lib/calculos/fechas";
import { describir, evaluar, type Alerta } from "@/lib/alertas/evaluar";
import { analizarCartera } from "@/lib/cartera/valuacion";
import { cargarPreciosCartera } from "@/lib/data/servicios/cartera";
import { fotoMercado } from "@/lib/data/servicios/alertas";
import { generarIdeas } from "@/lib/insights/reglas";
import { pesosCompacto, porcentaje, puntos } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Sección de producto (para quien todavía no usa la cartera): la cartera y las alertas con los mismos
 * cálculos reales, sobre una cartera de ejemplo rotulada. Revelado sutil al scrollear.
 */
export async function SeccionProducto() {
  const ids = CARTERA_DEMO.activos.filter((a) => !["billetera", "plazo_fijo", "fci", "efectivo_usd"].includes(a.tipo)).map((a) => a.id);
  const [precios, foto] = await Promise.all([cargarPreciosCartera(ids).catch(() => null), fotoMercado().catch(() => null)]);
  const hoy = hoyAR();
  const a = precios ? analizarCartera(CARTERA_DEMO.activos, CARTERA_DEMO.movimientos, precios, hoy) : null;
  const twr = a?.rendimiento.ars?.twr?.toNumber() ?? null;
  const ipc = a?.benchmarks.ipc ?? null;
  const real = twr !== null && ipc !== null ? (1 + twr) / (1 + ipc) - 1 : null;
  const idea =
    a && precios
      ? generarIdeas({
          posiciones: a.posiciones,
          total: a.totalArs,
          hoy,
          feriados: new Set(pais.feriadosRespaldo),
          mejorLiquida: precios.mejores.liquida,
          mejorPlazoFijo30: precios.mejores.a30?.tipo === "plazo_fijo" ? precios.mejores.a30 : null,
          lecaps: precios.mejores.lecaps,
          rendimientoArs: null,
          inflacionPeriodo: null,
          mesesPeriodo: 0,
          objetivoPesos: null,
        }).find((i) => i.regla === "liquidez")
      : null;

  const mep = foto?.dolares.mep;
  const alertas: Alerta[] = [
    { id: "e1", tipo: "precio", dolar: "mep", condicion: "mayor", valor: mep ? Math.round(mep / 50) * 50 + 50 : 1650, creada: hoy, activa: true },
    { id: "e2", tipo: "comparacion", creada: hoy, activa: true },
    { id: "e3", tipo: "tasa", condicion: "mayor", valor: 0.2, creada: hoy, activa: true },
  ];

  return (
    <section className="pt-24 lg:pt-36" aria-label="Tu cartera y tus alertas">
      {/* Tu cartera, en serio. */}
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <Revelar className="flex flex-col gap-4">
          <h2 className="text-h1 text-balance">Tu cartera, en serio.</h2>
          <p className="max-w-md text-[17px] leading-[27px] text-text-2">
            Cargás lo que tenés (billetera, plazo fijo, CEDEARs, bonos, cripto o dólares) y ves cuánto rinde todo junto, en pesos, en dólares y contra la inflación. Se guarda solo en tu navegador.
          </p>
          <div className="mt-2">
            <ButtonLink href="/cartera" variante="primario" tamano="lg">
              Armar mi cartera
            </ButtonLink>
          </div>
        </Revelar>
        <Revelar indice={2}>
          {a ? (
            <div className="card flex flex-col gap-6 p-6 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-label">Cartera de ejemplo</p>
                  <Cifra valor={a.totalArs} decimales={0} className="mt-2 text-cifra lg:text-[40px] lg:leading-[44px]" />
                  {a.variacionDia && <Delta valor={a.variacionDia.monto} tipo="pesos" className="mt-1 text-chico" />}
                </div>
                <span className="rounded-(--radius-chip) bg-warn/12 px-2 py-1 text-[11px] font-medium text-warn">Datos de ejemplo</span>
              </div>
              <Sparkline valores={a.serie.map((p) => p.ars)} ancho={520} alto={72} relleno tono="accent" className="w-full" />
              <div className="flex h-2 overflow-hidden rounded-full">
                {a.distribucion.porTipo.slice(0, 6).map((d, i) => (
                  <span key={d.clave} style={{ width: `${d.fraccion * 100}%`, background: CATEGORICOS[i] }} className="h-full first:rounded-l-full last:rounded-r-full" />
                ))}
              </div>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                {a.distribucion.porTipo.slice(0, 6).map((d, i) => (
                  <li key={d.clave} className="flex items-center gap-2 text-chico">
                    <span className="size-2 rounded-[2px]" style={{ background: CATEGORICOS[i] }} />
                    <span className="truncate text-text-2">{d.etiqueta}</span>
                    <span className="tabular ml-auto font-medium">{porcentaje(d.fraccion, 0)}</span>
                  </li>
                ))}
              </ul>
              <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-chico text-text-2">¿Le ganó a la inflación?</p>
                  <p className="mt-1 text-[17px] font-medium">{real === null ? "—" : real >= 0 ? `Sí, por ${puntos(real, 1).replace("+", "")}` : `No, por ${puntos(-real, 1).replace("+", "")}`}</p>
                </div>
                {idea && (
                  <div>
                    <p className="text-chico text-text-2">Una idea</p>
                    <p className="mt-1 text-chico font-medium text-pretty">{idea.cuenta}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-text-2">La cartera de ejemplo no está disponible ahora.</div>
          )}
        </Revelar>
      </div>

      {/* Te avisamos antes. */}
      <div className="mt-24 grid items-center gap-10 lg:mt-36 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
        <Revelar indice={1} className="order-2 lg:order-1">
          <div className="card p-6 lg:p-8">
            <p className="mb-2 text-label">Alertas de ejemplo, evaluadas con los datos de hoy</p>
            <ul>
              {alertas.map((al) => {
                const r = foto ? evaluar(al, foto) : null;
                return (
                  <li key={al.id} className="flex items-center gap-4 border-b border-border py-4 last:border-0">
                    <Bell className={cn("size-[18px] shrink-0", r?.cumplida ? "text-accent" : "text-text-3")} strokeWidth={1.5} aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium">{describir(al)}</p>
                      <p className="truncate text-chico text-text-3">
                        {r?.cumplida ? <span className="font-medium text-accent">Se cumple ahora</span> : "Todavía no"} · {r?.actual ?? "—"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Revelar>
        <Revelar className="order-1 flex flex-col gap-4 lg:order-2">
          <h2 className="text-h1 text-balance">Te avisamos antes.</h2>
          <p className="max-w-md text-[17px] leading-[27px] text-text-2">
            Si el MEP pasa {mep ? pesosCompacto(Math.round(mep / 50) * 50 + 50) : "un valor"}, si una billetera sube la tasa o si tu plazo fijo vence el jueves. Vos ponés la condición; nosotros miramos el mercado.
          </p>
          <Link href="/alertas" className="mt-2 text-[15px] font-medium text-accent hover:underline">
            Crear una alerta →
          </Link>
        </Revelar>
      </div>
    </section>
  );
}
