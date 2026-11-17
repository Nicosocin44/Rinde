import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site } from "@/config/site";

/**
 * Plantilla de imágenes para compartir (OG, historias, WhatsApp): grafito, cifra grande, wordmark chico.
 * Mismo sistema que el sitio. Satoshi en TTF estático (Satori no lee woff2 ni fuentes variables).
 */
let fuentes: Promise<{ medium: Buffer; bold: Buffer }> | null = null;
function cargarFuentes() {
  fuentes ??= Promise.all([readFile(join(process.cwd(), "assets/og/Satoshi-Medium.ttf")), readFile(join(process.cwd(), "assets/og/Satoshi-Bold.ttf"))]).then(([medium, bold]) => ({ medium, bold }));
  return fuentes;
}

export type ContenidoImagen = {
  etiqueta: string;
  cifra: string;
  detalle?: string;
  /** Filas chicas abajo (ej. otros dólares). */
  filas?: { k: string; v: string }[];
  pie?: string;
};

export async function imagenRinde(c: ContenidoImagen, { ancho = 1200, alto = 630 }: { ancho?: number; alto?: number } = {}) {
  const { medium, bold } = await cargarFuentes();
  const vertical = alto > ancho;
  const escala = vertical ? 1.15 : 1;
  const largoCifra = c.cifra.length;
  const tamCifra = Math.round((largoCifra > 14 ? 104 : largoCifra > 10 ? 128 : 156) * escala);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0b0c0e", color: "#f3f4f6", padding: vertical ? 96 : 72, fontFamily: "Satoshi" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 30 }}>
            <div style={{ width: 7, height: 12, borderRadius: 2, background: "#80868f" }} />
            <div style={{ width: 7, height: 19, borderRadius: 2, background: "#a3a8b1" }} />
            <div style={{ width: 7, height: 28, borderRadius: 2, background: "#7ab8f5" }} />
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1.2 }}>{site.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: vertical ? 28 : 18 }}>
          <div style={{ fontSize: 26 * escala, fontWeight: 500, letterSpacing: 3, textTransform: "uppercase", color: "#80868f" }}>{c.etiqueta}</div>
          <div style={{ fontSize: tamCifra, fontWeight: 500, letterSpacing: -5, lineHeight: 1 }}>{c.cifra}</div>
          {c.detalle && <div style={{ fontSize: 34 * escala, fontWeight: 500, color: "#a3a8b1", lineHeight: 1.35, maxWidth: ancho - 200 }}>{c.detalle}</div>}
          {c.filas && (
            <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", gap: vertical ? 18 : 48, marginTop: 16 }}>
              {c.filas.map((f) => (
                <div key={f.k} style={{ display: "flex", flexDirection: vertical ? "row" : "column", justifyContent: "space-between", gap: 6, fontSize: 28 * escala }}>
                  <span style={{ color: "#80868f" }}>{f.k}</span>
                  <span style={{ fontWeight: 700 }}>{f.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#80868f" }}>
          <span>{c.pie ?? site.url.replace(/^https?:\/\//, "")}</span>
          <span>No es una recomendación de inversión</span>
        </div>
      </div>
    ),
    {
      width: ancho,
      height: alto,
      fonts: [
        { name: "Satoshi", data: medium, weight: 500, style: "normal" },
        { name: "Satoshi", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
