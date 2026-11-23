"use client";

import Link from "next/link";
import { useState } from "react";
import { TARIFARIOS_BROKERS } from "@data/ar/comisiones-brokers";
import { proveedorPorId } from "@data/ar/proveedores";
import { DataTable, EtiquetaMejor, type Columna } from "@/components/ui/data-table";
import { MoneyInput } from "@/components/ui/money-input";
import { ProviderMark } from "@/components/ui/provider-mark";
import { SegmentedControl } from "@/components/ui/segmented";
import { rankingBrokers, type ClaseOperacion, type Comision, type FilaRanking } from "@/lib/calculos/comisiones";
import { cn } from "@/lib/cn";
import { fechaCorta, pesos, porcentaje } from "@/lib/format";

const CLASES: { valor: ClaseOperacion; etiqueta: string }[] = [
  { valor: "acciones", etiqueta: "Acciones y CEDEARs" },
  { valor: "bonos", etiqueta: "Bonos" },
  { valor: "letras", etiqueta: "Letras" },
  { valor: "opciones", etiqueta: "Opciones" },
];

/** Los derechos de mercado de BYMA, iguales en todos los brokers (según los tarifarios relevados). */
const DERECHOS: Record<ClaseOperacion, string> = {
  acciones: "alrededor de 0,05 % a 0,07 %",
  bonos: "0,01 %",
  letras: "0,001 %",
  opciones: "0,2 %",
};

/** Plazos de letra para comparar (Cocos cobra las letras como tasa anual, prorrateada). */
const PLAZOS = ["30", "90", "180"] as const;

/** "0,45 % + IVA", "hasta 0,50 %", "1,5 % anual" */
function textoComision(c: Comision): string {
  return `${c.hasta ? "hasta " : ""}${porcentaje(c.tasa, 2)}${c.anual ? " anual" : ""}${c.iva ? " + IVA" : ""}`;
}

const nombreDe = (id: string) => proveedorPorId(id)?.nombre ?? id;

/**
 * Dónde comprar (o vender) y cuánto cobra cada broker, del más barato al más caro, para el monto que pongas. Se ordena
 * solo por la comisión del broker con su IVA: los derechos de mercado son iguales en todos y van como nota. Nadie paga
 * por estar arriba.
 *
 * - En la ficha de un activo: una clase fija (`clase`), y el link al comparador.
 * - En el comparador (`completo`): elegís la clase, el plazo de las letras y se ven la custodia, el plan y las fuentes.
 */
export function RankingBrokers({ clase: claseFija, dias: diasFijos, titulo, completo = false }: { clase?: ClaseOperacion; dias?: number; titulo?: string; completo?: boolean }) {
  const [monto, setMonto] = useState(1_000_000);
  const [claseElegida, setClase] = useState<ClaseOperacion>(claseFija ?? "acciones");
  const [plazo, setPlazo] = useState<(typeof PLAZOS)[number]>("90");
  const clase = claseFija ?? claseElegida;
  const dias = clase === "letras" ? (diasFijos ?? Number(plazo)) : undefined;
  const filas = rankingBrokers(TARIFARIOS_BROKERS, clase, monto, dias);

  const columnas: Columna<FilaRanking>[] = [
    { id: "pos", encabezado: "#", ancho: "40px", celda: (_, i) => <span className={cn("tabular text-chico", i === 0 ? "font-semibold text-accent" : "text-text-3")}>{i + 1}</span> },
    {
      id: "broker",
      encabezado: "Broker",
      celda: (f, i) => (
        <span className="flex items-center gap-3">
          <ProviderMark proveedorId={f.tarifario.proveedorId} />
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2 font-medium">
              {nombreDe(f.tarifario.proveedorId)}
              {i === 0 && <EtiquetaMejor />}
            </span>
            {completo && <span className="text-micro text-text-3">{f.tarifario.plan}</span>}
          </span>
        </span>
      ),
    },
    { id: "comision", encabezado: "Comisión", alineacion: "derecha", celda: (f) => <span className="text-chico text-text-2">{textoComision(f.comision)}</span> },
    { id: "costo", encabezado: "Te cobra", alineacion: "derecha", celda: (f) => <span className="tabular font-medium">{pesos(f.costo, 0)}</span> },
    ...(completo
      ? [
          { id: "custodia", encabezado: "Custodia", solo: "desktop" as const, celda: (f: FilaRanking) => <span className="text-chico text-text-2">{f.tarifario.custodia}</span> },
          {
            id: "fuente",
            encabezado: "Tarifario",
            alineacion: "derecha" as const,
            solo: "desktop" as const,
            celda: (f: FilaRanking) => (
              <a href={f.tarifario.fuente.url} target="_blank" rel="noopener noreferrer" className="text-chico font-medium text-accent hover:underline">
                Ver
              </a>
            ),
          },
        ]
      : []),
  ];

  return (
    <section aria-labelledby="donde-comprar" className={cn("flex flex-col gap-5", !completo && "mt-12 lg:mt-16")}>
      <div className="flex flex-col gap-1">
        <h2 id="donde-comprar" className="text-h3">
          {titulo ?? "Cuánto cobra cada broker"}
        </h2>
        <p className="max-w-2xl text-chico text-text-2">Lo que te cobra cada broker por comprar (o vender) ese monto, IVA incluido, del más barato al más caro. Nadie paga por estar arriba.</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <MoneyInput etiqueta="Monto" valor={monto} onChange={setMonto} className="w-full sm:w-56" />
        {!claseFija && (
          // En 375 px las cuatro opciones no entran: la franja se desliza de costado (como las solapas).
          <div className="sin-scrollbar -mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:max-w-none sm:overflow-visible sm:px-0">
            <SegmentedControl etiqueta="Qué operás" tamano="sm" valor={claseElegida} onChange={setClase} opciones={CLASES} />
          </div>
        )}
        {clase === "letras" && diasFijos === undefined && (
          <SegmentedControl etiqueta="Plazo de la letra" tamano="sm" valor={plazo} onChange={setPlazo} opciones={PLAZOS.map((p) => ({ valor: p, etiqueta: `${p} días` }))} />
        )}
      </div>

      <DataTable
        etiqueta="Comisiones de los brokers"
        filas={filas}
        columnas={columnas}
        clave={(f) => f.tarifario.proveedorId}
        esMejor={(_, i) => i === 0}
        topSticky="top-[76px] lg:top-[92px]"
        filaMovil={(f, i) => (
          <span className="flex items-center gap-3">
            <span className={cn("tabular w-4 text-chico", i === 0 ? "font-semibold text-accent" : "text-text-3")}>{i + 1}</span>
            <ProviderMark proveedorId={f.tarifario.proveedorId} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[15px] font-medium">
                <span className="truncate">{nombreDe(f.tarifario.proveedorId)}</span>
                {i === 0 && <EtiquetaMejor />}
              </span>
              <span className="block text-chico text-text-3">{textoComision(f.comision)}</span>
            </span>
            <span className="tabular text-[15px] font-medium">{pesos(f.costo, 0)}</span>
          </span>
        )}
      />

      <div className="flex max-w-3xl flex-col gap-1 text-micro text-text-3">
        <p>
          Además, BYMA cobra los derechos de mercado ({DERECHOS[clase]} del monto{clase === "acciones" || clase === "opciones" ? ", más IVA" : ""}), iguales en todos los brokers. Son las comisiones de quien opera online y recién empieza; con más volumen, algunos cobran menos.
          {clase === "letras" && dias !== undefined && ` Cocos cobra las letras como tasa anual: para ${dias} días.`}
        </p>
        {completo ? (
          <p>
            De los tarifarios oficiales de cada broker, leídos el {fechaCorta(TARIFARIOS_BROKERS[0]!.verificado, true)}. Por ahora no están Allaria, Adcap ni SBS: no encontramos su tarifario publicado.
          </p>
        ) : (
          <p>
            <Link href="/mercados/brokers" className="font-medium text-accent hover:underline">
              Ver todas las comisiones y sus fuentes
            </Link>
          </p>
        )}
      </div>

      {completo && (
        <ul className="flex max-w-3xl flex-col gap-2 text-chico text-text-2">
          {filas
            .filter((f) => f.tarifario.nota)
            .map((f) => (
              <li key={f.tarifario.proveedorId}>
                <span className="font-medium text-text">{nombreDe(f.tarifario.proveedorId)}:</span> {f.tarifario.nota}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
