"use client";

import { Share } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { useToast } from "./toast";

/**
 * "Compartir resultado": genera una imagen (1080×1350, para historias y WhatsApp) con la cifra y el contexto.
 * En el celular abre el menú nativo de compartir; en la compu la descarga.
 */
export function CompartirResultado({
  titulo,
  cifra,
  detalle,
  nombreArchivo = "resultado",
  progreso,
  color,
  texto = "Compartir resultado",
  tamano,
}: {
  titulo: string;
  cifra: string;
  detalle: string;
  nombreArchivo?: string;
  /** Barra de avance en la imagen (0 a 1). */
  progreso?: number;
  color?: "verde" | "celeste" | "sol" | "lila" | "coral";
  /** Texto del botón. */
  texto?: string;
  tamano?: "sm" | "md";
}) {
  const toast = useToast();
  const [generando, setGenerando] = useState(false);

  const compartir = async () => {
    setGenerando(true);
    const params = new URLSearchParams({ t: titulo, c: cifra, d: detalle });
    if (progreso !== undefined) params.set("p", String(Math.round(progreso * 100)));
    if (color) params.set("col", color);
    const url = `/api/compartir?${params}`;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const archivo = new File([blob], `${nombreArchivo}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [archivo] })) {
        await nav.share({ files: [archivo], title: titulo });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = archivo.name;
        a.click();
        URL.revokeObjectURL(a.href);
        toast("Descargamos la imagen para que la compartas");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast("No pudimos generar la imagen. Probá de nuevo.");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Button onClick={compartir} disabled={generando} variante="secundario" tamano={tamano}>
      <Share />
      {generando ? "Generando…" : texto}
    </Button>
  );
}
