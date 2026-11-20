import type { Metadata } from "next";
import { Suspense } from "react";
import { Bonos, TablaOns } from "@/components/modules/bonos/bonos";
import { Desplegable } from "@/components/modules/pesos/excluidos";
import { Respuesta } from "@/components/modules/pesos/respuesta";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerBonos, obtenerMacro } from "@/lib/data";
import { ajusteLogaritmico } from "@/lib/data/validacion";
import { FUENTES, type BonoUsd } from "@/lib/data/types";
import { porcentaje } from "@/lib/format";

export const revalidate = 15;
export const metadata: Metadata = { title: "Bonos en dólares y ONs: TIR, duration y flujos", description: "Bonares y Globales con TIR, duration, paridad y calculadora de flujos. Obligaciones negociables." };

/** Curva por ley: y = a + b·ln(duration). Redondeada para que servidor y cliente dibujen exactamente lo mismo. */
function curva(bonos: BonoUsd[]) {
  if (bonos.length < 3) return [];
  const f = ajusteLogaritmico(bonos.map((b) => ({ x: b.duration, y: b.tir })));
  if (!f) return [];
  const min = Math.min(...bonos.map((b) => b.duration));
  const max = Math.max(...bonos.map((b) => b.duration));
  return Array.from({ length: 24 }, (_, i) => {
    const x = min + ((max - min) * i) / 23;
    return { x: Math.round(x * 1e4) / 1e4, y: Math.round(f(x) * 1e6) / 1e6 };
  }).filter((p) => Number.isFinite(p.y));
}

export default async function BonosPage() {
  const [r, m] = await Promise.all([obtenerBonos(), obtenerMacro()]);
  return (
    <>
      <div>
        {!r.ok ? (
          <ErrorState titulo="No pudimos traer los bonos." detalle={r.error} />
        ) : (
          <>
            <Respuesta
              etiqueta="Rinden entre"
              fraccion={Math.max(...r.data.bonos.map((b) => b.tir))}
              sufijo="TIR"
              titulo={`Los bonos en dólares rinden entre ${porcentaje(Math.min(...r.data.bonos.map((b) => b.tir)), 1)} y ${porcentaje(Math.max(...r.data.bonos.map((b) => b.tir)), 1)} anual en dólares.`}
              contexto={
                <>
                  Los de ley Nueva York (Globales) suelen rendir menos que los de ley argentina (Bonares) porque se perciben más protegidos.
                  {m.ok && m.data.riesgoPais && ` El riesgo país está en ${m.data.riesgoPais.valor} puntos.`}
                </>
              }
            />
            <Suspense fallback={null}>
              <Bonos
                bonos={r.data.bonos}
                ajustes={{ ny: curva(r.data.bonos.filter((b) => b.ley === "Nueva York")), local: curva(r.data.bonos.filter((b) => b.ley === "Argentina")) }}
              />
            </Suspense>
            <SourceNote className="mt-6" fuentes={[FUENTES.data912]} actualizado={r.asOf} estado={r.status} metodologia="/metodologia#bonos">
              <span aria-hidden>·</span>
              <span>Precio de la especie en dólares (D), por 100 nominales originales · liquidación 24 h</span>
            </SourceNote>

            <section className="mt-20 flex flex-col gap-4" aria-labelledby="ons">
              <h2 id="ons" className="text-h2">
                Obligaciones negociables
              </h2>
              <p className="max-w-2xl text-text-2">
                Deuda de empresas en dólares. Mostramos las que operaron hoy, con su precio en dólares MEP. La TIR de cada ON necesita su prospecto: la sumamos en la próxima versión.
              </p>
              <Desplegable titulo={`Ver ${r.data.ons.length} ONs con operaciones hoy`} abiertoInicial={false}>
                <TablaOns ons={r.data.ons} />
              </Desplegable>
            </section>
          </>
        )}
      </div>
    </>
  );
}
