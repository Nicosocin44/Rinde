import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { GLOSARIO } from "@/lib/glosario";

export const metadata: Metadata = {
  title: "Aprender: glosario financiero en criollo",
  description: "Qué es la TNA, la TEA, una LECAP, el MEP, la TIR, el PER o el EBITDA, explicado en una línea.",
};

/** El glosario: los mismos textos que aparecen al tocar (o pasar el mouse por) un concepto en el sitio. */
export default function Aprender() {
  return (
    <>
      <PageHeader titulo="Aprender" bajada="Los términos que vas a ver en el sitio, explicados en una línea. Sin jerga. También aparecen al tocar un concepto subrayado con puntos." />
      <dl className="mt-10 grid border-t border-border lg:mt-14 lg:grid-cols-2 lg:gap-x-16">
        {GLOSARIO.map((x) => (
          <div key={x.id} id={x.id} className="scroll-mt-[112px] border-b border-border py-6">
            <dt className="text-h3">{x.t}</dt>
            <dd className="mt-2 text-[16px] leading-[25px]">
              <span className="font-medium">{x.corto}</span> <span className="text-text-2">{x.largo}</span>
              {x.ver && (
                <Link href={x.ver.href} className="mt-2 block text-chico font-medium text-accent hover:underline">
                  {x.ver.etiqueta} →
                </Link>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
