# Sistema de diseño

> Lo que más nos importa. Si hay que elegir entre una feature más y una pantalla impecable, gana la pantalla impecable.

La idea en una línea: **calma con pulso.** Un fondo sereno y ordenado, donde los números están vivos. Como entrar a una tienda de Apple: nada grita, todo está en su lugar y cada detalle responde al tacto.

> **Rediseño del 17/11/2026 (rama `rediseno`).** Los fundadores sintieron que la primera versión era "muy clásica de IA" y pidieron el nivel de moahu.com.ar, Apple y Whoop. Lo que cambia:
> - **Tipografía con carácter:** Bricolage Grotesque para títulos y cifras, Instrument Sans para el texto (§4).
> - **Láminas:** secciones con esquinas de 44 px que alternan papel y tinta.
> - **Tarjetas de color pleno** con significado fijo (§3).
> - **Botones en píldora** con relleno que sube al pasar el mouse.
> - **Navegación en cápsula flotante.**
> - **La home como una historia por escenas** (§7).
>
> Donde este documento y el rediseño se contradecían, ganó el rediseño y se corrigió acá.

---

## 0. La vara: qué tomamos de cada referente

| Referente | Qué tomamos | Qué no |
|---|---|---|
| **Apple** (apple.com, apps nativas) | Jerarquía tipográfica enorme y segura. Aire. Una idea por pantalla. Materiales translúcidos solo en la navegación. Controles segmentados con indicador que se desliza. Movimiento preciso y corto. Scroll que cuenta una historia en las secciones de producto | Fotos de producto gigantes (no tenemos producto físico) |
| **Whoop** | Lienzo oscuro y profundo. **Un número protagonista** que responde la pregunta del día. *Progressive disclosure* en tres capas (un vistazo → tendencia → detalle). El color existe solo para dar significado | Neones ácidos por todos lados |
| **Mercury** | Plata tratada con calma visual. Tablas limpias. Confianza | — |
| **Linear** | Velocidad, teclado primero (⌘K), bordes finos, precisión | Estética de herramienta de desarrolladores |
| **Stripe** | Tablas y detalle de datos con claridad. Documentación como producto (nuestra /metodologia) | Gradientes animados de fondo |
| **Robinhood** | Gráfico de precio donde arrastrás el dedo y el número del encabezado sigue al cursor | Gamificación, confeti |

---

## 1. Principios

1. **Una pregunta, una respuesta grande.** Cada pantalla abre respondiendo algo concreto ("¿Dónde rinde más tu plata hoy?") con un número protagonista. El detalle vive abajo o a un click.
2. **El color es información.** El texto y los datos son monocromáticos, y el color aparece para decir algo:
   - **Señales chicas:** sube (verde), baja (rojo), atención (ámbar), selección y foco (celeste).
   - **Tarjetas de color pleno:** cada color tiene un tema fijo en todo el sitio. Verde para el dólar, celeste para las tasas en pesos, sol para lo del día (cinta y cierre), coral para la inflación y lila para la cartera. El color de una tarjeta te dice de qué habla antes de leerla.
3. **Los números son el héroe.** Cifras tabulares, alineadas, grandes y con buena tipografía. Una cifra bien compuesta vale más que cualquier ilustración.
4. **Aire antes que bordes.** Se separa con espacio y jerarquía, no con cajas dentro de cajas. Los bordes son líneas finas (*hairlines*), casi invisibles.
5. **Movimiento con propósito.** Toda animación explica algo: de dónde viene un panel, qué cambió, adónde fuiste. Corta, suave y nunca bloquea.
6. **Simple por defecto, profundo a demanda.** El modo Simple habla en pesos por mes; el modo Pro muestra TEM, TIR y duration. La misma pantalla, distinta densidad.
7. **Confianza visible.** Fuente, hora y estado de cada dato, siempre, en tipografía chica y discreta. "¿De dónde sale este número?" a un click.

---

## 2. Anti "hecho por IA": lo que está prohibido

Si una pantalla tiene cualquiera de estas cosas, no está terminada.

**Visual**
- ❌ Gradientes violeta, índigo o azul-violeta. Texto con gradiente. Manchas de luz difusas (*blobs*) de fondo.
- ❌ Glassmorphism por todas partes. El blur se usa **solo** en la barra de navegación, la barra inferior mobile y los overlays.
- ❌ `rounded-2xl` + `shadow-xl` en todo. Cards dentro de cards dentro de cards.
- ❌ Íconos dentro de círculos de color pastel. Emojis usados como íconos. "✨".
- ❌ El look por defecto de shadcn/ui sin tocar. Recharts o Chart.js con estilos por defecto. Paletas arcoíris en gráficos.
- ❌ Hero con "Revolucioná tus finanzas" + dos botones + tres cards de features con ícono, título y descripción.
- ❌ Todo centrado. Muros de cards idénticas.
- ❌ Ruido o grano encima de todo. Bordes con brillo animado. Cursores personalizados.
- ❌ Fotos de stock, ilustraciones genéricas o generadas, avatares 3D.

**Contenido**
- ❌ Lorem ipsum. Testimonios inventados. Métricas inventadas ("+10.000 usuarios confían en nosotros").
- ❌ Copy genérico o traducido del inglés ("Desbloqueá el poder de tus finanzas", "Potenciá tu futuro financiero").
- ❌ "Powered by AI" o badges que no informan nada.

**Test de las cinco preguntas** (respondé con capturas en la mano):
1. Si tapo el logo, ¿parece un template? → Si sí, rehacer.
2. ¿Cuál es el número o la respuesta más importante de esta pantalla? ¿Es lo primero que se ve?
3. ¿Hay algún color que no signifique nada?
4. ¿Algún elemento se puede sacar sin perder información? → Sacarlo.
5. ¿Un diseñador de Apple lo publicaría tal cual? Sé honesto.

---

## 3. Color

Los tokens se definen como CSS variables (`--color-*`) y se exponen en Tailwind v4 con `@theme`. **Dark y light son de primera clase.** Por defecto se sigue la preferencia del sistema, con toggle manual.

### Dark (el modo "vitrina")

| Token | Valor | Uso |
|---|---|---|
| `bg` | `#0B0C0E` | Fondo de página (grafito profundo, no negro puro) |
| `bg-raised` | `#111215` | Bandas o secciones alternas |
| `surface` | `#16181C` | Cards y paneles |
| `surface-2` | `#1D2025` | Hover, inputs, filas activas |
| `border` | `rgba(255,255,255,0.07)` | Hairlines |
| `border-strong` | `rgba(255,255,255,0.13)` | Inputs, separadores de tabla al hacer hover |
| `text` | `#F3F4F6` | Principal |
| `text-2` | `#A3A8B1` | Secundario |
| `text-3` | `#80868F` | Terciario, fuentes, ejes |
| `accent` | `#7AB8F5` | **Celeste**: selección, foco, links, marca. Usar poco |
| `accent-soft` | `rgba(122,184,245,0.12)` | Fondo de "Mejor opción" y del ítem seleccionado |
| `gain` | `#3CCB7F` | Sube / positivo |
| `loss` | `#F2555A` | Baja / negativo |
| `warn` | `#F2B544` | Atención, datos demorados |

### Light (el modo "día")

| Token | Valor |
|---|---|
| `bg` | `#F7F7F4` (papel cálido, no blanco puro) |
| `bg-raised` | `#F0F0EC` |
| `surface` | `#FFFFFF` |
| `surface-2` | `#F2F2EE` |
| `border` | `rgba(12,14,18,0.08)` |
| `border-strong` | `rgba(12,14,18,0.16)` |
| `text` | `#0E1013` |
| `text-2` | `#565C66` |
| `text-3` | `#61676F` (era `#6B717A`; se oscureció el 17/11/2026 porque no llegaba a 4,5:1 sobre `accent-soft`) |
| `accent` | `#1766C2` |
| `accent-soft` | `rgba(23,102,194,0.08)` |
| `gain` | `#0B7A48` |
| `loss` | `#C2353A` |
| `warn` | `#8F5E07` |

Los valores ya están verificados con contraste AA (≥ 4,5:1) para texto chico sobre `bg` y `surface`, en ambos modos. Si se ajusta un color, se vuelve a verificar.

### Tokens vigentes desde el rediseño (17/11/2026)

Reemplazan las tablas de arriba, que quedan como referencia histórica.

| Token | Papel (light) | Tinta (dark) |
|---|---|---|
| `bg` | `#F4F3EF` | `#0D0D0C` |
| `text` | `#111110` | `#F4F3EF` |
| `text-3` | `#66655F` | — |
| `accent` | `#1766C2` | `#7DC1FF` |
| `gain` / `loss` / `warn` | — | `#3DDC84` / `#FF5A5F` / `#FFC93C` |

**Colores plenos de tarjeta** (iguales en los dos temas, siempre con texto en tinta `#111110` vía `.sobre-color`):

| Color | Valor | Tema |
|---|---|---|
| verde | `#3DDC84` | Dólar |
| celeste | `#7DC1FF` | Tasas en pesos |
| sol | `#FFC93C` | Lo del día (cinta, cierre) |
| coral | `#FF8A65` | Inflación |
| lila | `#C3B1FF` | Cartera |

**Por qué celeste:** es un guiño argentino sutil, se distingue bien del verde y del rojo (no compite con suba y baja) y sobre grafito se ve premium.

**Accesibilidad:** verificar contraste AA de cada combinación texto/fondo. Para daltonismo, el cambio nunca se comunica solo con color: siempre va con signo (+/−) o flecha (▲/▼). En ajustes hay una opción "colores alternativos" (azul/naranja).

### Gráficos

- **Serie única de precio:** verde o rojo según la variación del período elegido (como Robinhood). Relleno con degradé del 16 % al 0 % de opacidad.
- **Comparaciones:** rampa de celeste + grises. Si hacen falta categorías (distribución de cartera), usar 6 tonos apagados: celeste `#7AB8F5`, salvia `#8CC5A3`, arena `#D8B47A`, lavanda grisácea `#A9A3D9`, terracota suave `#D98C7A` y gris `#8A9099`.
- La grilla son 3 o 4 líneas horizontales con `border` de opacidad. Sin líneas verticales y sin cajas.

---

## 4. Tipografía

| Rol | Fuente | Notas |
|---|---|---|
| Display, títulos y **cifras** | **Bricolage Grotesque** (Google Fonts, OFL, vía `next/font`) | Grotesca con carácter, de trazo levemente irregular. Tiene cifras tabulares (`tnum`), que se verificaron. Se probó Poppins (la de Moahu) y se descartó porque no tiene cifras tabulares |
| UI y cuerpo | **Instrument Sans** (Google Fonts, OFL) | Neutra y legible en 14–17 px. Contrasta con la display sin pelearse |
| Mono (solo tickers y códigos) | **Geist Mono** | Muy dosificado. No es la estética del sitio |

### Escala (mobile · desktop)

| Estilo | Tamaño | Peso | Tracking |
|---|---|---|---|
| Display (portada) | 54 · 88 · 120 px | 800 | −0,045em |
| H1 | 44 · 76 | 800 | −0,042em |
| H2 | 34 · 54 | 800 | −0,035em |
| H3 | 22 · 26 | 700 | −0,02em |
| Cifra gigante (escenas) | 96 · 200 | 800 | −0,06em, tabular |
| Cifra héroe | 60 · 96 | 700 | −0,045em, tabular |
| Cifra card | 32 · 40 | 700 | −0,035em, tabular |
| Cuerpo | 16/24 (17–21 en la portada) | 400 | 0 |
| Chico | 14/20 | 400/500 | 0 |
| Label | 12/16, **en minúscula normal** (no mayúsculas) | 600 | +0,01em, color `text-3` |
| Micro (fuente, hora) | 11/14 | 400 | +0,02em, `text-3` |

**Reglas:**
- Los títulos van en peso 800 con tracking negativo: el titular es parte del diseño, no un contenedor neutro.
- **No se resalta una sola palabra del titular** con otro color o en itálica: es una de las marcas más claras de "hecho por IA".
- **Las etiquetas no van en mayúsculas** ni hay etiquetas decorativas arriba de cada título. Si una etiqueta no informa algo, se saca.
- Signo de moneda más chico: `$` al 60 % del tamaño de la cifra, alineado arriba. **En las cifras grandes, el signo, la coma, los decimales y el "%" van del mismo color que el número** (pedido de los fundadores, 18/11/2026). En las cifras chicas de tablas, el signo y los decimales pueden ir atenuados.
- Números siempre alineados a la derecha en tablas.
- Formato `es-AR` en todos lados: `$ 1.234,56`, `24,5 %`, `+0,25 %`, `16 nov`, `hace 2 min`.

---

## 5. Espacio, forma y profundidad

- **Grilla:** 12 columnas, máximo 1280 px de contenido (1440 en tablas anchas), gutter de 24 px (16 en mobile), márgenes laterales de 24 / 40 / 64 px según el ancho.
- **Escala de espacio:** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Entre secciones grandes: 96–128 px en desktop.
- **Radios (la jerarquía se nota en el radio):** píldora completa (botones, chips, controles segmentados y nav), 16 (inputs), 24 (cards), 32 (tarjetas de color y paneles), 44 (láminas: secciones enteras de la home). Nunca mezclar radios dentro de un mismo componente.
- **Láminas:** secciones de ancho casi completo (con un hueco de 8–14 px a los costados), con esquinas de 44 px, que alternan papel y tinta (`.inversa` invierte los tokens dentro de la lámina).
- **Profundidad:** casi no hay sombras. Las cards se separan con `surface` sobre `bg` + hairline. En dark, un brillo interno de 1 px arriba (`inset 0 1px 0 rgba(255,255,255,0.04)`). Sombra real solo en overlays (popover, sheet, palette).
- **Blur:** `backdrop-filter: blur(20px) saturate(160%)` solo en la nav, la barra inferior mobile y los overlays.

---

## 6. Navegación y layout

### Desktop
- **Barra superior:** una cápsula flotante de 64 px, translúcida, separada 16 px del borde, que toma sombra al scrollear.
  - Izquierda: wordmark en minúscula con un punto sol.
  - Centro: Inicio · Dólar · Pesos · Bonos · Mercados · Calculadoras. El ítem activo es una píldora invertida que se **desliza** entre ítems (layout animation).
  - Derecha: buscador ⌘K, toggle Simple/Pro, tema, y el botón "Mi cartera" (primario).
- **Barra de pulso** (debajo de la nav, 36 px, solo en desktop): MEP, oficial, riesgo país y la mejor tasa, con *number ticker*. **No es un marquee que se desplaza**: son cuatro valores quietos que se actualizan.
- **Solapas de sección** (ej. /pesos): control segmentado tipo Apple, pegajoso (*sticky*) debajo de la nav, con indicador que se desliza.

### Mobile (se diseña primero)
- **Título grande** estilo iOS que se colapsa al scrollear y pasa a la barra superior.
- **Barra inferior** translúcida con 5 ítems: Inicio, Dólar, Pesos, Cartera, Más. Íconos de 22 px con trazo de 1,5 y label de 10 px.
- El detalle se abre en **sheets** (paneles desde abajo) con arrastre para cerrar.
- Las tablas pasan a **listas** con las dos métricas clave por fila, ordenables con un selector.
- Zonas táctiles de 44 px como mínimo.

### Plantilla de página
```
[Título grande]                              [acciones]
[Subtítulo de una línea, text-2]
[Respuesta héroe: cifra grande + delta + contexto + sparkline]
[Controles: segmentado / filtros]
[Ranking o gráfico principal]
[Tabla completa / detalle]
[Fuente · hora · estado · "¿Cómo lo calculamos?"]
```

---

## 7. Movimiento

### La regla (no negociable, 17/11/2026)

**Acción → llegada → pausa.** Nada se mueve en loop.
- Cada animación arranca por algo que hace el usuario: scrollear, tocar, pasar el mouse o cargar la página.
- Llega a su lugar y queda quieta.
- Nada de efectos decorativos que no cuenten algo.

Consecuencias concretas:
- **Cinta de cotizaciones (única excepción, pedida por los fundadores el 17/11/2026):** gira sola y continua, como una rueda (referencia: la franja de rulo.com.ar). Con `prefers-reduced-motion` queda quieta.
- **Punto "En vivo":** late **una vez** cuando llega un dato nuevo y después queda quieto (antes latía cada 2 s).
- **Prohibido:** elementos que flotan, gradientes que giran, brillos que recorren bordes y skeletons con barrido infinito. Los skeletons quedan quietos con opacidad fija.
- **Herramientas:** todo lo atado al scroll se hace con **GSAP + ScrollTrigger**. Motion queda para las microinteracciones (botones, solapas, sheets, indicadores que se deslizan). **Lenis** (scroll suave) va solo en la home, nunca en tablas ni en la app.
- **Escenas largas:** `position: sticky` dentro de un contenedor alto, con GSAP leyendo el progreso. No se usa `pin` de GSAP, para evitar saltos de layout. Solo se animan `transform` y `opacity`.
- **Efectos pesados** (partículas, texturas, 3D), solo si cuentan algo, y en `<canvas>` (o OffscreenCanvas en un worker).
- **`prefers-reduced-motion`:** todo pasa a fundidos simples de 120 ms, y las escenas aparecen ya armadas.

### Tokens

| Token | Valor | Uso |
|---|---|---|
| `dur-micro` | 120 ms | Hover, press, cambio de color |
| `dur-short` | 200 ms | Tabs, toggles, tooltips |
| `dur-base` | 320 ms | Paneles, cards, expandir filas |
| `dur-long` | 560 ms | Coreografías de entrada, transición entre páginas |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Por defecto (sale rápido, frena suave) |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Salidas |
| `spring-ui` | stiffness 420, damping 36, mass 1 | Indicadores que se deslizan, sheets |
| `spring-soft` | stiffness 220, damping 28 | Elementos grandes |

**Reglas:** nada rebota de más; las salidas duran el 70 % de las entradas; nunca se anima `width` o `height` directamente (usar `transform` y layout animations); con `prefers-reduced-motion` todo pasa a fundidos de 120 ms o a nada.

### Interacciones firma (estas nos distinguen; tienen que estar impecables)

1. **Number ticker:** cuando un precio cambia, los dígitos ruedan como un odómetro (solo los que cambian) y la cifra se tiñe de verde o rojo un 20 % durante 600 ms, para luego volver. Sin parpadeos.
2. **Indicador deslizante:** en controles segmentados, solapas y nav, el fondo o punto activo viaja con `spring-ui` (`layoutId` compartido).
3. **Scrub del gráfico:** al pasar el cursor o el dedo, una línea vertical fina sigue al puntero con un punto en la serie, y **la cifra del encabezado cambia al valor de ese momento**, con su fecha. Al soltar, vuelve al valor actual con una transición suave.
4. **Card → detalle (elemento compartido):** al tocar la card del MEP en Inicio, la card se transforma en el encabezado de /dolar (View Transitions API, con Motion como fallback).
5. **Dibujo de gráficos:** la primera vez que un gráfico entra en pantalla, la línea se dibuja en 600 ms (`pathLength`) y el relleno aparece después con un fundido.
6. **Ranking que se reordena:** al cambiar "mejor para comprar" ↔ "mejor para vender", las filas se mueven a su nueva posición (FLIP / layout animation), no saltan.
7. **Escenas al scrollear** (la historia de la home): cada sección cuenta una idea, y el movimiento es parte del argumento (barras que crecen hasta su tasa, precios que llegan a su lugar en una regla, montos que se arman mes a mes). La narrativa y la coreografía de cada escena están en `docs/PROGRESO.md`. El fundido genérico de "aparecer" se usa poco: si todo aparece igual, nada se destaca.
8. **Sheet y paleta ⌘K:** entrada con `spring-ui` desde abajo o con un escalado de 0,98 → 1, y el fondo se oscurece con blur.
9. **Punto "En vivo":** un punto de 6 px. Cuando llega un dato nuevo, el halo late una vez. Nada más.
10. **Press:** los botones y cards táctiles bajan a `scale(0.98)` en 120 ms.

---

## 8. Componentes

| Componente | Especificación |
|---|---|
| **Button** | Píldora en Bricolage semibold, en alturas 40 / 48 / 56. Al pasar el mouse, un relleno sube desde abajo (primario: tinta → sol; sol: sol → tinta; secundario: borde → relleno invertido). Si lleva `flecha`, la flecha dentro de un círculo sale en diagonal y entra una nueva. Al presionar baja a `scale(0.97)` |
| **SegmentedControl** | Riel en píldora `surface-2` y un "thumb" en píldora `inverse` que se desliza. Teclado: flechas |
| **Card** | `surface` + hairline + radio 14 + padding 20/24. Sin sombra. Hover (si es clickeable): borde `border-strong` y press |
| **Stat** | Label (mayúsculas, `text-3`) → cifra → delta + contexto en una línea → sparkline opcional |
| **Delta** | `+0,25 %` con ▲ en `gain`, `−0,10 %` con ▼ en `loss`. Fondo `gain`/`loss` al 10 % solo en tablas |
| **NumberTicker** | Ver interacción firma 1. Acepta formato es-AR y `decimal.js` |
| **Sparkline** | 80×24 px, trazo 1,5, sin ejes, con punto final |
| **DataTable** | Encabezado pegajoso, label en mayúsculas `text-3`, filas de 52 px, sin cebra, hover `surface-2`, números a la derecha y tabulares, columnas ordenables (flecha que rota), la fila "mejor" con `accent-soft` y la etiqueta "Mejor". En mobile se convierte en lista |
| **ProviderMark** | Monograma de 28 px: cuadrado de radio 8, fondo neutro y dos letras en peso 600. Mismo tamaño para todos. Los logos reales llegan después, con permiso y normalizados |
| **FreshnessBadge** | Punto + "En vivo" / "Demorado 20 min" / "Cierre 16 nov" / "Datos de ejemplo" (este último en `warn`) |
| **SourceNote** | Micro: "Fuente: BCRA · ArgentinaDatos · actualizado 18:41" |
| **MetricExplainer** | "¿De dónde sale este número?": popover (sheet en mobile) con la fórmula escrita y **completada con los valores reales**, la fuente y un link a /metodologia. Es parte de la identidad del producto |
| **CommandPalette (⌘K)** | Busca instrumentos (AL30, T15E7, AAPL), bancos, billeteras, calculadoras y acciones ("crear alerta"). Navegable con teclado |
| **Sheet** | Mobile: desde abajo con *handle*, arrastre para cerrar y radio 20 arriba. Desktop: panel lateral derecho de 480 px |
| **Input de dinero** | Formatea en vivo (`$ 1.000.000`), acepta "1M" o "500k", sin flechas nativas, con teclado numérico en mobile |
| **Slider** | Riel de 4 px, thumb de 20 px con sombra mínima, valor flotante al arrastrar |
| **Toast** | Abajo al centro en mobile y abajo a la derecha en desktop. Una línea. Sin íconos de colores |
| **Skeleton** | Misma forma que el contenido final, brillo muy sutil (opacidad de 4 % a 8 %). Nunca spinners para contenido |
| **EmptyState** | Tipográfico: una frase, una línea de ayuda y un botón. Sin ilustraciones |
| **PartnerCTA** | Botón secundario "Abrir cuenta en X" + micro "Enlace de afiliado". Nunca dentro de la celda del ranking; va en el detalle del proveedor |

**Íconos:** Lucide con trazo de 1,5, de 16 a 20 px, en color `text-2`. Nunca dentro de círculos de color.

---

## 9. Visualización de datos

- **Encabezado vivo:** todo gráfico tiene arriba la cifra actual + delta del período + selector de rango (1S, 1M, 3M, 1A, 5A, Máx) como control segmentado.
- **Ejes:** solo el eje Y a la derecha, con 3–4 valores en `text-3` de 11 px. Eje X con 4–6 fechas. Sin título de ejes si el encabezado ya lo dice.
- **Tooltip:** no es una caja flotante gigante. La información va al encabezado (scrub) y, si hace falta, a un chip chico pegado al punto.
- **Curvas de rendimiento (LECAPs, bonos):** puntos de 6 px + curva ajustada suave (spline o Nelson-Siegel), con el ticker visible al hacer hover. **Hover sincronizado** con la tabla de al lado. El punto seleccionado crece y se pinta de `accent`.
- **Comparaciones de rendimiento:** barras horizontales finas (8 px) con radio completo, ordenadas, con el valor al final de la barra. La "mejor" en `accent` y el resto en gris.
- **Distribución de cartera:** donut fino (anillo de 14 px) con el total en el centro, o una barra apilada horizontal. Leyenda como lista con porcentajes, no como cuadraditos de color sueltos.
- **Interés compuesto:** área apilada (aportes en gris, intereses en celeste) con la cifra final grande arriba.
- **Escalas defendidas:** si un dato es atípico, se excluye y se avisa; nunca se deja que rompa la escala.
- Lightweight Charts se usa con los colores, fuentes y crosshair de este sistema, no con su tema por defecto.

---

## 10. Pantallas clave (wireframes)

> Las cifras son ilustrativas. Siempre salen de los datos.

### Inicio (desktop)

> Reemplazado el 17/11/2026: la home ahora es la portada ("la foto de hoy" en una frase), la cinta, el comparador y una historia en 8 escenas. La narrativa y la coreografía están en `docs/PROGRESO.md`. El wireframe de abajo queda como referencia histórica.
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Rinde    Inicio  Dólar  Pesos  Bonos  Mercados  Calculadoras   ⌘K  Simple|Pro  [Mi cartera] │
├─────────────────────────────────────────────────────────────────────────────┤
│ MEP $ 1.5xx ▲0,2%   Oficial $ 1.5xx   Riesgo país 6xx   Mejor tasa 24 % TNA   ● En vivo │
└─────────────────────────────────────────────────────────────────────────────┘

  Lunes 16 de noviembre                                    ● Mercado abierto · 18:41

  La foto de hoy
  ┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
  │ DÓLAR MEP                │ DÓNDE RINDE MÁS HOY       │ QUÉ PASÓ HOY             │
  │ $ 1.584,99               │ 24,0 % TNA                │ El MEP subió 0,2 %, las  │
  │ ▲ 0,25 %  ╱╲╱‾‾╲╱         │ Plazo fijo a 30 días · X  │ LECAPs cortas comprimie- │
  │ Oficial $ 1.5xx · brecha │ Sin plazo: 21 % en Y      │ ron y el riesgo país...  │
  └──────────────────────────┴──────────────────────────┴──────────────────────────┘

  ¿Dónde rinde más tu plata?
  [ $ 1.000.000        ]  [ Hoy | 30 d | 60 d | 90 d | 180 d ]  [ ☐ Necesito liquidez ]
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │ 1  LECAP T15E7          ████████████████████████  25,9 % TEA   + $ 58.900   │
  │ 2  Plazo fijo · Banco X  ██████████████████████    24,0 % TNA   + $ 54.200   │
  │ 3  Caución 30 d          ████████████████████      22,1 %       + $ 50.100   │
  │ ...                                                  ¿Cómo lo calculamos? →  │
  └──────────────────────────────────────────────────────────────────────────────┘

  [ Bento: Ranking del dólar (top 3) | Curva LECAPs mini | Inflación + REM | Próximos eventos ]

  ── sección de producto (scroll) ──
  Tu cartera, en serio.            [componente real de cartera en modo demo]
  Te avisamos antes.               [componente real de alertas]
```

### Dólar → "Dónde comprar"
```
  Dónde comprar dólares                                  [ USD | USDT | USDC ]
  Te conviene comprar en Banco X: USD 1.000 te cuestan $ 1.567.000.
  Son $ 14.200 menos que el promedio.                    [ Comprar | Vender | Spread ]  [☐ 24/7]

  #  PROVEEDOR          COMPRÁS A     VENDÉS A     SPREAD    USD 1.000 TE CUESTAN   VAR
  1  [BX] Banco X  Mejor $ 1.567,00   $ 1.548,00   1,2 %     $ 1.567.000            ▲0,1%
  2  [UA] App Y        $ 1.569,00    $ 1.545,00   1,6 %     $ 1.569.000            ▲0,1%
  ...
  Precios con condiciones especiales (no comparables)  ▸
  Fuente: … · actualizado 18:41 · ● En vivo
```

### Pesos → LECAPs
```
  LECAPs y BONCAPs                                       [ Simple | Pro ]
  La curva hoy: rinden entre 24 % y 30 % TEA. A más plazo, más tasa.
  ┌────────────────────────────── curva ───────────────────────────────┐
  │                                              ● T30J7               │
  │                                   ● T31Y7  ●                       │
  │                   ● T15E7  (hover sincronizado con la tabla)       │
  │      ● S30N6                                                       │
  └────────────────────────────────────────────────────────────────────┘
  TICKER   VENCE      DÍAS   PRECIO    TNA     TEA     TEM    [Calcular]
  ...
  Excluidas: 1 letra vencida o sin operaciones hoy. ¿Por qué? →
```

### Cartera (mobile)
```
  Mi cartera                                 [ARS | USD | Real]
  $ 12.480.300
  ▲ $ 84.200 hoy (+0,68 %)
  ╱‾╲__╱‾‾╲╱‾‾‾  [1M | 3M | 1A | Todo]

  ¿Le ganaste a la inflación?   Sí, por 3,1 pp en 12 meses   ⓘ

  Ideas (2)
  ┌──────────────────────────────────────┐
  │ Tus $ 2.000.000 en X rinden 32 % TNA. │
  │ En Y rendirían 36 %: ≈ $ 6.600/mes.   │
  │ Ver cuenta · Es una comparación, no   │
  │ una recomendación.                    │
  └──────────────────────────────────────┘

  Distribución   ◯ donut   Pesos 54 % · Dólares 46 %
  Posiciones     lista con monto, % y delta
```

---

## 11. Voz y microcopy

- **Voseo, directo, sin jerga en modo Simple:** "¿Dónde rinde más tu plata hoy?", "Comprás a", "Vendés a", "Ganás por mes", "Vence el jueves".
- **Cifras antes que adjetivos:** "Son $ 6.600 más por mes", no "¡Una gran oportunidad!".
- **Sin signos de exclamación.** Sin "increíble", "potenciá" ni "desbloqueá".
- **Errores humanos:** "No pudimos actualizar el dólar cripto. Mostramos el último dato (18:12)."
- **Términos técnicos con explicación al toque:** TNA, TEA, TEM, TIR, duration, CER, MEP y CCL tienen un tooltip de una línea y link a /aprender.

---

## 12. Accesibilidad y responsive

- Contraste AA mínimo. Foco visible con anillo `accent` de 2 px y offset de 2 px.
- Todo usable con teclado (tabs, segmentados, tablas ordenables, palette).
- `prefers-reduced-motion` respetado (ver §7).
- Breakpoints: 375 (diseño base), 768, 1024, 1280, 1440.
- Las tablas no hacen scroll horizontal en mobile: se transforman en listas.
- Imágenes OG y de compartir: mismo sistema (grafito, cifra grande, wordmark chico), 1200×630 y 1080×1920 para historias.

---

## 13. Checklist de revisión visual (antes de dar algo por terminado)

Correr `pnpm shots` y, con las capturas abiertas, verificar:

- [ ] Lo más importante de la pantalla es lo primero que se ve y es una cifra o una respuesta.
- [ ] No hay ningún elemento prohibido de la §2.
- [ ] El color solo aparece con significado (suba, baja, atención, selección).
- [ ] Las cifras son tabulares, están alineadas a la derecha en tablas y en formato es-AR.
- [ ] El espaciado sigue la escala; nada se siente apretado ni flotando.
- [ ] Un solo radio por componente; nada de cards dentro de cards.
- [ ] Dark y light se ven igual de cuidados.
- [ ] Mobile 375: sin scroll horizontal, títulos que no se cortan mal, zonas táctiles de 44 px.
- [ ] Carga, vacío y error están diseñados (forzarlos para capturarlos).
- [ ] Cada dato muestra fuente, hora y estado.
- [ ] Las interacciones firma de la §7 que aplican están implementadas y se sienten suaves (revisar en el navegador, no solo en capturas).
- [ ] Pasó el test de las cinco preguntas de la §2.
