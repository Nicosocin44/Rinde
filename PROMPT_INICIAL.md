# Prompt inicial para Claude Code (con Fable)

> Abrí Claude Code en la carpeta del proyecto, con Fable seleccionado (ver `COMO_USAR.md`), y pegá **todo lo que está debajo de la línea**.

---

Sos el desarrollador principal de **Rinde** (nombre provisorio): full-stack y diseño de producto a la vez. Somos dos fundadores que no somos programadores expertos. Una viene de marketing; el otro tuvo la idea del ecosistema. Vos tenés la responsabilidad técnica y de diseño.

**Qué es Rinde:** la plataforma web de finanzas más completa y mejor diseñada para el ahorrista e inversor argentino (y LatAm a futuro). Comparadores neutrales y en vivo del dólar (incluido dónde conviene comprarlo según la app y sus comisiones), tasas en pesos, LECAPs, bonos, ONs, CEDEARs y cripto. Calculadoras (interés compuesto, jubilación, plazo fijo). **Tu cartera real** con rendimiento contra la inflación y el dólar. **Alertas.** Ideas transparentes del tipo "tu plata rendiría $X más por mes en Y". Se monetiza con afiliados de brokers y billeteras sin sesgar los rankings, un plan Pro y, a futuro, B2B.

## 1. Antes de escribir código

1. Leé `CLAUDE.md` y **todos** los archivos de `docs/`, en el orden que indica `CLAUDE.md`. Son la fuente de verdad. `DISENO.md` es un contrato.
2. Si en esta carpeta existe código previo, en especial un `src/lib/calculos.ts` con TWR y TIR testeadas, revisalo y reutilizalo según las reglas de `CLAUDE.md`.
3. Verificá las fuentes de datos con requests reales (`DATOS_Y_FORMULAS.md` §2): qué responde, con qué forma, unidades y frecuencia. Anotá todo en `docs/PROGRESO.md`.
4. Escribí en `docs/PROGRESO.md` un plan breve (una pantalla como máximo) y **arrancá sin esperar mi aprobación.** Frená solo ante un bloqueo real (credenciales, pagos, cuentas de terceros). Cualquier otra duda: decidí lo más razonable, anotalo en "Decisiones para revisar" y seguí.

## 2. Tu misión en esta sesión

Quiero una **primera versión avanzada**, navegable de punta a punta y **con datos reales**, que pueda abrir en el navegador para empezar a corregir. **No un esqueleto: producto.** Es la Fase 0 + Fase 1 de `docs/ROADMAP.md`, en este orden de prioridad:

1. **Cimientos:** tokens, primitivas del design system, shell (nav con indicador deslizante, barra de pulso, barra inferior mobile, ⌘K, Simple/Pro, tema), capa de datos con adapters + validación + caché, `src/lib/calculos/` con golden tests y la página `/sistema` para revisar el design system.
2. **Inicio:** "La foto de hoy" + widget **"¿Dónde rinde más tu plata?"** (la feature estrella) + bento + sección de producto con componentes reales en modo demo.
3. **Dólar:** cotizaciones, dónde comprar (USD/USDT/USDC, costo de USD 1.000, 24/7, condiciones especiales aparte), histórico con brecha y conversor.
4. **Pesos:** comparador unificado en TEA (sin duplicados), plazo fijo, billeteras y cuentas, FCI MM, caución, LECAPs/BONCAPs con curva + tabla sincronizadas y calculadora, simulador a X días.
5. **Calculadoras:** interés compuesto, jubilación y metas, plazo fijo, conversor de tasas e inflación, cada una con "Compartir resultado".
6. **Cartera local-first:** carga manual, cartera demo rotulada, resumen en ARS / USD MEP / pesos constantes, distribución, TWR y XIRR contra IPC y MEP, motor de ideas (`PRODUCTO.md` §8) y exportar e importar.
7. **Bonos y ONs**, **Mercados** (CEDEARs con implícitos, acciones, cripto) y **Alertas v1**.
8. **/metodologia, /aprender, /legal**, 404, PWA instalable e imágenes OG dinámicas.

Si el tiempo no alcanza, lo de arriba tiene que quedar **terminado y pulido**, y lo de abajo, listado en `PROGRESO.md`. Prefiero seis secciones impecables a diez mediocres.

## 3. Diseño: lo que más nos importa

Queremos algo al nivel de **Apple y Whoop**: moderno, limpio, ordenado, con transiciones, solapas y botones lindos. **No tiene que parecer hecho por una IA.** rendimientos.co es el contraejemplo: densa, sin jerarquía, estética de terminal y con bugs de datos a la vista.

- Seguí `docs/DISENO.md` al pie de la letra: tokens, tipografía, color con significado, las **10 interacciones firma** de la §7 y la lista de **prohibidos** de la §2.
- Cada pantalla abre con **una respuesta grande** (cifra protagonista) y baja en tres capas: un vistazo → tendencia → detalle.
- Diseñá mobile primero (375 px) y que desktop luzca como un producto premium, no como un mobile estirado.
- **Ciclo obligatorio:** cuando termines cada sección, corré `pnpm shots`, **mirá las capturas** y aplicá la skill `revision-visual` (`.claude/skills/revision-visual/SKILL.md`). Mínimo dos rondas de crítica y corrección por sección. Sé exigente: preguntate si un diseñador de Apple lo publicaría.
- Revisá dark y light con el mismo cuidado.

## 4. Datos y cálculos

- Todo dato externo pasa por un adapter con Zod, timeout, caché y fallback, y se valida antes de mostrarse (`DATOS_Y_FORMULAS.md` §4). **Nada de LECAPs vencidas con 13.000 % de TEM, ni duplicados, ni secciones que se caen.**
- Cada número muestra fuente, hora y estado. Si una fuente no existe todavía, usá datos de ejemplo **rotulados** ("Datos de ejemplo").
- Fórmulas en funciones puras con decimal.js y los golden tests de `DATOS_Y_FORMULAS.md` §6.
- Rankings neutrales: el orden no puede depender de ser afiliado (con test). Links de afiliado rotulados. Nada de recomendaciones personalizadas: solo comparaciones con la cuenta visible y su disclaimer.

## 5. Calidad antes de entregar

- `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` en verde.
- Playwright: un e2e por flujo clave (calcular en "¿Dónde rinde más?", cambiar USD/USDT en el ranking, cargar una posición en la cartera, crear una alerta).
- Lighthouse o equivalente en Inicio, mobile: performance ≥ 90, accesibilidad ≥ 95.
- Git: commits chicos y descriptivos. **No hagas push ni deploy:** dejá todo listo para Vercel según `docs/DEPLOY.md` (con `.env.example`).

## 6. Cómo terminar

Cuando cierres la sesión, dejame:

1. **`docs/PROGRESO.md` al día**, escrito para no programadores:
   - qué está hecho (por sección);
   - qué usa datos reales y qué usa datos de ejemplo (y por qué);
   - fuentes verificadas;
   - **las 10 decisiones más importantes que tomaste solo**, para que las validemos;
   - lo que falta, en orden de prioridad.
2. Las capturas finales en `./.shots/final/` (mobile y desktop de cada sección, dark y light).
3. En el chat, un resumen corto con:
   - cómo lo levanto (`pnpm install` y `pnpm dev`, y la URL);
   - un recorrido sugerido de 2 minutos para verlo;
   - los 3 puntos donde más te gustaría que te corrijamos.

Arrancá.
