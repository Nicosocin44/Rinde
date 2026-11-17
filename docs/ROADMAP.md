# Roadmap

Cada fase termina con algo **usable y lindo**, no con módulos a medias. Los criterios de terminado se cumplen de verdad antes de pasar a la fase siguiente.

---

## Fase 0: Cimientos (dentro de la primera sesión)

- Proyecto Next.js + TypeScript strict + Tailwind v4 + pnpm, con git inicializado.
- Tokens de diseño (color dark/light, tipografía, espacio, radios, motion) como CSS variables.
- Primitivas del design system: Button, SegmentedControl, Card, Stat, Delta, NumberTicker, Sparkline, DataTable, Sheet, CommandPalette, MetricExplainer, FreshnessBadge, SourceNote, Skeleton, EmptyState.
- Shell: nav desktop con indicador deslizante, barra de pulso, barra inferior mobile, toggle Simple/Pro, tema, footer con disclaimer.
- Capa de datos: `Envelope`, caché, freshness y validación; adapters de DolarAPI, ArgentinaDatos, BCRA v4, data912 y CriptoYa.
- `src/lib/calculos/` con los golden tests de `DATOS_Y_FORMULAS.md` §6.
- Scripts: `dev`, `build`, `test`, `test:e2e`, `lint`, `typecheck` y `shots`.
- Página interna `/sistema` (con `noindex`) que muestra todos los tokens y componentes en dark y light: sirve para revisar y corregir el sistema. (Ojo: en el App Router las carpetas con `_` adelante no generan ruta, por eso no se llama `/_design`.)

**Terminado cuando:** `/sistema` se ve impecable en dark y light, los tests pasan y los adapters devuelven datos reales.

---

## Fase 1: Primera versión avanzada (objetivo de la primera sesión)

En este orden de prioridad (si el tiempo no alcanza, lo de abajo queda para después, pero lo de arriba queda **terminado**):

1. **Inicio:** la foto de hoy + widget "¿Dónde rinde más tu plata?" + bento + sección de producto.
2. **Dólar:** cotizaciones, dónde comprar (USD, USDT, USDC, con costo de USD 1.000), histórico y brecha, conversor.
3. **Pesos:** comparador unificado en TEA, plazo fijo, billeteras y cuentas, FCI MM, caución, LECAPs/BONCAPs con curva y calculadora, simulador a X días.
4. **Calculadoras:** interés compuesto, jubilación y metas, plazo fijo, conversor de tasas, inflación.
5. **Cartera local-first:** carga manual, demo precargada, resumen en ARS/USD/real, distribución, rendimiento (TWR, XIRR) vs IPC y MEP, ideas (motor de reglas), exportar e importar en JSON y CSV.
6. **Bonos y ONs:** tablas, curva y calculadora de flujos.
7. **Mercados:** CEDEARs con implícitos, acciones y cripto.
8. **Alertas v1:** crear y listar, con evaluación en el cliente y aviso dentro del sitio.
9. **/metodologia, /aprender (glosario básico), /legal** y página 404 cuidada.
10. **PWA** instalable, con imágenes OG dinámicas para Inicio, Dólar y Pesos.

**Terminado cuando:** se navega todo de punta a punta en desktop y mobile con datos reales (o de ejemplo rotulados), pasa el checklist de diseño y `PROGRESO.md` dice con honestidad qué falta.

---

## Fase 2: Cuentas, alertas reales y publicación

- Deploy en Vercel con dominio propio (ver `DEPLOY.md`).
- Supabase: auth (email con magic link + Google) y la cartera sincronizada detrás de la misma interfaz `PortfolioRepository`. Migración desde local con un click.
- Alertas en el servidor: cron que evalúa y envía por push (PWA), email y bot de Telegram.
- Snapshots diarios de tasas para el **histórico por proveedor**.
- Calendario completo, filtrable por "lo que tengo".
- Analytics respetuoso (Vercel Analytics o Plausible), Search Console y sitemap.
- Páginas SEO programáticas (banco, billetera, LECAP, bono, CEDEAR).

---

## Fase 3: Decidir mejor

- Simulador con escenarios de inflación (baja, REM y alta) y curvas con breakeven destacado.
- Calculadora de arbitraje completa, con parámetros normativos al día.
- Ranking de confiabilidad de proveedores.
- **Resumen semanal con IA** (en el sitio y por newsletter), con las fuentes citadas.
- Importación de cartera desde brokers con API (ej. IOL) y CSV de los brokers grandes.
- Mercados globales con un proveedor con licencia.

---

## Fase 4: Monetización

- Programa de afiliados activo (`partners.ts` con URLs y códigos reales) y página de transparencia.
- Plan Pro (alertas ilimitadas, varias carteras, exportes, impuestos) con cobro por Mercado Pago o Stripe.
- Espacios patrocinados rotulados y newsletter patrocinado.
- Estimador de impuestos (Ganancias y Bienes Personales) con parámetros y disclaimer.

---

## Fase 5: Expansión

- LatAm: Uruguay, Chile o México (según datos disponibles y tracción).
- B2B / marca blanca para asesores y fondos chicos, conectado con el portal de cuotapartes.
- Widgets embebibles para medios.
