import { describe, expect, it } from "vitest";
import { rutaActiva } from "@/lib/rutas";

describe("rutaActiva", () => {
  it("marca Inicio en la portada, también cuando Next.js la entrega como /index", () => {
    expect(rutaActiva("/", "/")).toBe(true);
    expect(rutaActiva("/index", "/")).toBe(true);
  });

  it("Inicio no queda marcado en otras secciones", () => {
    expect(rutaActiva("/dolar", "/")).toBe(false);
    expect(rutaActiva("/indexados", "/")).toBe(false);
  });

  it("marca la sección y sus páginas internas", () => {
    expect(rutaActiva("/dolar", "/dolar")).toBe(true);
    expect(rutaActiva("/dolar/comprar", "/dolar")).toBe(true);
  });

  it("no confunde secciones que empiezan igual", () => {
    expect(rutaActiva("/pesos-extra", "/pesos")).toBe(false);
    expect(rutaActiva("/", "/dolar")).toBe(false);
  });
});
