import type { Metadata } from "next";
import { RankingBrokers } from "@/components/modules/brokers/ranking-brokers";

export const metadata: Metadata = {
  title: "Comisiones de los brokers: cuánto cobra cada uno",
  description: "Cocos, IOL, Balanz, Bull Market y PPI: cuánto te cobra cada broker por comprar acciones, CEDEARs, bonos, letras y opciones, con IVA, ordenado del más barato al más caro.",
};

/** Mercados → Brokers: el comparador completo de comisiones, con la fuente de cada tarifario. */
export default function Brokers() {
  return <RankingBrokers completo />;
}
