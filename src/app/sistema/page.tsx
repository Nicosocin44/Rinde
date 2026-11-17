import type { Metadata } from "next";
import Link from "next/link";
import { ToggleModo, ToggleTema } from "@/components/shell/preferencias-controles";
import { ShellProvider } from "@/components/shell/shell-context";
import { Wordmark } from "@/components/shell/wordmark";
import { Vitrina } from "./vitrina";

export const metadata: Metadata = { title: "Sistema de diseño", robots: { index: false, follow: false } };

/** Vitrina interna del design system (noindex): para revisar y corregir tokens y componentes en dark y light. */
export default function Sistema() {
  return (
    <ShellProvider>
      <div className="contenedor py-10 lg:py-16">
        <header className="mb-12 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Wordmark />
            <span className="text-chico text-text-3">Sistema de diseño · uso interno</span>
          </div>
          <div className="flex items-center gap-2">
            <ToggleModo />
            <ToggleTema />
            <Link href="/" className="ml-2 text-chico text-text-2 hover:text-text">
              Volver al sitio
            </Link>
          </div>
        </header>
        <h1 className="mb-3 text-h1">Calma con pulso.</h1>
        <p className="mb-12 max-w-2xl text-text-2">Tokens, tipografía, controles, overlays, datos, gráficos y estados. Cada pieza sigue docs/DISENO.md; si algo se ve mal acá, se ve mal en todo el sitio.</p>
        <Vitrina />
      </div>
    </ShellProvider>
  );
}
