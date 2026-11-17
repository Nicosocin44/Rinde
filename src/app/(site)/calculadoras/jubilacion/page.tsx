import type { Metadata } from "next";
import { Jubilacion } from "@/components/modules/calculadoras/jubilacion";

export const metadata: Metadata = { title: "Calculadora de jubilación y metas", description: "Cuánto tenés que ahorrar por mes, en dólares, para jubilarte o llegar a una meta." };

export default function Page() {
  return (
    <>
      <h2 className="mb-8 text-h2">¿Cuánto tengo que ahorrar por mes para llegar?</h2>
      <Jubilacion />
    </>
  );
}
