import { ImageResponse } from "next/og";

/** Ícono de la app: las tres barras crecientes del wordmark sobre grafito. `margen` para íconos "maskable". */
export function icono(tam: number, margen = 0.22) {
  const lado = tam * (1 - margen * 2);
  const ancho = lado * 0.2;
  const hueco = lado * 0.1;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0c0e" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: hueco, height: lado * 0.8 }}>
          <div style={{ width: ancho, height: lado * 0.36, borderRadius: ancho * 0.28, background: "#80868f" }} />
          <div style={{ width: ancho, height: lado * 0.56, borderRadius: ancho * 0.28, background: "#a3a8b1" }} />
          <div style={{ width: ancho, height: lado * 0.8, borderRadius: ancho * 0.28, background: "#7ab8f5" }} />
        </div>
      </div>
    ),
    { width: tam, height: tam },
  );
}
