import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site } from "@/config/site";

/**
 * Plantilla de imágenes para compartir (OG, historias, WhatsApp), con el sistema del rediseño:
 * fondo tinta, wordmark en minúscula con punto sol, y la cifra protagonista dentro de una píldora del
 * color de su tema (verde dólar, celeste tasas, sol lo del día, lila cartera, coral inflación).
 * Fuentes en TTF estático porque Satori no lee woff2 ni fuentes variables.
 */
let fuentes: Promise<{ display: Buffer; displayMedia: Buffer; texto: Buffer }> | null = null;
function cargarFuentes() {
  const leer = (f: string) => readFile(join(process.cwd(), "assets/og", f));
  fuentes ??= Promise.all([leer("Bricolage-ExtraBold.ttf"), leer("Bricolage-Medium.ttf"), leer("InstrumentSans-Medium.ttf")]).then(([display, displayMedia, texto]) => ({ display, displayMedia, texto }));
  return fuentes;
}

const COLORES = { verde: "#3ddc84", celeste: "#7dc1ff", sol: "#ffc93c", lila: "#c3b1ff", coral: "#ff8a65" } as const;
const TINTA = "#0d0d0c";
const PAPEL = "#f4f3ef";
const GRIS = "#9a9890";

export type ContenidoImagen = {
  etiqueta: string;
  cifra: string;
  detalle?: string;
  /** Filas chicas abajo (ej. otros dólares). */
  filas?: { k: string; v: string }[];
  pie?: string;
  /** Color del tema de la cifra. */
  color?: keyof typeof COLORES;
  /** Barra de avance (0 a 1), por ejemplo el de una meta. */
  progreso?: number;
};

export const COLORES_IMAGEN = ["verde", "celeste", "sol", "lila", "coral"] as const;

export async function imagenRinde(c: ContenidoImagen, { ancho = 1200, alto = 630 }: { ancho?: number; alto?: number } = {}) {
  const { display, displayMedia, texto } = await cargarFuentes();
  const vertical = alto > ancho;
  const escala = vertical ? 1.15 : 1;
  const largo = c.cifra.length;
  const tamCifra = Math.round((largo > 16 ? 84 : largo > 12 ? 104 : largo > 9 ? 124 : 148) * escala);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: TINTA, color: PAPEL, padding: vertical ? 96 : 68, fontFamily: "Instrument" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
          <span style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: 46, letterSpacing: -2.6, lineHeight: 1 }}>{site.name.toLowerCase()}</span>
          <span style={{ width: 13, height: 13, borderRadius: 99, background: COLORES.sol, marginBottom: 7 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: vertical ? 30 : 20 }}>
          <div style={{ fontSize: 30 * escala, color: GRIS }}>{c.etiqueta}</div>
          <div
            style={{
              display: "flex",
              fontFamily: "Bricolage",
              fontWeight: 800,
              fontSize: tamCifra,
              letterSpacing: -tamCifra * 0.045,
              lineHeight: 1,
              color: TINTA,
              background: COLORES[c.color ?? "sol"],
              borderRadius: tamCifra * 0.3,
              padding: `${tamCifra * 0.08}px ${tamCifra * 0.2}px ${tamCifra * 0.12}px`,
              transform: "rotate(-2deg)",
            }}
          >
            {c.cifra}
          </div>
          {c.detalle && <div style={{ fontFamily: "BricolageMedia", fontSize: 36 * escala, lineHeight: 1.25, letterSpacing: -0.6, maxWidth: ancho - 180, marginTop: 6 }}>{c.detalle}</div>}
          {c.progreso !== undefined && (
            <div style={{ display: "flex", width: ancho - (vertical ? 192 : 136), height: 28 * escala, borderRadius: 99, background: "#2a2a27", marginTop: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", width: `${Math.round(Math.min(1, Math.max(0, c.progreso)) * 100)}%`, height: "100%", borderRadius: 99, background: COLORES[c.color ?? "sol"] }} />
            </div>
          )}
          {c.filas && c.filas.length > 0 && (
            <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", gap: vertical ? 18 : 56, marginTop: 6 }}>
              {c.filas.map((f) => (
                <div key={f.k} style={{ display: "flex", flexDirection: vertical ? "row" : "column", justifyContent: "space-between", gap: 4, fontSize: 28 * escala }}>
                  <span style={{ color: GRIS }}>{f.k}</span>
                  <span style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: 36 * escala, letterSpacing: -1 }}>{f.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: GRIS }}>
          <span>{c.pie ?? site.url.replace(/^https?:\/\//, "")}</span>
          <span>No es una recomendación de inversión</span>
        </div>
      </div>
    ),
    {
      width: ancho,
      height: alto,
      fonts: [
        { name: "Bricolage", data: display, weight: 800, style: "normal" },
        { name: "BricolageMedia", data: displayMedia, weight: 500, style: "normal" },
        { name: "Instrument", data: texto, weight: 500, style: "normal" },
      ],
    },
  );
}
