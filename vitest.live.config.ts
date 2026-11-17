import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

/** Tests contra las fuentes reales: `pnpm test:live`. No corren en `pnpm test` (dependen de Internet). */
export default mergeConfig(
  base,
  defineConfig({
    test: { include: ["tests/live/**/*.live.ts"], exclude: [], testTimeout: 60_000 },
  }),
);
