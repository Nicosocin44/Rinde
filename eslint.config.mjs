import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "next-env.d.ts", ".shots/**", "playwright-report/**", "test-results/**", "public/sw.js"]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Regla 6 de CLAUDE.md: los rankings no pueden leer el registro de afiliados.
    files: ["src/lib/rankings/**", "src/lib/data/**", "src/lib/insights/**", "src/lib/calculos/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/partners", "@/lib/partners"],
              message: "Los rankings y los datos no pueden depender del registro de afiliados (regla de neutralidad).",
            },
          ],
        },
      ],
    },
  },
]);
