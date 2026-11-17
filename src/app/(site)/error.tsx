"use client";

import { Button } from "@/components/ui/button";

/** Error boundary de las páginas: si algo falla, la página no se cae entera y se puede reintentar. */
export default function ErrorPagina({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col justify-center gap-4 py-20">
      <p className="text-label">Algo salió mal</p>
      <h1 className="text-h1 max-w-2xl text-balance">No pudimos mostrar esta pantalla.</h1>
      <p className="max-w-lg text-text-2">Puede ser una fuente de datos que no respondió. El resto del sitio funciona.</p>
      <div>
        <Button variante="primario" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}
