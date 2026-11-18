import { BONOS_USD } from "@data/ar/bonos-usd";
import { LECAPS } from "@data/ar/lecaps";
import { ACCIONES_GENERAL, CEDEARS, PANEL_LIDER } from "@data/ar/mercados";
import { PROVEEDORES } from "@data/ar/proveedores";
import type { ItemBusqueda } from "@/components/shell/command-palette";

/** Índice de la paleta ⌘K: instrumentos y proveedores. Es estático: se arma una vez y se cachea. */
export const revalidate = 86400;

export function GET() {
  const items: ItemBusqueda[] = [
    ...LECAPS.map((l) => ({ id: `l-${l.ticker}`, titulo: l.ticker, detalle: `${l.tipo} · vence ${l.vencimiento.split("-").reverse().join("/")}`, grupo: "Instrumentos" as const, href: `/pesos/lecaps?t=${l.ticker}`, claves: "lecap boncap letra" })),
    ...BONOS_USD.map((b) => ({ id: `b-${b.ticker}`, titulo: b.ticker, detalle: `${b.nombre} · ley ${b.ley === "Argentina" ? "local" : "NY"}`, grupo: "Instrumentos" as const, href: `/bonos?t=${b.ticker}`, claves: "bono soberano dolares" })),
    ...Object.entries(CEDEARS).map(([t, c]) => ({ id: `c-${t}`, titulo: t, detalle: `${c.nombre} · CEDEAR`, grupo: "Instrumentos" as const, href: `/activo/${encodeURIComponent(t)}`, claves: `cedear ${c.nombre}` })),
    ...Object.entries({ ...PANEL_LIDER, ...ACCIONES_GENERAL }).map(([t, n]) => ({ id: `a-${t}`, titulo: t, detalle: `${n} · acción`, grupo: "Instrumentos" as const, href: `/activo/${t}`, claves: `accion ${n}` })),
    ...PROVEEDORES.filter((p) => p.tipo !== "p2p" && p.tipo !== "fondo").map((p) => ({
      id: `p-${p.id}`,
      titulo: p.nombre,
      detalle: { banco: "Banco", casa_de_cambio: "Casa de cambio", billetera: "Billetera", exchange: "Exchange cripto", p2p: "P2P", broker: "Broker", fondo: "" }[p.tipo],
      grupo: "Proveedores" as const,
      href: p.tipo === "exchange" ? "/dolar/comprar?activo=USDT" : p.tipo === "broker" ? "/pesos/fci" : p.tipo === "banco" ? "/pesos/plazo-fijo" : "/pesos/billeteras",
      claves: (p.alias ?? []).join(" "),
    })),
  ];
  return Response.json(items);
}
