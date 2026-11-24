"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { proveedorPorId, resolverProveedor } from "@data/ar/proveedores";
import { DataTable, EtiquetaMejor, type Columna } from "@/components/ui/data-table";
import { Destello } from "@/components/ui/destello";
import { ErrorState } from "@/components/ui/estados";
import { EstadoDiscreto } from "@/components/ui/estado-dato";
import { MetricExplainer } from "@/components/ui/metric-explainer";
import { ProviderMark } from "@/components/ui/provider-mark";
import { SegmentedControl } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { PartnerCTA } from "@/components/ui/partner-cta";
import type { ActivoDolar, Cargado, ProveedorDolar, RankingDolar as Ranking } from "@/lib/data/types";
import { hora, numero, pesos, porcentaje } from "@/lib/format";
import { ordenarProveedores, filtrarProveedores, resumenRanking, type CriterioDolar } from "@/lib/rankings/dolar";
import { cn } from "@/lib/cn";

const TIPO: Record<string, string> = { banco: "Banco", casa_de_cambio: "Casa de cambio", billetera: "Billetera", exchange: "Exchange", p2p: "P2P" };

/**
 * "Dónde comprar dólares": ranking por app y banco. USD / USDT / USDC; orden por comprar, vender o spread;
 * filtro 24/7; costo total de USD 1.000. Interacción firma 6: al cambiar el orden, las filas se mueven (FLIP).
 */
export function RankingDolar({ rankings }: { rankings: Record<ActivoDolar, Cargado<Ranking>> }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activoUrl = params.get("activo")?.toUpperCase();
  const activo: ActivoDolar = activoUrl === "USDT" || activoUrl === "USDC" ? activoUrl : "USD";
  const [criterio, setCriterio] = useState<CriterioDolar>("comprar");
  const [solo247, setSolo247] = useState(false);
  const [detalle, setDetalle] = useState<ProveedorDolar | null>(null);
  const [verEspeciales, setVerEspeciales] = useState(false);
  const [verExcluidos, setVerExcluidos] = useState(false);

  const cambiarActivo = (a: ActivoDolar) => {
    const q = new URLSearchParams(params);
    if (a === "USD") q.delete("activo");
    else q.set("activo", a);
    router.replace(`${pathname}${q.size ? `?${q}` : ""}`, { scroll: false });
  };

  const r = rankings[activo];
  const lista = useMemo(() => (r.ok ? ordenarProveedores(filtrarProveedores(r.data.proveedores, { solo247 }), criterio) : []), [r, solo247, criterio]);
  const resumen = useMemo(() => (lista.length ? resumenRanking(lista, criterio) : null), [lista, criterio]);
  const unidad = activo === "USD" ? "USD" : activo;

  const columnas: Columna<ProveedorDolar>[] = [
    { id: "pos", encabezado: "#", ancho: "40px", celda: (_, i) => <span className={cn("tabular text-chico", i === 0 ? "font-semibold text-accent" : "text-text-3")}>{i + 1}</span> },
    {
      id: "proveedor",
      encabezado: "Proveedor",
      celda: (p, i) => (
        <span className="flex items-center gap-3">
          <ProviderMark proveedorId={p.id} />
          <span className="font-medium">{p.nombre}</span>
          {i === 0 && <EtiquetaMejor />}
          {p.opera247 && <span className="hidden text-micro xl:inline">24/7</span>}
        </span>
      ),
    },
    { id: "compras", encabezado: "Comprás a", alineacion: "derecha", celda: (p) => <Destello valor={p.compras} className={cn(criterio === "comprar" && "font-medium")}>{pesos(p.compras, 2)}</Destello> },
    { id: "vendes", encabezado: "Vendés a", alineacion: "derecha", celda: (p) => <Destello valor={p.vendes} className={cn(criterio === "vender" ? "font-medium" : "text-text-2")}>{pesos(p.vendes, 2)}</Destello> },
    { id: "spread", encabezado: "Spread", alineacion: "derecha", celda: (p) => <span className={cn(criterio === "spread" ? "font-medium" : "text-text-2")}>{porcentaje(p.spread, 2)}</span> },
    {
      id: "costo",
      encabezado: criterio === "vender" ? `Por ${unidad} 1.000 recibís` : `${unidad} 1.000 te cuestan`,
      alineacion: "derecha",
      celda: (p) => <span className="font-medium">{pesos(criterio === "vender" ? p.recibisMil : p.costoMil)}</span>,
    },
    { id: "pizarra", encabezado: "Pizarra", alineacion: "derecha", solo: "pro-desktop", celda: (p) => <span className="text-chico text-text-3">{numero(p.pizarraCompra, 2)} / {numero(p.pizarraVenta, 2)}</span> },
    { id: "hora", encabezado: "Hora", alineacion: "derecha", solo: "pro-desktop", celda: (p) => <span className="text-chico text-text-3">{hora(p.asOf)}</span> },
  ];

  return (
    <div className="flex flex-col gap-8" data-testid="ranking-dolar">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl
          etiqueta="Qué dólar"
          valor={activo}
          onChange={cambiarActivo}
          opciones={[
            { valor: "USD", etiqueta: "Dólar (USD)" },
            { valor: "USDT", etiqueta: "USDT" },
            { valor: "USDC", etiqueta: "USDC" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            etiqueta="Ordenar por"
            valor={criterio}
            onChange={setCriterio}
            ancho="lleno"
            className="w-full sm:w-auto"
            opciones={[
              { valor: "comprar", etiqueta: "Para comprar" },
              { valor: "vender", etiqueta: "Para vender" },
              { valor: "spread", etiqueta: "Menor spread", ariaLabel: "Menor spread" },
            ]}
          />
          <button
            type="button"
            aria-pressed={solo247}
            onClick={() => setSolo247((v) => !v)}
            className={cn("h-9 rounded-(--radius-control) border px-3.5 text-[14px] font-medium transition-colors", solo247 ? "border-accent bg-accent-soft text-text" : "border-border text-text-2 hover:border-border-strong")}
          >
            Solo 24/7
          </button>
        </div>
      </div>

      {!r.ok ? (
        <ErrorState titulo={`No pudimos traer las cotizaciones de ${unidad}.`} detalle={`${r.error} Probá en un minuto.`} />
      ) : (
        <>
          {resumen && (
            <div className="flex flex-col gap-2" aria-live="polite">
              <p className="text-h2 text-balance">
                {criterio === "vender" ? "Te conviene vender en " : criterio === "spread" ? "El menor spread lo tiene " : "Te conviene comprar en "}
                {resumen.mejor.nombre}.
              </p>
              <p className="max-w-3xl text-[17px] leading-[26px] text-text-2">
                {criterio === "vender" ? (
                  <>
                    Por {unidad} 1.000 recibís <span className="tabular font-medium text-text">{pesos(resumen.mejor.recibisMil)}</span>
                    {resumen.extraContraPromedio > 1 && (
                      <>
                        , <span className="tabular">{pesos(resumen.extraContraPromedio)}</span> más que el promedio
                      </>
                    )}
                    .
                  </>
                ) : (
                  <>
                    {unidad} 1.000 te cuestan <span className="tabular font-medium text-text">{pesos(resumen.mejor.costoMil)}</span>
                    {resumen.ahorroContraPromedio > 1 && (
                      <>
                        , <span className="tabular">{pesos(resumen.ahorroContraPromedio)}</span> menos que el promedio de {resumen.cantidad} proveedores
                      </>
                    )}
                    .
                  </>
                )}
              </p>
            </div>
          )}

          <DataTable
            etiqueta={`Ranking de ${unidad}`}
            filas={lista}
            columnas={columnas}
            clave={(p) => p.id}
            esMejor={(_, i) => i === 0}
            onClickFila={setDetalle}
            filaMovil={(p, i) => (
              <span className="flex items-center gap-3">
                <span className={cn("tabular w-4 text-chico", i === 0 ? "font-semibold text-accent" : "text-text-3")}>{i + 1}</span>
                <ProviderMark proveedorId={p.id} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[15px] font-medium">
                    <span className="truncate">{p.nombre}</span>
                    {i === 0 && <EtiquetaMejor />}
                  </span>
                  <span className="block text-chico text-text-3">
                    {criterio === "vender" ? `Recibís ${pesos(p.recibisMil)}` : `${unidad} 1.000: ${pesos(p.costoMil)}`}
                  </span>
                </span>
                <span className="text-right">
                  <span className="tabular block text-[15px] font-medium">{pesos(criterio === "vender" ? p.vendes : p.compras, 2)}</span>
                  <span className="block text-micro">{criterio === "vender" ? "vendés a" : criterio === "spread" ? `spread ${porcentaje(p.spread, 1)}` : "comprás a"}</span>
                </span>
              </span>
            )}
            vacio={<ErrorState titulo="Ningún proveedor cumple ese filtro." detalle="Probá sin “Solo 24/7”." />}
          />

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-2">
              <EstadoDiscreto estado={r.status} asOf={r.asOf} className="self-start" />
            </div>
            {resumen && (
              <MetricExplainer
                titulo={`¿Cuánto cuestan ${unidad} 1.000 en ${resumen.mejor.nombre}?`}
                formula="Costo = 1.000 × precio final (con comisiones)"
                pasos={[
                  { etiqueta: "Precio de pizarra", valor: pesos(resumen.mejor.pizarraCompra, 2) },
                  { etiqueta: "Precio final con comisiones", valor: pesos(resumen.mejor.compras, 2) },
                  { etiqueta: "Cantidad", valor: `${unidad} 1.000` },
                ]}
                resultado={pesos(resumen.mejor.costoMil)}
                fuente={activo === "USD" ? "CriptoYa y ComparaDolar" : "CriptoYa"}
                ancla="/metodologia#dolar"
              />
            )}
          </div>

          {r.data.especiales.length > 0 && (
            <Desplegable abierto={verEspeciales} onCambio={setVerEspeciales} titulo={`Precios con condiciones especiales (${r.data.especiales.length})`} ayuda="No son comparables con el ranking: dependen de una cuenta, de la contraparte o de un medio de pago.">
              <ul className="flex flex-col">
                {r.data.especiales.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                    <ProviderMark proveedorId={p.id} sigla={p.id === "mep-broker" ? "ME" : undefined} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium">{p.nombre}</p>
                      <p className="text-chico text-text-3">{p.condicion}</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular text-[15px] font-medium">{pesos(p.compras, 2)}</p>
                      <p className="tabular text-micro">vendés a {pesos(p.vendes, 2)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Desplegable>
          )}

          {r.excluded && r.excluded.length > 0 && (
            <Desplegable abierto={verExcluidos} onCambio={setVerExcluidos} titulo={`Excluimos ${r.excluded.length} cotizaciones. ¿Por qué?`} ayuda="Validamos cada precio antes de mostrarlo: así no ves un dato viejo como si fuera de hoy.">
              <ul className="flex flex-col">
                {r.excluded.map((e) => (
                  <li key={e.id} className="flex justify-between gap-4 border-b border-border py-2.5 text-chico last:border-0">
                    <span>{e.id}</span>
                    <span className="text-right text-text-3">{e.reason}</span>
                  </li>
                ))}
              </ul>
            </Desplegable>
          )}
        </>
      )}

      <Sheet abierto={detalle !== null} onCambio={(v) => !v && setDetalle(null)} titulo={detalle?.nombre ?? ""} descripcion={detalle ? `${TIPO[detalle.tipo] ?? ""} · ${unidad}` : undefined}>
        {detalle && <DetalleProveedor p={detalle} unidad={unidad} />}
      </Sheet>
    </div>
  );
}

function DetalleProveedor({ p, unidad }: { p: ProveedorDolar; unidad: string }) {
  const meta = proveedorPorId(p.id) ?? resolverProveedor(p.id);
  const filas = [
    ["Comprás a", pesos(p.compras, 2)],
    ["Vendés a", pesos(p.vendes, 2)],
    ["Spread", porcentaje(p.spread, 2)],
    [`${unidad} 1.000 te cuestan`, pesos(p.costoMil)],
    [`Por ${unidad} 1.000 recibís`, pesos(p.recibisMil)],
    ["Precio de pizarra", `${numero(p.pizarraCompra, 2)} / ${numero(p.pizarraVenta, 2)}`],
    ["Opera 24/7", p.opera247 ? "Sí" : "No"],
    ["Regulación", meta.regulador ?? "Sin dato"],
    ["Actualizado", hora(p.asOf)],
  ];
  return (
    <div className="flex flex-col gap-6">
      <dl>
        {filas.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-0">
            <dt className="text-chico text-text-2">{k}</dt>
            <dd className="tabular font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <PartnerCTA proveedorId={p.id} nombre={p.nombre} />
      <p className="text-micro">Los precios finales incluyen las comisiones que informa el proveedor. Verificá condiciones y límites en su app antes de operar.</p>
    </div>
  );
}

function Desplegable({ titulo, ayuda, abierto, onCambio, children }: { titulo: string; ayuda: string; abierto: boolean; onCambio: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <section className="border-t border-border">
      <button type="button" aria-expanded={abierto} onClick={() => onCambio(!abierto)} className="flex w-full items-center justify-between gap-4 py-4 text-left">
        <span>
          <span className="block text-[15px] font-medium">{titulo}</span>
          <span className="block text-chico text-text-3">{ayuda}</span>
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-text-3 transition-transform duration-(--duration-base) ease-(--ease-standard)", abierto && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {abierto && (
          <m.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }} className="pb-4">
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}
