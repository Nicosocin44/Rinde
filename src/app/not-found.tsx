import type { Metadata } from "next";
import NoEncontrado from "@/components/modules/contenido/no-encontrado";
import SiteLayout from "./(site)/layout";

export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false } };

/** 404 global con el mismo marco del sitio (nav, pulso, footer). */
export default function NotFound() {
  return (
    <SiteLayout>
      <NoEncontrado />
    </SiteLayout>
  );
}
