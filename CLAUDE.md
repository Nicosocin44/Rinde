# CLAUDE.md · Rinde (nombre provisorio)

Plataforma web de finanzas para el ahorrista e inversor argentino, con LatAm como paso siguiente. Muestra el dólar y dónde conviene comprarlo, las tasas en pesos, LECAPs, bonos, ONs, CEDEARs y cripto. Suma calculadoras, seguimiento de cartera y alertas. El diseño apunta al nivel de Apple y Whoop: limpio, moderno y con movimiento cuidado. **No tiene que parecer hecho por una IA.**

El nombre "Rinde" es provisorio. Vive en una sola constante (`src/config/site.ts`) para poder cambiarlo en un minuto.

---

## Leé esto primero, en este orden

1. `docs/CONTEXTO.md`: de dónde sale la idea (charla de los fundadores, capturas, auditoría de la competencia).
2. `docs/PRODUCTO.md`: qué construimos, para quién, módulos, insights y monetización.
3. `docs/DISENO.md`: el sistema de diseño. **Es contrato, no sugerencia.**
4. `docs/DATOS_Y_FORMULAS.md`: fuentes, adaptadores, validaciones y fórmulas.
5. `docs/ROADMAP.md`: fases y criterios de terminado.
6. `docs/DEPLOY.md`: cómo se publica.
7. `docs/PROGRESO.md`: lo creás y mantenés vos (ver "Forma de trabajo").

---

## Stack

| Capa | Elección | Nota |
|---|---|---|
| Framework | Next.js, última estable (16.x), App Router | Server Components por defecto |
| Lenguaje | TypeScript `strict` | Sin `any` salvo en el borde de un adapter, y validado con Zod |
| Estilos | Tailwind CSS v4 con tokens en CSS variables | Los tokens salen de `DISENO.md` |
| Primitivas | Radix (vía shadcn/ui como punto de partida) | **Restyleadas por completo**. El look por defecto de shadcn está prohibido |
| Animación | Motion (motion.dev, ex Framer Motion) + View Transitions API | Ver tokens de motion en `DISENO.md` |
| Gráficos | TradingView Lightweight Charts (series de precio) + visx o d3-shape con SVG propio (curvas, scatter, barras, sparklines) | Nada de Recharts con estilos por defecto. Lightweight Charts pide atribución: respetarla |
| Validación | Zod | Todo dato externo pasa por un schema |
| Dinero | decimal.js | Nunca `number` para montos en cálculos |
| Fechas | date-fns + locale `es` | Días hábiles con feriados de Argentina |
| Tests | Vitest (unit, golden tests) + Playwright (e2e y capturas) | |
| Persistencia v1 | Local-first (IndexedDB con Dexie) detrás de la interfaz `PortfolioRepository` | v2: Supabase (Postgres + Auth), misma interfaz |
| PWA | `app/manifest.ts` + Serwist | Instalable en el celular |
| Paquetes | pnpm | |

---

## Comandos (dejalos funcionando)

```
pnpm dev          # desarrollo en http://localhost:3000
pnpm build        # build de producción
pnpm test         # Vitest
pnpm test:e2e     # Playwright
pnpm lint
pnpm typecheck
pnpm shots        # capturas de todas las rutas: 375 / 768 / 1440, dark y light → ./.shots
```

---

## Estructura

```
src/
  app/
    (site)/                  # rutas públicas: /, /dolar, /pesos, /bonos, /mercados, /calculadoras, /cartera, /alertas, /calendario, /aprender, /metodologia, /legal
    sistema/                 # vitrina interna del design system (noindex)
    api/                     # route handlers: normalizan, validan y cachean datos externos (BFF)
    manifest.ts
  components/
    ui/                      # primitivas del design system (Button, SegmentedControl, Card, Stat, Delta, NumberTicker, DataTable, Sheet, CommandPalette, MetricExplainer…)
    charts/                  # PriceChart, YieldCurve, Sparkline, AllocationDonut, BarCompare
    modules/                 # dolar/, pesos/, bonos/, mercados/, cartera/, calculadoras/, alertas/, inicio/
  lib/
    calculos/                # PURO, sin IO, 100% testeado: tasas.ts, lecaps.ts, cer.ts, bonos.ts, rendimiento.ts (TWR, XIRR), interes-compuesto.ts, inflacion.ts, dolar.ts
    data/
      adapters/              # uno por fuente: dolarapi.ts, argentinadatos.ts, bcra.ts, data912.ts, criptoya.ts…
      schemas/               # Zod
      cache.ts
      freshness.ts           # En vivo / Demorado / Cierre / Datos de ejemplo
    insights/                # motor de reglas de "¿dónde rendiría más mi plata?"
    format.ts                # Intl es-AR: moneda, %, puntos básicos, fechas relativas
    partners.ts              # registro de afiliados (ver reglas)
  config/
    site.ts                  # nombre, URLs, redes
    countries/ar.ts          # moneda, feriados, fuentes; preparado para sumar UY, CL, MX
data/
  ar/                        # estáticos versionados: lecaps.ts (vencimiento, TEM de emisión, valor final), bonos-usd.ts (flujos), proveedores.ts (metadatos de bancos, billeteras y exchanges)
tests/
  fixtures/                  # golden tests calculados a mano
```

---

## Reglas no negociables

1. **Dinero nunca en float.** decimal.js en todos los cálculos. Formato siempre con Intl `es-AR`: `$ 1.234.567,89`, `24,50 %`, `+0,25 %`.
2. **Ningún número sin procedencia.** Todo dato de mercado muestra fuente, hora y estado: *En vivo*, *Demorado 20 min*, *Cierre del día* o *Datos de ejemplo*. Jamás inventar un valor ni mostrar datos de ejemplo como si fueran reales.
3. **Cada fuente externa entra por un adapter** con schema Zod, timeout, caché y fallback. Si una fuente falla, ese widget se degrada con elegancia (último dato válido con su hora, o un estado de error diseñado). **Nunca se cae la página entera.** Cada módulo va dentro de su propio error boundary.
4. **Validación de sanidad antes de mostrar.** Se excluyen instrumentos vencidos, tasas fuera de rango plausible y filas duplicadas. Ver `DATOS_Y_FORMULAS.md` §4. La competencia muestra una LECAP vencida con 13.426 % de TEM que rompe el gráfico: eso no nos puede pasar.
5. **Los cálculos son funciones puras** en `src/lib/calculos/`, con golden tests. Si en esta carpeta ya existe un `src/lib/calculos.ts` de un proyecto anterior (con TWR y TIR testeadas), reutilizalo: migralo a la estructura nueva sin cambiar resultados y conservá sus tests.
6. **Rankings neutrales.** Comparadores y rankings ordenan solo por métricas objetivas. Ser afiliado nunca cambia el orden: el ordenamiento no puede leer campos de `partners.ts`, y hay un test que lo verifica. Todo link de afiliado se rotula ("Enlace de afiliado"). Todo espacio pago se rotula ("Patrocinado").
7. **Sin asesoramiento personalizado.** Los insights son comparaciones transparentes, con la cuenta a la vista ("tus $2M en X rinden 32 % TNA; en Y, 36 %: son $6.600 más por mes"). Nunca "comprá X" o "vendé Y". Hay disclaimer en el footer, en cartera y en cada insight.
8. **UI 100 % en español rioplatense** (voseo), tono directo y claro. Los términos del dominio quedan en español en el código (`tna`, `tea`, `tem`, `lecap`, `cuotaparte`). El resto del código va en inglés. Sé consistente.
9. **El diseño manda.** Seguí `DISENO.md`. Antes de dar por terminada una pantalla corré `pnpm shots`, mirá las capturas y pasá el checklist anti-"hecho por IA" (§13 de `DISENO.md`). Si falla, se corrige antes de seguir.
10. **Accesibilidad AA.** Contraste, foco visible, navegación por teclado y `prefers-reduced-motion` respetado.
11. **Performance.** LCP < 2,5 s en 4G, CLS < 0,05. Componentes de cliente solo donde hay interacción. Fuentes self-hosted con `next/font`.
12. **Cero secretos en el repo.** `.env.example` documentado. Las API keys (si alguna fuente las pide) van en variables de entorno.

---

## Forma de trabajo

- **Módulos verticales completos:** datos → cálculo → UI → estados (carga, vacío, error) → tests → capturas. No dejes diez pantallas a medias.
- **Mantené `docs/PROGRESO.md`** con:
  - qué está hecho y qué falta;
  - qué usa datos reales y qué usa datos de ejemplo, con el motivo;
  - fuentes verificadas (endpoint, fecha y si respondió);
  - **"Decisiones para revisar"**: las decisiones de producto o diseño que tomaste solo, para que los fundadores las validen.
- **Verificá antes de suponer.** Si la documentación de una API no coincide con lo que responde, hacé un request real, mirá la forma y adaptá. Anotalo en PROGRESO.md.
- **Ante una ambigüedad de producto,** elegí la opción más razonable para un usuario argentino común, anotala en "Decisiones para revisar" y seguí. Frená solo ante un bloqueo real (credenciales, pagos, cuentas de terceros).
- **Git:** commits chicos y descriptivos, uno por avance coherente. Seguí `COMO_TRABAJAMOS.md`: los cambios importantes (cálculos, datos, rankings, afiliados, reglas del proyecto, dependencias, legales, borrados o cambios grandes) van en una rama con Pull Request para que el otro socio los revise. Nunca los subas directo a `main` ni hagas `push --force`.
- **Las correcciones de los fundadores** llegan como capturas o frases ("en /dolar la tabla se ve apretada en mobile"). Aplicalas y, si cambian una regla, actualizá el doc correspondiente.

---

## Definición de terminado (vale para cualquier pantalla)

- [ ] Funciona con datos reales, o con datos de ejemplo **rotulados** si la fuente todavía no existe.
- [ ] Estados de carga (skeleton con el mismo layout), vacío y error, todos diseñados.
- [ ] Revisada en capturas a 375, 768 y 1440 px, en dark y en light.
- [ ] Pasa el checklist de `DISENO.md` §13.
- [ ] La lógica tiene tests y pasan. `typecheck`, `lint` y `build` limpios.
- [ ] Muestra fuente y hora de cada dato.
