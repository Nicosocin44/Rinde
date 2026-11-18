import type { Metadata } from "next";
import { Suspense } from "react";
import { ListaNoticias } from "@/components/modules/noticias/noticias";
import { PageHeader } from "@/components/shell/page-header";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerNoticias } from "@/lib/data";
import { MEDIOS } from "@/lib/data/adapters/medios";
import { fechaLarga, hora } from "@/lib/format";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Noticias del mercado: dólar, tasas, bonos, acciones y cripto",
  description: "Las noticias económicas y financieras de los principales medios, agrupadas y filtradas por mercado.",
};

const ZONA = "America/Argentina/Buenos_Aires";
const diaAR = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d);

export default async function NoticiasPage() {
  const r = await obtenerNoticias();
  const ahora = new Date();
  const hoy = diaAR(ahora);
  const ayer = diaAR(new Date(ahora.getTime() - 86_400_000));
  // Hora y día se calculan en el servidor (hora argentina) para que servidor y navegador muestren lo mismo.
  const horas: Record<string, string> = {};
  const dias: Record<string, string> = {};
  if (r.ok) {
    for (const n of r.data.noticias) {
      const d = new Date(n.fecha);
      const clave = diaAR(d);
      horas[n.id] = hora(d);
      dias[n.id] = clave === hoy ? "Hoy" : clave === ayer ? "Ayer" : fechaLarga(d);
    }
  }
  const medios = MEDIOS.map((m) => ({ id: m.id, nombre: m.nombre }));

  return (
    <>
      <PageHeader titulo="Noticias" bajada="Lo que publican los principales medios económicos, agrupado cuando varios cuentan lo mismo y separado por mercado." />
      <div className="pt-8 lg:pt-12">
        {!r.ok ? (
          <ErrorState titulo="No pudimos traer las noticias." detalle={r.error} />
        ) : (
          <>
            {r.data.sinRespuesta.length > 0 && (
              <p className="mb-6 text-chico text-text-2">
                {r.data.sinRespuesta.join(", ")} no {r.data.sinRespuesta.length === 1 ? "respondió" : "respondieron"} en esta actualización. Mostramos el resto.
              </p>
            )}
            <Suspense>
              <ListaNoticias noticias={r.data.noticias} medios={medios} horas={horas} dias={dias} />
            </Suspense>
          </>
        )}
        <SourceNote className="mt-10" fuentes={MEDIOS.map((m) => ({ name: m.nombre, url: m.sitio }))} actualizado={r.ok ? r.asOf : null} estado={r.ok ? r.status : "stale"} metodologia={false}>
          Mostramos el título y un extracto de cada medio; la nota completa está en su sitio.
        </SourceNote>
      </div>
    </>
  );
}
