import { icono } from "@/lib/icono";

/** Íconos del manifest: /iconos/192, /iconos/512 y /iconos/maskable (512 con zona segura). */
export async function GET(_req: Request, ctx: { params: Promise<{ tam: string }> }) {
  const { tam } = await ctx.params;
  if (tam === "maskable") return icono(512, 0.3);
  const n = Number(tam);
  if (n !== 192 && n !== 512) return new Response("No existe", { status: 404 });
  return icono(n, 0.2);
}

export function generateStaticParams() {
  return [{ tam: "192" }, { tam: "512" }, { tam: "maskable" }];
}
