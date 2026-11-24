import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import carteras from "../data/inversores/carteras.json";
import { FOTOS_INVERSORES, LOGOS_INVERSORES } from "@/config/fotos-inversores";

describe("fotos y logos de los inversores", () => {
  const slugs = new Set((carteras as { inversores: { slug: string }[] }).inversores.map((i) => i.slug));

  it("cada foto es de un inversor que se muestra", () => {
    for (const slug of Object.keys(FOTOS_INVERSORES)) expect(slugs.has(slug), slug).toBe(true);
  });

  it("cada foto tiene su archivo en public/", () => {
    for (const f of Object.values(FOTOS_INVERSORES)) expect(existsSync(join(process.cwd(), "public", f.src)), f.src).toBe(true);
  });

  it("cada logo es de un fondo de la lista, tiene su archivo y no pisa una foto", () => {
    for (const [slug, l] of Object.entries(LOGOS_INVERSORES)) {
      expect(slugs.has(slug), slug).toBe(true);
      expect(existsSync(join(process.cwd(), "public", l.src)), l.src).toBe(true);
      expect(FOTOS_INVERSORES[slug], slug).toBeUndefined();
      expect(l.fuente.startsWith("https://"), slug).toBe(true);
    }
  });

  it("cada foto tiene autor y fuente, y link a la licencia salvo las de dominio público", () => {
    for (const f of Object.values(FOTOS_INVERSORES)) {
      expect(f.autor.length, f.persona).toBeGreaterThan(0);
      expect(f.fuente.startsWith("https://commons.wikimedia.org/wiki/File:"), f.persona).toBe(true);
      if (f.licencia !== "dominio público") expect(f.licenciaUrl?.startsWith("https://creativecommons.org/licenses/"), f.persona).toBe(true);
    }
  });
});
