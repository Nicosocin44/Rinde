import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

let fuente: Promise<Buffer> | null = null;

/**
 * Ícono de la app: la "r" del logotipo (Bricolage extra negrita, blanca) con el punto de sol, sobre un cuadrado casi
 * negro (pedido de Nico, 22/11/2026). `redondeado` para la pestaña del navegador (las puntas quedan transparentes);
 * el de Apple y los del manifest van cuadrados porque el sistema les pone su propia máscara. `zona` achica la letra
 * para los íconos "maskable", que Android recorta en círculo.
 */
export async function icono(tam: number, { redondeado = false, zona = 1 }: { redondeado?: boolean; zona?: number } = {}) {
  const bricolage = await (fuente ??= readFile(join(process.cwd(), "assets/og", "Bricolage-ExtraBold.ttf")));
  const letra = tam * 0.66 * zona;
  const punto = tam * 0.13 * zona;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#141414", borderRadius: redondeado ? tam * 0.24 : 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: tam * 0.025 * zona, marginTop: -tam * 0.06 * zona }}>
          <span style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: letra, lineHeight: 1, letterSpacing: -letra * 0.04, color: "#ffffff" }}>r</span>
          <span style={{ width: punto, height: punto, borderRadius: 999, background: "#ffc93c", marginBottom: letra * 0.17 }} />
        </div>
      </div>
    ),
    { width: tam, height: tam, fonts: [{ name: "Bricolage", data: bricolage, weight: 800, style: "normal" }] },
  );
}
