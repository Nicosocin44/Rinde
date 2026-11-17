import { Suspense } from "react";
import { VigiaAlertas } from "@/components/modules/alertas/vigia";
import { BottomBar } from "@/components/shell/bottom-bar";
import { AtajoPaleta } from "@/components/shell/atajo-paleta";
import { Footer } from "@/components/shell/footer";
import { PulseBar } from "@/components/shell/pulse-bar";
import { ShellProvider } from "@/components/shell/shell-context";
import { TopNav } from "@/components/shell/top-nav";
import { ToastProvider } from "@/components/ui/toast";
import { obtenerPulso } from "@/lib/data";

/**
 * Marco del sitio. Cada isla interactiva va en su propio <Suspense>: React las hidrata por separado y le
 * devuelve el control al navegador entre una y otra (menos bloqueo del hilo principal en celulares).
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const pulso = await obtenerPulso();
  return (
    <ShellProvider>
      <ToastProvider>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-inverse focus:px-4 focus:py-2 focus:text-on-inverse">
          Saltar al contenido
        </a>
        <Suspense>
          <TopNav />
        </Suspense>
        <Suspense>
          <PulseBar inicial={pulso} />
        </Suspense>
        <main id="contenido" className="contenedor min-h-[60vh]">
          {children}
        </main>
        <Footer />
        <Suspense>
          <BottomBar />
        </Suspense>
        <AtajoPaleta />
        <VigiaAlertas />
      </ToastProvider>
    </ShellProvider>
  );
}
