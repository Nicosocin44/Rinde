# Progreso

> Escrito para los fundadores. Última actualización: martes 17/11/2026, al cierre de la sesión 1.

## Cómo verlo

1. Si la compu no tiene pnpm: `npm install -g pnpm` (una sola vez).
2. En la carpeta del proyecto: `pnpm install` y después `pnpm dev`.
3. Abrir **http://localhost:3000**.

Otros comandos: `pnpm test` (cálculos), `pnpm test:e2e` (recorre el sitio con un navegador), `pnpm shots` (capturas de todas las pantallas), `pnpm build` (versión de producción), `pnpm test:live` (prueba contra las fuentes reales).

---

## Qué está hecho, por sección

Todo funciona con **datos reales** salvo donde se indica. Cada número muestra su fuente, su hora y su estado.

| Sección | Qué tiene | Estado |
|---|---|---|
| **Cimientos** | Sistema de diseño (colores dark y light, tipografía, movimiento), barra superior con punto que se desliza, barra de pulso (MEP, oficial, riesgo país, mejor tasa, se actualiza cada minuto), barra inferior en el celular, buscador ⌘K, modo Simple/Pro, tema claro/oscuro, colores alternativos para daltonismo. Página **/sistema** para revisar cada pieza. | ✅ |
| **Inicio** | "La foto de hoy" (dólar MEP, dónde rinde más hoy, qué pasó hoy en dos líneas), **"¿Dónde rinde más tu plata?"** con monto, plazo y liquidez, el mercado de un vistazo (ranking del dólar, curva de LECAPs, inflación con expectativa del REM, riesgo país, próximos eventos) y la sección de producto con la cartera y las alertas de ejemplo calculadas con datos de hoy. | ✅ |
| **Dólar** | Cotizaciones de los 7 dólares con variación, brecha y gráfico de 30 días · **Dónde comprar** USD, USDT y USDC: ranking por precio final con comisiones, costo de USD 1.000, filtro 24/7, orden para comprar/vender/spread, precios con condiciones especiales aparte y cotizaciones excluidas con su motivo · **Histórico** de MEP, oficial y blue (hasta 2018) y de la brecha, con el número del encabezado que sigue al cursor · **Conversor** con todos los tipos de cambio. | ✅ |
| **Pesos** | **Comparador** de 120+ opciones normalizadas a TEA, sin duplicados · **Plazo fijo** por banco a 30/60/90/180/365 días · **Billeteras y cuentas** (incluye Mercado Pago y Ualá a través de sus fondos) · **Fondos money market** con la TNA calculada desde la cuotaparte · **Caución** · **LECAPs y BONCAPs** con curva, tabla sincronizada y calculadora por letra · **Simulador** a N días con escenarios de inflación (baja, REM, alta) y resultado real. | ✅ (CER pendiente) |
| **Calculadoras** | Interés compuesto, jubilación y metas (en dólares, con la regla del 4 % explicada), plazo fijo, conversor TNA/TEA/TEM e inflación ("¿cuánto valen hoy?"). Todas con **"Compartir resultado"** (genera una imagen para historias y WhatsApp) y link a la fórmula. | ✅ (falta "sueldo en dólares") |
| **Cartera** | Carga manual (billetera, plazo fijo, CEDEAR, acción, bono, LECAP, cripto, dólares), cartera de ejemplo rotulada, valor en pesos / dólares MEP / pesos constantes, gráfico de evolución, **"¿Le ganaste a la inflación?"** con TWR y TIR contra IPC, MEP y plazo fijo, distribución, posiciones con detalle y borrado, **ideas** (6 reglas) y exportar/importar JSON y CSV. Se guarda **solo en el navegador**. | ✅ |
| **Bonos y ONs** | Bonares y Globales con TIR, duration, paridad, cupón y próximo pago; curva separada por ley; calculadora de flujos por bono. ONs con precio y volumen del día. | ✅ (ONs sin TIR) |
| **Mercados** | CEDEARs con dólar implícito (MEP y CCL en modo Pro), buscador y filtro por sector; acciones del panel líder y general; cripto (BTC, ETH, USDT, USDC) con ranking de exchanges. | ✅ |
| **Alertas v1** | 5 tipos (precio del dólar, tasa, LECAP contra plazo fijo, vencimiento de mi cartera, dónde comprar), límite de 3 activas (plan gratuito), aviso dentro del sitio mientras haya una pestaña abierta. | ✅ |
| **Confianza** | /metodologia (fuentes, fórmulas, validaciones y cómo ordenamos), /aprender (glosario de 25 términos), /legal (borrador), 404 con el marco del sitio, error por página. | ✅ |
| **PWA y compartir** | Instalable en el celular (manifest, íconos, funciona sin conexión mostrando un aviso), imágenes de vista previa dinámicas para Inicio, Dólar y Pesos, sitemap y robots. | ✅ |

---

## Datos reales y datos de ejemplo

**Reales (en vivo o con su hora de cierre):** todos los dólares y el ranking por proveedor, plazo fijo, billeteras y cuentas, fondos, LECAPs, bonos, ONs, CEDEARs, acciones, cripto, inflación, REM, riesgo país, feriados.

**De ejemplo (rotulados "Datos de ejemplo"):** la **cartera de demostración** (cantidades inventadas, pero los precios de compra son los cierres reales de cada fecha) y las **alertas de ejemplo** de Inicio. Motivo: muestran el producto a quien todavía no cargó nada.

**Estimados (rotulados):** el **valor final de las LECAPs** (lo derivamos del precio y la tasa publicados, con menos de 0,01 % de diferencia; falta cargar el oficial de cada licitación) y la valuación de billeteras con la TNA que carga la persona.

**Desactualizados (rotulados):** la **caución**: la fuente informa la última rueda del 05/11. La mostramos con un aviso y la sacamos del comparador.

---

## Fuentes verificadas (16 y 17/11/2026, con requests reales)

| Fuente | Endpoint | ¿Respondió? | Notas |
|---|---|---|---|
| DolarAPI | `/v1/dolares` | Sí | 7 casas. Precios en pesos por dólar. |
| ArgentinaDatos | `/v1/cotizaciones/dolares/{casa}` | Sí | Histórico diario desde 2018 (MEP). |
| ArgentinaDatos | `/v1/finanzas/tasas/plazoFijo` | Sí | 33 bancos. TNA como fracción. |
| ArgentinaDatos | `/v1/finanzas/fci/otros/ultimo` | Sí | Billeteras y cuentas. Brubank figura con dato de 2025: se excluye. Mercado Pago no está: se cubre con su fondo. |
| ArgentinaDatos | `/v1/finanzas/fci/comparatasas` | Sí | Subset de la CNV con variación de cuotaparte. De ahí sale la TNA de los fondos. |
| ArgentinaDatos | `/v1/finanzas/cauciones/ars` | Sí, pero viejo | Última rueda: 05/11. |
| ArgentinaDatos | `/v1/finanzas/letras` | Sí | Trae una letra dual (TTD26) con TEA −70 %: se excluye. |
| ArgentinaDatos | `/v1/finanzas/tasas/depositos30Dias` | Sí | Tasa promedio a 30 días (referencia de la cartera). |
| ArgentinaDatos | inflación, interanual, riesgo país, REM, feriados | Sí | El REM trae dos muestras: usamos "todos". |
| data912 | `/live/arg_notes`, `arg_bonds`, `arg_corp`, `arg_cedears`, `arg_stocks`, `mep`, `ccl` | Sí | Letras y bonos por 100 nominales originales. Las BONCAPs están en `arg_bonds`. |
| data912 | `/historical/{bonds,cedears,stocks}/{ticker}` | Sí | **No ajusta los cambios de ratio de CEDEARs** (SPY saltó de $53.750 a $19.550 en junio). Para letras responde un texto de error con código 200. |
| CriptoYa | `/api/bancostodos`, `/api/{usdt,usdc,btc,eth}/{ars,usd}/1` | Sí | Precios finales con comisiones. 9 de 22 bancos tienen cotizaciones de hace meses: se excluyen. |
| BCRA v4.0 | `/estadisticas/v4.0/monetarias` | Sí | Catálogo y series OK. |
| Binance | `/api/v3/klines` | Sí | Histórico semanal de BTC y ETH (para valuar carteras). |

---

## Calidad

- **Tests de cálculo: 56 en verde** (`pnpm test`): todos los golden tests de `DATOS_Y_FORMULAS.md` §6, incluidos la neutralidad del ranking y la exclusión de una LECAP vencida y un fondo duplicado. Sirvieron: detectaron un error real en el cálculo de cupones de la cartera.
- **e2e: 25 en verde** (`pnpm test:e2e`), en escritorio y celular: calcular en "¿Dónde rinde más?", cambiar USD/USDT en el ranking, cargar una posición en la cartera, crear una alerta, más un recorrido de 9 pantallas que verifica que no haya errores, que se vea la fuente y que nunca aparezca "NaN" ni notación científica.
- `pnpm typecheck`, `pnpm lint` y `pnpm build` **limpios**. Cero errores de consola en las 28 rutas.
- **Lighthouse en Inicio (build de producción):**
  - Escritorio: **performance 99, accesibilidad 97**.
  - Celular con la configuración estándar (CPU 4× más lenta, 4G lento): **performance 76–84, accesibilidad 96**, buenas prácticas 100, SEO 100. **No llega al 90 pedido.** El primer pintado real es a los 0,35 s; el puntaje lo baja la estimación de Lighthouse por la cantidad de JavaScript (LCP simulado 3,6 s). Es lo primero de la lista de pendientes.
  - Celular sin el freno extra de CPU: 90–91.

### Revisión visual (dos rondas con capturas, más ajustes por sección)

Algunas cosas que encontré mirando las capturas y corregí:
- El widget mostraba centavos donde no hacían falta y repetía "30 días" en la misma frase; los nombres largos se cortaban en el celular.
- El control "Para comprar · Para vender · Menor spread" se salía de la pantalla a 375 px.
- La brecha se mostraba con eje en fracciones (0,03) y una "variación de −59 %" sin sentido: ahora es en puntos porcentuales y en color neutro.
- El gráfico de la cartera decía "+153 % en toda la serie", que **inducía a error** (incluía los aportes): ahora no muestra variación.
- La curva de LECAPs tenía una "panza" artificial: pasé a Nelson-Siegel. La de bonos, con pocos puntos, a un ajuste logarítmico.
- Había puesto un ícono **dentro de un círculo de color** (prohibido por DISENO.md §2): lo saqué.
- El comparador era un muro de 70 filas: ahora muestra las 12 mejores y un botón para el resto.

Capturas finales: `.shots/final/` (29 pantallas × celular y escritorio × dark y light = 116).

---

## Las 10 decisiones más importantes que tomé solo (para validar)

1. **Plazo fijo: la tasa principal es la "para clientes".** Es la que publica cada banco como referencia; la de no clientes va en una columna aparte. Si prefieren mostrar primero la que cualquiera puede conseguir, es un cambio chico.
2. **Mercado Pago y Ualá se comparan por su fondo** (Mercado Fondo, Ualintec): es lo que efectivamente paga la plata en esas apps. Aparecen como "Mercado Fondo (Mercado Pago)".
3. **Tasas con condiciones** (plan sueldo, consumo mínimo, solo empresas) **van aparte** y no compiten en el ranking.
4. **"La mejor tasa sin plazo" exige que rinda al menos $1.000.000.** Por eso Fiwind (23 % con tope de $750.000) no figura como "la mejor": una tasa alta con tope chico engaña. En el widget sí aparece, con la aclaración del tope.
5. **"¿Dónde rinde más?" muestra máximo 2 opciones por tipo y 1 por proveedor**, para que el top 5 no sean cinco plazos fijos casi iguales. "Hoy" se muestra como ganancia de un mes.
6. **Dólar:** excluimos bancos con cotización de más de 30 horas y exchanges de más de 2 horas. El MEP vía broker y los P2P van en "condiciones especiales".
7. **Valor final de las LECAPs estimado** desde el precio y la TEA de ArgentinaDatos (y rotulado), hasta cargar los comunicados oficiales.
8. **Bonos:** tomamos el precio de la especie en dólares (D) como precio sucio (con cupón corrido), que es como cotiza BYMA. Solo cargué los bonos del canje 2020; faltan AN29, AO27/28/29 y BOPREAL.
9. **Cartera:** las billeteras y plazos fijos se valúan con la TNA que carga la persona (estimación); las letras sin histórico, a la tasa de compra. Si un CEDEAR tuvo cambio de ratio, usamos solo la historia posterior.
10. **Diseño:** el wordmark son tres barras crecientes + "Rinde" en Satoshi; el gris terciario del modo claro lo oscurecí (de `#6B717A` a `#61676F`) para cumplir contraste, y lo actualicé en DISENO.md.

Otras más chicas: el límite gratuito de alertas es 3 activas; los escenarios de inflación del simulador son REM, REM − 0,5 pp y REM + 1 pp por mes; la fuente Inter usa `display: optional` (en una primera visita muy lenta puede verse la fuente de respaldo); el service worker es propio (no Serwist) para no complicar el build; TypeScript 6 en vez de 7 porque el linter todavía no soporta la 7.

---

## Lo que falta, en orden de prioridad

1. **Performance en celular al 90** (hoy 76–84 con la configuración estándar): reemplazar animaciones de Motion por CSS en los controles y achicar el JavaScript de las islas interactivas.
2. **Revisar en un navegador real** las interacciones firma: las capturas se toman con movimiento reducido. Las implementadas: number ticker, indicadores deslizantes, scrub del gráfico, reordenamiento del ranking, sheets con arrastre, ⌘K, dibujo de curvas, revelado al scrollear, punto "En vivo", press, y la transformación de la card del MEP en el encabezado de /dolar (View Transitions).
3. **Bonos CER e inflación breakeven** en /pesos (la fórmula y su test ya están; falta la pantalla).
4. **Valores finales oficiales de las LECAPs** y **TIR de las ONs** (cargar prospectos).
5. Calculadora de **sueldo en dólares**, **arbitraje** del dólar y **/calendario** completo (IPC del INDEC, licitaciones).
6. **Fase 2:** cuentas con Supabase, alertas por push/email/Telegram con evaluación en el servidor, snapshots diarios para el histórico de tasas por proveedor.
7. Páginas SEO por banco, billetera y LECAP; imágenes para historias 1080×1920; logos reales con permiso.
8. **Revisión legal** de /legal y del aviso de afiliados antes de lanzar.
9. Publicar (ver `docs/DEPLOY.md`): el proyecto ya está listo para Vercel. Falta crear el repositorio en GitHub y la cuenta de Vercel (lo hacen ustedes; yo no hice push ni deploy).
