# Progreso

> Escrito para los fundadores. Última actualización: jueves 27/11/2026, caución desde BYMA Data (rama `caucion-byma`), Mi cartera con comisiones, cobros y noticias (rama `cartera-espacio`) e importar desde brokers (rama `importar-brokers`).

## Cómo verlo

1. Si la compu no tiene pnpm: `npm install -g pnpm` (una sola vez).
2. En la carpeta del proyecto: `pnpm install` y después `pnpm dev`.
3. Abrir **http://localhost:3000**.

Otros comandos: `pnpm test` (cálculos), `pnpm test:e2e` (recorre el sitio con un navegador), `pnpm shots` (capturas de todas las pantallas), `pnpm build` (versión de producción), `pnpm test:live` (prueba contra las fuentes reales).

---

## Importar la cartera desde cualquier broker argentino (punto 31.4, rama `importar-brokers`, 27/11/2026)

> Benja: "quiero que se pueda importar así, con todas las opciones" (una captura de otra app: tarjetas de brokers con su logo, ayuda para exportar y una zona para arrastrar archivos). Después: "hacelo solo con brokers argentinos, sumá otros". Balanz tiene lector propio, porque tenemos sus archivos reales; para el resto, el archivo tal como lo bajás y se elige qué es cada columna.

- **La pantalla de Importar,** en Cartera, empieza con "¿De dónde son tus movimientos?": 10 tarjetas con el logo de cada broker (Balanz, Cocos, IOL, PPI, Bull Market, Allaria, SBS, Adcap), "Otro broker" y "Nuestra planilla". Dos por fila en el celular, tres en la compu. Al elegir una aparecen los pasos para exportar desde ese broker y una zona para arrastrar los archivos (o tocar y elegirlos). Se pueden subir varios a la vez.
- **Los pasos para exportar:** Cocos los publica en su ayuda (Actividad → ícono de descarga → período → CSV) y van tal cual. Balanz, por los nombres de sus archivos. Los demás no los publican: pasos generales ("buscá tus movimientos u operaciones y bajalos en Excel o CSV").
- **Cualquier broker, eligiendo las columnas** (`src/lib/cartera/brokers/columnas.ts` y `src/components/modules/cartera/mapeo-columnas.tsx`): si el archivo no es nuestra planilla ni de Balanz, aparece "¿Qué es cada columna?".
  - Viene adivinado por los títulos (Fecha Concertación, Especie, Símbolo, Importe neto, Monto…) y cada lista muestra un ejemplo del archivo.
  - Las operaciones se agrupan (sin números ni el ticker, así "Boleto / 123 / COMPRA / NVDA" y "Boleto / 124 / COMPRA / AAPL" van juntos) y se elige qué es cada una: compra, venta, dividendo, renta o "no sumar". Los depósitos, retiros, impuestos y gastos arrancan en "no sumar".
  - El tipo de activo sale de una columna, si la hay, o del ticker (acciones del panel, CEDEARs y LECAPs que conocemos). Los bonos no se adivinan: su precio en pesos o en dólares confunde. Para los tickers que no reconocemos se elige "no sumar", "son CEDEARs" o "son acciones".
  - Sin columna de precio, sale del importe. Sin columna de comisión, sale de la diferencia entre el importe y cantidad × precio, si es chica (hasta 5 %).
  - Lo elegido se recuerda en el navegador para los archivos con los mismos títulos: la próxima vez va directo a la vista previa. Una fila de total o un subtítulo quedan como "No parece un movimiento".
- **Aviso de privacidad, que es cierto:** los archivos se leen en el navegador y no se suben a ningún lado; solo se guardan los movimientos que se eligen sumar.
- **El formato se reconoce por los títulos de las columnas,** no por la tarjeta elegida: si alguien sube un Excel de Balanz con "Otro", se lee igual.
- **Balanz, "Mis instrumentos"** (la tenencia): una compra por instrumento, por los nominales, al precio promedio de compra, con fecha = día de la tenencia (sale del nombre del archivo) menos los días promedio de tenencia. Es una aproximación y así lo dice la nota de cada compra ("Tenencia de Balanz al 25/11/2026").
- **Balanz, "Movimientos":** compras y ventas de CEDEARs y acciones, con la comisión que sale del importe (en la compra se paga más que cantidad × precio, en la venta se cobra menos), y dividendos en pesos. La nota dice el número de boleto.
- **Lo que no se suma queda en la vista previa, gris, con el motivo:**
  - depósitos y retiros de la cuenta: la cartera suma lo que compraste, no el saldo en el broker;
  - dividendos en dólares de CEDEARs: la cartera cuenta los CEDEARs en pesos;
  - el débito en pesos que acompaña a cada dividendo;
  - bonos, letras y fondos, que todavía no se leen para no cargar mal un precio;
  - lo que ya está contado en una tenencia importada.
- **Para no contar dos veces:**
  - Si se suben la tenencia y los movimientos juntos, primero va la tenencia y los movimientos hasta su fecha se omiten. Lo mismo si la tenencia ya se había importado antes (se reconoce por la nota).
  - Una tenencia de un activo que ya tiene movimientos en la cartera avisa que puede duplicarlos.
  - Una venta de más de lo que hay en la cartera se marca para revisar.
  - Subir dos veces el mismo archivo marca todo como "Ya está".
- **Cómo está hecho:** `src/lib/cartera/brokers/balanz.ts` pasa cada Excel de Balanz a las filas de nuestra planilla, así la vista previa, los avisos y lo repetido son los mismos. `src/lib/cartera/brokers/index.ts` reconoce el formato y junta varios archivos (`interpretarArchivos`). En `importar.ts`, el estado nuevo "omitida" y el archivo de cada fila. La pantalla está en `src/components/modules/cartera/importar.tsx`.
- **Probado:**
  - Tests en `tests/importar-balanz.test.ts`, con archivos inventados que copian el formato real, y en `tests/importar-columnas.test.ts` (un archivo inventado de un broker cualquiera: título arriba, columnas en otro orden, venta negativa, dividendo, depósito, ticker desconocido, LECAP y fila de total).
  - En el navegador, eligiendo columnas con un archivo de prueba de "Cocos": adivinó todas las columnas y las operaciones, la vista previa salió bien, y con un segundo archivo de las mismas columnas fue directo a la vista previa. Y la pantalla de columnas a 375 px.
  - Con los archivos reales de Benja (sin guardarlos en el repositorio):
    - "Movimientos": 42 compras y ventas, todas con su comisión, y 20 filas omitidas (depósitos, retiros y dividendos).
    - "Mis instrumentos": 8 CEDEARs.
    - Los dos juntos: la tenencia y los 62 movimientos omitidos.
  - En el navegador a 375 px y en la compu, con un archivo de prueba: la vista previa marca la venta de más y explica las omitidas.

### Para revisar

- **Los nombres de los menús de Balanz** en los pasos ("Mis instrumentos", "Movimientos") salen de los nombres de los archivos: Benja, confirmá que se llaman así en la web de Balanz.
- **La columna "Garantías"** de "Mis instrumentos" no se suma (en todos los archivos de Benja vale 0). Si alguien tiene títulos en garantía, hay que ver si "Nominales" ya los incluye.
- **Los dividendos de CEDEARs en dólares** no se suman. Para sumarlos habría que pasarlos a pesos con el tipo de cambio de ese día.
- **Un lector propio por broker:** con un archivo real de Cocos, IOL, PPI, Bull Market, Allaria, SBS o Adcap, se reconoce solo (sin elegir columnas) y se ajustan sus pasos para exportar. Schwab y Binance quedaron afuera (pedido de Benja: solo brokers argentinos).
- **El mapeo se recuerda solo en ese navegador** (localStorage): en otro dispositivo se vuelve a preguntar una vez.

## Mi cartera: comisiones, cobros y noticias al lado de las posiciones (rama `cartera-espacio`, 27/11/2026)

> Benja, con una captura: "hay mucho lugar acá" (al lado de la lista de posiciones, debajo de Distribución, la columna quedaba vacía). De cinco ideas eligió cuatro: lo que más subió y bajó, comisiones, dividendos y cupones, y noticias de lo que tenés. Al verlo, sacó "lo que más subió y bajó" (repetía lo que ya muestra la lista de posiciones).

- **Comisiones:**
  - Lo pagado en comisiones y derechos en las compras y ventas en pesos (CEDEARs, acciones y letras) que tienen la comisión cargada, cuántas operaciones son, qué % de lo operado y cuánto en el año.
  - Cuánto habrías pagado con el broker más barato para esas mismas operaciones: su tarifa de entrada con IVA, más los mismos derechos de mercado (0,05 % + IVA en acciones y CEDEARs, 0,001 % en letras). Las letras con tarifa anual se prorratean por los días que les quedaban. Solo se comparan los brokers que operan todas las clases usadas, y solo aparece si ahorrás.
  - Sin comisiones cargadas, explica que importando los movimientos del broker se ve. Link a las comisiones de los brokers.
- **Dividendos y cupones:** lo cobrado este año y desde el principio, en pesos y en dólares por separado (los CEDEARs cobran en pesos; los bonos, en dólares), y los 5 activos que más pagaron, con cuántos cobros y el último. Sin cobros, cómo cargarlos.
- **Noticias de lo que tenés:** las de tus 4 posiciones más grandes (de nuestros medios y de Google Noticias, solo las que las nombran), hasta 2 por activo para que no se las lleve todas el que más sale, de la más nueva a la más vieja, con el ticker de cada una.
  - Se piden a `/api/cartera/noticias` con solo los ids ("cedear:AAPL"), nunca montos, igual que los precios.
  - Se cachean 15 minutos en Vercel.
  - Con el estilo de la sección Noticias (Benja: "parecen escritas con letra de IA"): el medio y la hora arriba, el título en 18 px semibold y el ticker con borde, que lleva a su ficha. Sin la bajada gris ni la pastilla "En inglés".
- **Dónde va cada cosa:** en la compu, dos columnas: a la izquierda Distribución, Comisiones y Cobros; a la derecha Posiciones. Abajo, a todo el ancho, las Noticias, en dos columnas: así las dos columnas de arriba quedan parejas (con la cartera de ejemplo, 801 y 704 px). En el celular, una sola, con las posiciones justo después de Distribución. Las columnas se disuelven con `contents` y `order` ordena los bloques.
- **Cómo está hecho:** los cálculos en `src/lib/cartera/resumenes.ts` (`comisionesPagadas`, `cobros`), con tests en `tests/cartera-resumenes.test.ts`; los bloques en `src/components/modules/cartera/resumenes.tsx`; las noticias en `noticiasDeCartera` (`src/lib/data/servicios/noticias-activo.ts`).
- **Probado** en local con la cartera de ejemplo, a 1440 y a 375 px: los tres bloques con datos, el orden en el celular y 8 noticias de GD35, T30J7, BTC y AAPL.

### Para revisar

- **Los derechos de mercado** para comparar comisiones son un promedio (0,05 % + IVA en acciones). Varían un poco según el broker que los informa.
- **Las comisiones en dólares** (bonos) no entran en la comparación.

## Mi cartera: menos aire arriba del total (rama `cartera-espacio`, 27/11/2026)

> Benja, con una captura: "¿No creés que hay mucho espacio?". Entre "Todo lo que tenés, junto…" y el total quedaban 136 px vacíos en la compu.

- **Era un error:** arriba del total está el aviso para guardar la cartera en la cuenta. Con la sesión iniciada (o mientras carga, o sin cuentas configuradas) no muestra nada, pero su caja vacía igual sumaba la separación entre bloques: 80 px en la compu y 64 en el celular. Ahora la caja solo está cuando hay aviso (sin sesión).
- **Menos espacio debajo del título:** de 56 a 32 px en la compu y de 40 a 24 en el celular. El total es lo principal de la página.
- **Resultado:** con la cartera propia, el total queda a 32 px de la bajada (antes, 136). Con la de ejemplo, el aviso "Datos de ejemplo" queda a 32 px (24 en el celular). Medido en local a 1440 y a 583 px de ancho.

## Caución desde BYMA Data, con ArgentinaDatos de respaldo (rama `caucion-byma`, 27/11/2026)

> Benja: "para caución buscá otras fuentes". ArgentinaDatos seguía trayendo la rueda del 17/11: actualiza la consulta todos los días, pero su origen dejó de mandar ruedas nuevas. La página mostraba "Datos desactualizados" y la caución había salido del comparador.

- **Fuente nueva: BYMA Data** (`open.bymadata.com.ar`, la web pública de BYMA), que es de donde salen las cauciones. Gratis y sin clave. Trae todas las cauciones del día (pesos, MEP y cable) con la tasa de la última operación, el promedio del día, el monto y la hora. Se usan solo las de pesos.
- **Cómo se lee:**
  - Para cada plazo que operó en la rueda, la tasa promedio del día ponderada por monto (si falta, la última) y el monto operado.
  - Antes de que abra el mercado, el cierre de la rueda anterior, sin monto: la tabla muestra "—" en Monto operado.
  - La fila no trae la fecha: la rueda es el vencimiento menos los días que informa BYMA. Si eso cae en fin de semana o feriado, vale el hábil anterior, y el plazo se cuenta siempre desde la rueda.
  - BYMA mezcla escalas según el campo (0,215 y 21,5): un valor mayor a 3 se toma como porcentaje.
- **Respaldo:** se consultan las dos fuentes a la vez y vale la rueda más reciente; si empatan, BYMA. Si BYMA no responde o cambia de forma, la caución sale de ArgentinaDatos como antes.
- **Con el dato al día, la caución vuelve al comparador** ("Caución a 7 días" y "a 31 días", en el filtro Letras) y deja de verse el aviso de datos desactualizados.
- **No es una API documentada:** es lo que usa la web de BYMA por detrás (la oficial es paga). Desde octubre pide el encabezado `Options: renta-fija`. Se consulta por POST; Next solo cachea un POST si se le pide (`cache: "force-cache"`), así que `traerJson` (`src/lib/data/http.ts`) ahora acepta `cuerpoPost`.
- **Cómo está hecho:** el adaptador `src/lib/data/adapters/bymadata.ts`, el schema `bymaCaucionesSchema`, y en `src/lib/data/servicios/pesos.ts` las funciones `normalizarCaucionesByma` y `elegirCauciones`. La fuente se guarda en `cauciones.fuente` y en el `fuenteId` de las opciones (el "¿De dónde sale?" del comparador dice "BYMA Data"). BYMA Data se suma a la tabla de fuentes de Metodología y al pie.
- **Tests:** `tests/caucion-byma.test.ts`, con filas reales del 27/11 en `tests/fixtures/byma-cauciones.json`. Cubren la rueda del día, el cierre anterior antes de abrir, un sábado, la escala en porcentaje y la elección entre las dos fuentes.
- **Probado** en local: `/pesos/caucion` con las tasas del 27/11 (de 3 a 38 días) y "Cierre del 27 nov", y las dos cauciones en el comparador.

### Para revisar

- **Que BYMA responda desde Vercel:** se probó desde Argentina. Los servidores de la web están en EE.UU.; si BYMA no les responde, queda ArgentinaDatos (y se nota porque vuelve el aviso de desactualizado). Se ve en la vista previa.
- **Las condiciones de uso de BYMA Data** antes de abrir la web al público.

## Metas, dentro de Calculadoras, y las calculadoras en tres grupos (punto 30, rama `calculadoras-metas`, 26/11/2026)

> Lista, punto 30: Metas era un apartado propio del menú y además aparecía en Calculadoras; que quede solo dentro de Calculadoras, y ordenar la lista (eran 9, una debajo de la otra). De las opciones que se le pasaron a Benja, va la combinación recomendada.

- **Metas vive en `/calculadoras/metas`.** Arriba dice "Calculadoras" y debajo la pregunta, "¿Cuánto tengo que juntar por mes para mi meta?", como en las demás calculadoras.
- **La dirección vieja `/metas` lleva sola a la nueva** (redirección permanente en `next.config.ts`, que conserva lo que venga después del "?"). Siguen andando los links que ya circulan y el acceso directo del celular ya instalado.
- **Las metas guardadas no se pierden:** se guardan en el navegador (IndexedDB), que no depende de la dirección de la página.
- **El menú de arriba queda en Inicio, Dólar, Pesos, Mercados y Calculadoras.** En el celular, Metas se encuentra en Más → Calculadoras.
- **El pie de página ("Mis metas"), el buscador (⌘K), el acceso directo del celular y el sitemap** apuntan a la dirección nueva.
- **La página de Calculadoras, en tres grupos de a tres:**
  - **Para ahorrar:** Metas de ahorro, Interés compuesto, Jubilación.
  - **Para invertir:** ¿Qué hubiera pasado si…?, Plazo fijo, Simulador de inversiones.
  - **Cuentas rápidas:** Conversor de tasas, Inflación, Pesos a dólares.
- **Calculadoras ya no tiene solapas** (Benja, al verlo: "sacaría todas las secciones y lo haría directo con todas"). La portada de la sección, con sus tres grupos, hace de menú, y cada calculadora tiene arriba un "← Todas las calculadoras" (`src/app/(site)/calculadoras/volver.tsx`), como la ficha de cada inversor. Pesos a dólares y el Simulador viven en Dólar y en Pesos: desde Calculadoras se llega con un link.
- **Probado** a 1280 × 900 y a 375 × 812 (la portada, Metas y ¿Qué hubiera pasado?, con el link de vuelta), más la redirección (`/metas?x=1` → 308 → `/calculadoras/metas?x=1`).

### Para revisar

- Los nombres de los grupos se cambian en un minuto, si se les ocurren mejores.

## La barra de arriba y las solapas se esconden al bajar (rama `solapas-se-esconden`, 25/11/2026)

> Benja: "cuando vas bajando, las secciones siguen ahí". Quedaban dos barras fijas (la de arriba y la de solapas) que ocupaban casi un cuarto de la pantalla y tapaban el contenido. Después pidió lo mismo para la barra de arriba, en todas las secciones.

- **Mientras se baja leyendo,** la barra de arriba (en todas las páginas) y las solapas de la sección (Dólar, Pesos, Mercados, Calculadoras) suben y se esconden juntas.
- **Vuelven apenas se scrollea para arriba,** como en Safari o Instagram. También vuelven si se llega con el teclado (Tab) y al cambiar de página. Solo el foco de teclado (`:focus-visible`) las retiene: en Chrome, un clic con el mouse también deja el foco en la solapa, y entonces las solapas quedaban a la vista mientras la barra de arriba se escondía (lo vio Benja en la vista previa).
- **Arriba de todo se ven siempre:** la barra de arriba se puede esconder recién pasado el doble de su alto, y las solapas, recién cuando quedaron pegadas.
- **La barra de abajo del celular no se mueve:** queda siempre, como en las apps.
- **No se mueven por un temblor del dedo:** hace falta scrollear más de 12 px. Con menos de eso fallaba: al empezar a bajar, la barra de arriba se achica 8 px (de 64 a 56 en la compu) y el navegador corrige el scroll esos 8 px para atrás, lo que contaba como "subir".
- **Escondidas no se pueden tocar,** y con "movimiento reducido" aparecen y desaparecen sin animación.
- **Con las solapas pegadas y a la vista, va una franja de fondo detrás:** desde arriba de todo hasta debajo de las solapas, a todo el ancho, del color del fondo y apenas translúcida. Antes, el contenido que pasaba por debajo se veía encimado alrededor de las píldoras; Benja lo vio en el Simulador, con el título grande pasando por detrás de las dos barras.
- **Sin encabezados pegados:** el encabezado de las tablas (Opción, Tipo, Liquidez…) y el de cada día en Noticias ya no quedan fijos al bajar. Con las barras escondidas flotaban solos y se encimaban con las filas (pedido de Benja, "de todas"). Se sacó `topSticky` de `DataTable`. El de la tabla de pagos de los bonos queda fijo, porque va dentro de su propia caja con scroll. Ahora lo único fijo arriba son las dos barras.
- **Cómo está hecho:** `useEsconderAlBajar` (`src/lib/use-esconder-al-bajar.ts`), usado por `top-nav.tsx` y `section-tabs.tsx`. Las dos escuchan el mismo scroll con el mismo umbral, así que se mueven juntas.
- **Probado** a 1440 × 900 (Dólar, Metas y la portada, con su scroll suave) y a 375 × 812 (Pesos y Mercados), bajando, subiendo y volviendo arriba. Escondidas quedan del todo fuera de la pantalla; visibles, las solapas vuelven justo debajo de la barra de arriba.

## Los ETFs con el logo de su gestora (rama `etfs-gestoras`, 24/11/2026)

> Pedido de Benja: que los ETFs muestren la gestora (iShares, Vanguard…). El de IBIT era una "i" negra que no se entendía.

- **77 ETFs con el logo de su gestora, siempre el mismo.** Antes iShares aparecía de tres formas distintas (la "i" negra, el cuadrado celeste y uno verde), Vanguard de dos e Invesco de dos.
- **Las gestoras:**
  - iShares (35 ETFs, entre ellos IBIT, EWZ e IVV);
  - SPDR (17: SPY, DIA y los XL*);
  - Vanguard (5);
  - Invesco (9: QQQ, RSP…);
  - J.P. Morgan (4);
  - VanEck (5);
  - Direxion (4);
  - ProShares (3);
  - ARK (3);
  - Global X (2).
  
  Se usa el logo de un ETF de referencia de cada una: IWB, SPY, VOO, QQQ, JEPQ, GDXJ, CHAU, TQQQ, ARKK y COPX.
- **Estaban mal:** XLE, XLF y XBI mostraban "S&P Global" (son de SPDR); RSP, "Guggenheim" (hoy es de Invesco); varios de Invesco y J.P. Morgan tenían logos viejos o de otra marca.
- **VXX** mostraba "iShares UK", pero es de iPath, la marca de ETNs de Barclays: ahora lleva el logo de Barclays (el mismo de su acción, BCS).
- Se copió también en `assets/logos-fuente/activos/`, que tiene prioridad: si se vuelve a correr `scripts/logos.py`, no se pisa.
- Los que ya tenían el logo de su gestora o uno propio quedaron igual: GLD, KWEB, ASHR, CIBR, JETS, PSLV, USO, los de Teucrium (CORN, SOYB, WEAT) y GDLC.
- **Queda para después, si se quiere:** a los temáticos (países, cripto, materias primas, sectores) ponerles un ícono de lo que son, como la bandera de Brasil en EWZ o el logo de Bitcoin en IBIT.

## Logos de los fondos y más entidades en el dólar oficial (rama `inversores-logos-mas-dolar`, 24/11/2026)

> Pedido de Nico: en Inversores, logos para los fondos y fotos para las personas; en Dónde comprar, más apps y bancos en el dólar oficial (había 11) y más en cripto si aparecen.

**Inversores**
- **10 logos nuevos** de fondos con foco en Argentina, sacados de la web de cada uno: North of South, Fundamenta, Helikon, Westwood, Abu Dhabi Investment Council, RWC (hoy Redwheel), Gemsstock, Cape Ann, Sagil y Equinox. Recortados en un cuadrado de 192 px (webp, 0,5 a 5 KB) en `public/inversores/`, con margen para que entren en el círculo. Datos en `LOGOS_INVERSORES` (`src/config/fotos-inversores.ts`). De los 18 fondos con foco en Argentina, 11 tienen imagen (antes 1).
- **Siguen con iniciales:** Aquamarine, VR Advisory, Ping Capital, MAK Capital, Route One (no tienen web propia o el dominio está estacionado), PointState (Zach Schreiber) y Discovery (Rob Citrone): ninguno de los dos tiene una foto con licencia libre, y usar una de un diario sería infringir derechos de autor.
- Equinox publica solo un ícono de 32 px: se ve un poco blando a 56 px en su ficha.
- Test: `tests/fotos-inversores.test.ts` (cada logo es de un fondo que se muestra, tiene su archivo y no pisa una foto).

**Dólar oficial: de 11 a 21 entidades**
- **Fuente nueva: ComparaDolar** (`api.comparadolar.ar/usd`, verificada el 24/11/2026: respondió con 32 entidades, 17 del oficial). Adapter `src/lib/data/adapters/comparadolar.ts`, schema `comparaDolarSchema`.
- **Por qué faltaban:** CriptoYa publica 22 entidades del oficial, pero 10 no se actualizan hace meses (BBVA, Galicia, Santander, Brubank, Macro, Ciudad, Provincia, Patagonia, Piano e ICBC) y la validación las saca por viejas.
- **Cómo se juntan** (`combinarCotizaciones` y `oficialDeComparaDolar` en `src/lib/data/servicios/dolar.ts`): por cada entidad queda CriptoYa si está al día; si no la tiene o está vieja, la de ComparaDolar. De ComparaDolar solo entra el oficial (no el MEP ni el CCL), solo entidades que reconocemos y no las que ellos marcan como desactualizadas. Después pasa por la misma validación de siempre (mediana, puntas, spread). Si una de las dos fuentes falla, el ranking sale con la otra.
- **Entran:** Ualá, Banco Ciudad, Banco Provincia, Bancor, Banco Bica, Banco Santa Cruz, Cocos, Balanz, Reba y Tienda Dólar. Brubank va a "condiciones especiales": ComparaDolar dice que ese precio es "Solo para clientes Ultra".
- **Nuevos en el registro de proveedores:** Banco Santa Cruz y Tienda Dólar, con logo (Tienda Dólar como logo manual en `assets/logos-fuente/`).
- ComparaDolar va en el pie, en /metodologia (tabla de fuentes y criterio del dólar) y en "¿De dónde sale este número?" del ranking.
- Test en `tests/validacion.test.ts`.

**Lo que no se pudo**
- **Galicia, Santander, BBVA, Macro y Mercado Pago** muestran su precio solo dentro de la app (Mercado Pago vende dólar oficial desde julio de 2025). Ninguna fuente pública los tiene al día: CriptoYa los tiene congelados hace meses y sus webs no lo publican. No los sumamos con un precio viejo.
- **Cripto:** CriptoYa ya trae los 34 exchanges que cotizan USDT en pesos (23 en el ranking y 11 P2P aparte). Probé ComparaDolar y su "cripto" da unos $ 100 menos que el USDT, porque es otro producto: no es comparable.

**Para revisar**
- ComparaDolar no publica términos de uso para su API; la usamos con caché de 15 a 60 s (un pedido por minuto como mucho). Si un día piden que no, se saca y el ranking vuelve a 11.
- "Cocos Bank" de ComparaDolar (es el ex Banco Voii) lo mostramos como **Cocos**, que es la app donde se compra.

## Bytelime fuera del ranking del dólar (rama `sin-bytelime`, 24/11/2026)

> Benja vio que Bytelime era el único sin logo ("BY") y pidió sacarlo.

- **Por qué:** no tiene web ni app propia donde comprar. `bytelime.com` es un dominio a la venta. Bytelime S.A.S. es una casa de cambio registrada en el BCRA (operador N° 20.194) que operaba las compras de dólares de otras apps, como Manteca, según unos términos de Manteca que ya no están online. Su precio llega por CriptoYa, que tampoco tiene link ni logo. En un ranking para decidir dónde comprar, una opción a la que no se puede ir confunde.
- **Cómo:** `SIN_DONDE_COMPRAR` en `src/lib/data/servicios/dolar.ts`. Sale del ranking (Dónde comprar, la portada, las alertas de "dónde comprar") y queda en la lista de excluidos con el motivo "No tiene web ni app propia donde comprar".
- **Para Nico:** si sabés qué app está detrás de Bytelime, se puede volver a sumar con ese nombre, logo y link.
- Test en `tests/validacion.test.ts`.

## Fotos de los inversores (rama `inversores-fotos`, 24/11/2026)

> Pedido de Benja: en Inversores, poner la foto de las personas en vez de las iniciales (el círculo mostraba las de la firma: "BH" para Buffett, "PS" para Ackman).

- **7 fotos** (Buffett, Gates, Dalio, Cathie Wood, Ackman, Howard Marks, Peter Thiel), todas de **Wikimedia Commons con licencia libre**: dominio público, CC BY o CC BY-SA. Se bajaron en chico, se recortaron en un cuadrado centrado en la cara (192 × 192, webp, ~7 KB) y viven en `public/inversores/`. No dependemos de Wikimedia para mostrarlas.
- **Datos y créditos:** `src/config/fotos-inversores.ts` (autor, licencia y página de cada foto). Las licencias piden nombrar al autor: al pie de la lista y de cada ficha sale "Fotos de Wikimedia Commons, recortadas: …" con links.
- **Sin foto libre:** Rob Citrone y Zach Schreiber. Siguen con monograma, pero ahora con las iniciales de la persona ("RC", "ZS"), no las de la firma. Los fondos sin persona siguen con las de la firma.
- **Antes era una decisión de diseño** ("sin fotos, como las marcas del resto del sitio"); la cambió Benja. El aviso de la página ya dice que Rinde no está relacionado con estos inversores: las fotos acompañan datos públicos de la SEC, no sugieren un respaldo.
- De paso: la descripción de la página (la que ve Google) todavía nombraba a Druckenmiller, que se sacó; ahora dice Buffett, Dalio, Cathie Wood.
- Test: `tests/fotos-inversores.test.ts` (que cada foto sea de un inversor de la lista, tenga su archivo y su licencia).

## La portada en el celular ya no se traba (rama `celular-portada-fluida`, 24/11/2026)

> Punto 3 de la Lista ("el scroll se traba, hay que darle muchas veces para que baje") y captura de Benja desde el celular.

- **Qué pasaba:** en el celular, las 6 escenas de la historia quedaban fijas mientras corría su animación: en total, **6 pantallas de scroll en las que la página no bajaba**. Medido en la web en vivo a 375 px: 14.190 px de alto.
- **Ahora, en el celular, las escenas fluyen con el dedo** y la animación se reparte mientras bajan (el modo `fluidoMobile`, que existía pero ninguna escena usaba). Cada una ocupa su alto natural: la portada pasa a 9.143 px y no queda ninguna pantalla fija. **En la compu no cambia nada.**
- **El modo `fluidoMobile` tenía un error** que nadie había visto: las clases de Tailwind que soltaban el interior perdían contra la regla `.escena-interior` de `globals.css` (las utilidades van en una capa y pierden contra las reglas sin capa). Se pasó todo a `globals.css`. De costado se sigue recortando: las tarjetas de "El problema" se salen a propósito y, sin el recorte, la página se ensanchaba a 545 px.
- **Sin saltos al llegar a cada escena:** en el celular se dibujan siempre (sin `content-visibility: auto`, que reservaba una pantalla de alto).
- **`SiNoEntra` ya no reacciona a la barra del navegador:** en pantallas táctiles, que la barra se esconda o aparezca al scrollear cambiaba el alto de la ventana, y eso podía recalcular todos los recorridos en pleno scroll. Ahora cuenta solo si cambia el ancho (girar el teléfono).
- **El interruptor de "Colores alternativos"** (menú "Más") tenía el círculo afuera del óvalo: el mismo error que el de Alertas (le faltaba `left-0`).
- Probado a 375 × 812 (las 6 escenas, de a una, mientras se scrollea; el interruptor prendido y apagado) y a 1024 × 768 (las escenas siguen como antes). Benja lo probó en su iPhone con la vista previa: anda bien.
- **Inicio marcado al entrar** (pedido de Benja): al entrar directo a la portada, ni la barra de arriba ni la de abajo marcaban Inicio (la de abajo marcaba "Más"). Cuando Vercel regenera la portada (cada 60 s), la versión nueva trae la ruta `/index` y `usePathname()` la devuelve así: se ve en el HTML (`"c":["","index"]`), en la web oficial y en las vistas previas. Con `next start` en la compu no pasa. Ahora `rutaActiva()` (pasó a `src/lib/rutas.ts`) cuenta `/index` como Inicio. Test: `tests/rutas.test.ts`.

## Importar la cartera desde una planilla CSV o Excel (punto 31, partes 1 y 2, rama `importar-planilla`, 24/11/2026)

> Pedido de Nico: que el usuario pueda cargar su cartera con más formatos que el JSON. Primero CSV y Excel con vista previa; después, fotos de las operaciones.

- **Cómo se usa:** Mi cartera → "Importar" abre un panel con dos pasos: "Bajar planilla modelo" (se abre con Excel o Google Sheets) y "Elegir archivo" (.csv o .xlsx). Abajo, una ayuda corta de cada columna.
- **Vista previa antes de guardar:** "En mi-cartera.csv hay 8 filas: 4 listas, 2 para revisar, 2 con errores." Cada fila muestra lo que se entendió (operación, activo, cantidad y precio o monto, fecha), con una casilla para sumarla o no.
  - **Para revisar** (tildadas): ticker que no está en nuestras listas, billetera sin TNA, plazo fijo sin vencimiento.
  - **Ya estaban** (destildadas): mismo activo, fecha, tipo e importe que un movimiento de la cartera. Así subir dos veces el mismo archivo no duplica nada.
  - **Con error** (no se pueden sumar), con el motivo: fecha que no existe o futura, tipo desconocido, falta el precio, un CEDEAR cargado en dólares, etc.
  - **De ejemplo:** las filas de la planilla modelo no se suman aunque el usuario no las borre.
- **Qué entiende:** columnas con otros nombres (Operación, Símbolo, Tipo, Monto…), con o sin tildes; fechas 10/03/2026, 1/3/26 o 2026-03-10; números 18.500, 6.500,50, 0,005 o 62.5; separador ";" o ","; Excel con fechas y números de verdad.
- **Los activos quedan igual que los cargados a mano** (misma regla de id, nombre y moneda, ahora en `src/lib/cartera/activos.ts`, compartida con el formulario): lo importado se junta con lo que ya había.
- **Exportar CSV** ahora sale en formato de Excel en castellano (";" y coma decimal, se ven las tildes) y suma TNA y vencimiento: se puede volver a importar tal cual.
- **El JSON sigue funcionando** desde el mismo panel (reemplaza toda la cartera, como antes).
- **Privacidad:** la planilla se lee en el navegador; no se manda a ningún servidor (con cuenta, se guardan los movimientos como siempre).
- **Dependencia nueva:** `read-excel-file` (MIT), que se carga solo cuando alguien sube un Excel.
- Probado en el navegador (1440 px oscuro y 375 px claro) con un CSV hecho a mano con errores y un Excel. Tests: `tests/importar-planilla.test.ts` (27, incluida la ida y vuelta exportar → importar).

### Para revisar
1. **"18.500" sin coma se lee como 18500** (punto de miles, como se escribe acá). Un "1.234" con punto decimal (planillas en inglés) se leería como 1234: la vista previa lo muestra antes de guardar.
2. **Las filas con error no se editan en la vista previa:** se corrigen en el archivo y se vuelve a subir. Si hace falta, se puede sumar edición fila por fila.
3. **Excel viejo (.xls) no se lee:** se pide guardarlo como .xlsx o .csv.

---

## Cuentas de usuario: la cartera en cualquier dispositivo (rama `cuenta-cartera`, 24/11/2026)

> Pedido de Nico: que el usuario pueda iniciar sesión con su mail para ver su cartera desde cualquier lado, y que se inicie sesión dentro de Mi cartera.

- **Es opcional.** Sin cuenta, todo sigue como antes: la cartera se guarda en el navegador y no hace falta registrarse.
- **Cómo se entra:** en Mi cartera aparece "Guardala en tu cuenta" → "Entrar con mi mail". El usuario pone su mail, le llega un **código** y lo escribe ahí mismo. No hay contraseña. Si es la primera vez, la cuenta se crea sola.
  - Se eligió código y no link: en el celular, el link se abre en el navegador de la app de correo y no donde estaba el usuario.
- **Al entrar, lo cargado en el navegador se suma a la cuenta** (no la pisa: los movimientos que la cuenta ya tiene no se repiten y, si un activo ya está, manda la cuenta). Recién cuando se subió, se borra del navegador. Aviso: "Sumamos a tu cuenta los N movimientos…".
- **Con sesión:** la cartera se lee y se guarda en la cuenta, abajo de las acciones dice "Guardada en tu cuenta (mail) · Cerrar sesión", y no hay cartera de ejemplo. Las alertas de vencimiento leen la cartera de la cuenta.
- **Al cerrar sesión:** en ese navegador no queda nada; vuelve la cartera de ejemplo.
- **Base de datos:** Supabase (plan gratis, en San Pablo), conectado desde el Marketplace de Vercel, que carga solas las claves. Tablas en `supabase/migrations/0001_cartera.sql`; se aplican con `pnpm db:migrar`.
- **Seguridad (probado contra la base real con dos usuarios de prueba, que después se borraron):** sin sesión no se lee ni se escribe nada; cada usuario ve solo lo suyo y no puede leer, escribir, modificar ni borrar lo de otro. Lo controla la base (Row Level Security), no solo la web.
- **Probado de punta a punta en el navegador** (1440 px oscuro y 375 px claro): entrar con código, código equivocado, subida de lo del navegador, recargar y seguir con sesión, cerrar sesión.
- **Textos:** la política de privacidad (/legal) explica qué se guarda con cuenta y dónde; /metodologia y el formulario dicen dónde se guarda según haya sesión o no.
- **Solo la cartera, por ahora.** Metas, alertas y seguidos siguen en el navegador.
- Tests: `tests/cartera-fusion.test.ts` (qué se sube al entrar) y `tests/cuenta-errores.test.ts` (mensajes de error).

- **Mails (hecho el 24/11/2026):** salen de `no-reply@donderinde.com.ar` con Resend (Marketplace de Vercel, plan gratis), conectado a Supabase por SMTP. Dominio verificado en Resend (DKIM, SPF y MX cargados en el DNS de Vercel). Plantillas "Magic link or OTP" y "Confirm sign up" en castellano y con el código: `supabase/plantillas/codigo.html`. Probado: llegó el mail y se pudo entrar.

### Para hacer antes de abrirlo al público
1. **Un mail de contacto real.** `site.contacto` todavía es `hola@rinde.example`; la política de privacidad dice que pueden pedirnos ver o borrar sus datos.
2. **Ley 25.326:** con cuentas guardamos datos personales. Conviene que un abogado revise la política y la inscripción de la base ante la AAIP.

### Para revisar
1. **El código tiene 8 números** (lo que trae Supabase hoy). Se puede bajar a 6 en Supabase → Authentication → Sign In / Providers → Email → "Email OTP Length".
2. **Al entrar, la cartera pasa del navegador a la cuenta** (no queda copia en el navegador). Así, al cerrar sesión en una compu compartida no queda nada a la vista.
3. **Borrar la cuenta** todavía se pide por mail; falta un botón.

---

## Cuánto subió o bajó entre dos fechas, en el gráfico (rama `grafico-tramo`, 23/11/2026)

> Benja: como en Google Finance, unir dos puntos del gráfico y ver cuánto subió o bajó.

- **En la compu:** apretás sobre el gráfico y arrastrás. Al soltar, el tramo queda a la vista hasta otro clic o hasta sacar el mouse del gráfico.
- **En el celular:** tocás el gráfico con dos dedos (con uno solo se sigue viendo el valor de cada fecha). Al levantar un dedo, se va.
- **Qué muestra:**
  - el tramo sombreado, con una línea punteada en cada fecha y un punto sobre la línea, verde si subió y rojo si bajó;
  - el encabezado cambia a "▲ +33,14 % (+$ 6.690,00) del 9 feb al 17 sep", y la cifra grande, al valor de la segunda fecha;
  - en la brecha, que ya es un porcentaje, la diferencia va en puntos ("+0,5 pp") y sin monto.
- **Dónde:** en todos los gráficos de precio: fichas (área, línea o velas; con velas se toma el cierre), Cartera e histórico del dólar.
- **Ayuda:** una línea chica debajo del gráfico: "Arrastrá sobre el gráfico…" en la compu y "Tocá el gráfico con dos dedos…" en el celular.
- **Cálculo:** `src/lib/calculos/tramo.ts` (puro, con decimal.js) y `tests/tramo.test.ts` (5 pruebas).
- Probado con el mouse en la compu y con dos dedos simulados en 375 px: suba, baja, velas, brecha y dólar MEP. Las cuentas cierran ($ 26.880 − $ 6.690 = $ 20.190 → +33,14 %).

---

## El interruptor de las alertas, en su lugar (rama `alertas-interruptor`, 23/11/2026)

> Benja: en Alertas, el círculo blanco del interruptor se salía del óvalo por la derecha.

- **Por qué:** el círculo no decía desde dónde arrancaba (le faltaba `left-0`). Dentro de un `<button>` el contenido va centrado, así que arrancaba del medio del óvalo y, encendido, se salía 19 px.
- **Arreglo:** `left-0` en el círculo (`src/components/modules/alertas/vista.tsx`). Ahora queda a 3 px de cada borde, encendido y apagado. También en el de "¿Dónde rinde más?" (`pesos/donde-rinde.tsx`): ahí andaba porque no es un botón, pero así no se rompe si algún día lo es.
- Revisado con alertas de prueba (encendida y apagada) y tocando cada interruptor.

---

## Los botones del gráfico, siempre en una fila (rama `grafico-botones`, 23/11/2026)

> Benja: los botones del gráfico (Área, Línea, Velas y 1S… Máx) a veces estaban en una fila y, al tocar uno, pasaban a dos.

- **Por qué pasaba:** iban al lado del precio en una fila que podía partirse. Al tocar un rango cambia el texto de la variación ("en 3 meses", "en 1 año"…), el precio ocupa más y los botones bajaban. A 1024 px ya estaban partidos desde el principio.
- **Ahora** (`src/components/charts/price-chart.tsx`): lo decide el ancho del gráfico, no el texto.
  - Si el gráfico mide 46rem (736 px) o más, los botones van al lado del precio, en una fila.
  - Si no, van debajo del precio, también en una fila.
  - En el celular, donde los dos grupos no entran, la fila se desliza de costado (como las solapas) en vez de partirse.
- Revisado tocando cada rango a 1366 px (al lado del precio), 1024 px (debajo) y 375 px (se desliza), y en el histórico del dólar. Vale para todos los gráficos de precio: fichas, Cartera e histórico del dólar.

---

## El ícono viejo de las tres barras (rama `icono-cache`, 23/11/2026)

> Benja seguía viendo las tres barras en la pestaña, aunque desde el 22/11 el ícono es la "r".

- **La web publicada ya sirve la "r"** (pestaña, ícono del celular y los de la app instalable). Lo viejo quedaba guardado en el navegador.
- **Un problema real del service worker** (`public/sw.js`): guardaba los íconos de la app (`/iconos/192`, `/iconos/512`, `/iconos/maskable`) para siempre. Esos nombres no cambian cuando cambia el dibujo, así que quien entró antes del 22/11 se quedaba con las barras.
- **Arreglo:**
  - los íconos ahora se piden primero a la red, y lo guardado se usa solo sin conexión;
  - la versión del caché pasa a `rinde-v2`: al actualizarse, el service worker borra todo lo guardado con la anterior, incluidos los íconos viejos;
  - de paso, una respuesta con error (404, 500) ya no reemplaza lo guardado.
- **Pruebas:** `tests/sw.test.ts` (5) corre el service worker con un caché y una red de mentira. Con el service worker viejo fallan 3; con el nuevo pasan todas. El navegador integrado de Claude no permite registrar service workers, por eso la prueba es así y no en el navegador.
- **La pestaña de Chrome** puede tardar en cambiar el ícono aunque la página esté al día (Chrome guarda los íconos aparte). Se arregla con Ctrl + F5 o cerrando y abriendo la pestaña.

---

## Allaria, SBS y Adcap en las comisiones, y logos de Bull Market y Adcap (punto 29, rama `brokers-faltantes`, 23/11/2026)

> Lo que faltaba del punto 29: sumar Allaria, Adcap y SBS cuando publicaran su tarifario, y el logo de Bull Market.

- **Los tres tienen tarifario oficial** (leídos el 23/11/2026, con su link en Mercados → Brokers):
  - **Allaria:** la tabla se mudó a `allariainversiones.com.ar` (por eso el link viejo daba error). Se toma la "operatoria con autogestión" (web, sin asesor).
  - **SBS:** la tabla 2026 de SBS Trading. Se toma la tarifa "Cliente directo Quicktrade": quien abre la cuenta solo, en la web o la app de Quicktrade.
  - **Adcap:** su tabla (en `ad-cap.com.ar`, con guion) publica solo comisiones máximas y no tiene tarifa aparte para la app. Se muestran esas, con "hasta" y una nota que lo aclara.

  | Broker | Acciones y CEDEARs | Bonos | Letras | Opciones | Custodia |
  |---|---|---|---|---|---|
  | Allaria | hasta 0,50 % + IVA | hasta 0,25 % | hasta 0,25 % (*) | hasta 0,60 % + IVA | $ 35 + IVA por mes |
  | SBS (Quicktrade) | 0,70 % + IVA | 0,50 % | 2 % anual | 0,70 % + IVA | US$ 3,50 por mes, bonificado |
  | Adcap (máximos) | hasta 3 % + IVA | hasta 2 % | hasta 1,5 % | hasta 1 % + IVA | sin arancel en la tabla |

  (*) La tabla de Allaria no separa las letras: son títulos públicos, con la misma comisión.
- **Cómo quedan en acciones y CEDEARs:** Cocos (0,45 % + IVA); Allaria, Balanz, Bull Market e IOL (0,50 % + IVA); PPI (0,60 %), SBS (0,70 %) y Adcap (hasta 3 %, su máximo). En bonos, Allaria pasa a ser el más barato (hasta 0,25 %).
- **Sin monto ni "Te cobra"** (pedido de Benja, 23/11/2026): la tabla muestra solo la comisión de cada broker, de la más barata a la más cara (con el IVA en la cuenta; el orden no depende del monto). Así en la ficha y en Mercados → Brokers. Las letras de Mercados → Brokers conservan el plazo (30, 90 o 180 días), porque Cocos y SBS cobran tasa anual y el orden cambia según cuánto le queda a la letra.
- **Letras de tasa anual:** ahora son dos (Cocos y SBS). La nota de la tabla los nombra solos según cuáles aparecen.
- **Logos de Bull Market (el toro) y de Adcap:** el ícono de cada sitio, con el mismo tratamiento que los demás logos manuales (original en `assets/logos-fuente/proveedores/`, 96 px en `public/logos/proveedores/`). Revisados a ojo.
- **Sitios actualizados:** Bull Market ahora es `bullmarket.com.ar`; se sumaron los de Allaria, Adcap y SBS.
- Tests: `tests/comisiones.test.ts` (7), con el nuevo orden y que los que publican máximos van con "hasta".

### Para revisar
1. **Adcap con sus máximos:** queda último lejos (3 % en acciones). Es lo que publica; la nota aclara que puede cobrar bastante menos. Otra opción es sacarlo hasta que publique una tarifa para la app.
2. **La bonificación de SBS** (mantenimiento de US$ 3,50) dice "hasta el 31/12/2025, pudiendo ser renovado automáticamente", en la tabla 2026. Se muestra como bonificado.

## Conceptos que se explican solos (punto 24, rama `conceptos`, 23/11/2026)

> Pedido: tocar (o pasar el mouse por) conceptos como el PER, el EBITDA o la TIR y que aparezca un cuadro chico que explique qué son, con la misma explicación en todo el sitio.

- **Cómo se ve:** el concepto va subrayado con puntos. En la compu se abre al pasar el mouse (con un cuarto de segundo de espera, así no salta al pasar de largo) y se cierra al salir; un clic lo deja abierto hasta otro clic o hasta tocar afuera. En el celular se abre al tocarlo y se cierra tocando afuera. Muestra el término, la explicación en dos líneas y "Más en Aprender", que lleva a ese término en /aprender.
- **Una sola fuente:** `src/lib/glosario.ts`. /aprender pasó de 25 a **60 términos** y el cuadro usa el mismo texto. Cada término guarda también cómo aparece escrito en pantalla ("Volatilidad anual", "PER (precio / ganancia)", "VI", "Capital que queda"), así que alcanza con envolver un texto en `<Etiqueta texto="…" />`: si es un concepto, se explica; si no, queda igual.
- **Dónde aparece:**
  - Fichas de CEDEARs y acciones: datos clave y balances (capitalización, valor de empresa, PER, EBITDA, márgenes, ROE, ROA, deuda, liquidez…).
  - Fichas de bonos y letras: TIR, duration, paridad, cupón de hoy, rendimiento corriente, capital que queda, volatilidad, máxima caída.
  - Comparar: máxima caída, volatilidad, PER, margen neto, ROE y dividendo.
  - Opciones: VI, delta y base.
- **Lo que no tiene:** los encabezados de la tabla de bonos, que ya se tocan para ordenar (sería un botón dentro de otro).
- **Pruebas:** `tests/glosario.test.ts` (ids únicos, ninguna etiqueta repetida en dos términos, y que reconozca los textos tal como están en pantalla).

---

## CEDEARs en los feriados (rama `feriado-cedears`, 23/11/2026)

- **El feriado del 23/11 la tabla de CEDEARs quedó vacía:** sin rueda, data912 trae todo con volumen 0, y la tabla dejaba afuera los que no operaron. Ahora, si hoy no hubo rueda (feriado, fin de semana o antes de que abra), muestra el último cierre de los CEDEARs conocidos (`data/ar/mercados.ts`) y de los que tienen especie en dólares; con rueda, como antes, los que operaron. Con un test.
- **La fecha:** decía "Cierre del 23 nov" con los precios del viernes 20. Ahora, sin rueda, CEDEARs, acciones y bonos dicen el cierre del último día hábil (`momentoData912`, con los feriados).
- El volumen en 0 se muestra "—" en vez de "$ 0".

---

## Ícono nuevo en la pestaña (22/11/2026)

- La "r" del logotipo, blanca, con el punto de sol amarillo, sobre un cuadrado casi negro (la imagen que mandó Nico), en vez de las tres barras. Lo arma `src/lib/icono.tsx` con la misma tipografía del logo (Bricolage extra negrita): la pestaña (64 px, puntas redondeadas), el ícono de iPhone (180 px) y los del manifest para instalar la app (192, 512 y maskable).

---

## Carteras de grandes inversores (punto 28, rama `inversores`, 22/11/2026)

> Pedido de Nico: las carteras de grandes inversores y fondos, sobre todo los que tienen activos argentinos. Para cada uno, una dona con los logos de sus posiciones (como las infografías de la cartera de Buffett) y sus últimos movimientos (como las apps que siguen carteras). Nada en las fichas de cada acción.

- **Dónde:** Mercados → **Inversores** (`/mercados/inversores`), y una página por inversor (`/mercados/inversores/buffett`).
- **Portada:** arranca directo con el ranking (sin la cifra grande de arriba ni la frase "los nuevos se suman solos", pedido de Nico, 23/11/2026): "Con foco en Argentina" (cuánto, qué % de su cartera y en qué); y "Los grandes del mundo".
- **Página de cada uno:** el total, cuánto tiene en Argentina, la fecha de la cartera y de la presentación, y el enlace al informe en la SEC; la dona con el logo de cada posición adentro y el % afuera (las 10 más grandes y el resto); la lista de posiciones (con "No cotiza en Argentina" si no hay CEDEAR); y los movimientos contra el informe anterior, en tres grupos, uno al lado del otro (posiciones nuevas, aumentó y redujo; lo que vendió del todo va en "redujo", hasta 0 %; pedido de Nico), con el % antes → ahora, cuántas acciones sumó o vendió y un selector para ver informes anteriores.
- **Fuente:** formularios 13F de la SEC, leídos de EDGAR (últimos 5 informes de cada fondo, con las enmiendas aplicadas). Solo acciones y ETF comprados; sin opciones. El CUSIP de cada acción se pasa a ticker con OpenFIGI (gratis) y se guarda en `data/inversores/cusips.json`.
- **Quiénes:**
  - Con foco en Argentina (lista fija, `data/inversores/lista.json`): Aquamarine Financial, Helikon, Westwood Global, VR Advisory, Ping Capital, PointState (Zach Schreiber), North of South, Discovery (Rob Citrone), MAK Capital, Thiel Macro (Peter Thiel) y Fundamenta Capital (Montevideo).
  - Se suman solos cada trimestre los fondos que más tienen en acciones argentinas (al menos US$ 10 M y el 3 % de su cartera), según el data set trimestral de 13F de la SEC: hoy Abu Dhabi Investment Council, RWC, Route One, Cape Ann, Gemsstock, Sagil y Equinox.
  - Los grandes del mundo: Berkshire (Warren Buffett), Pershing Square (Bill Ackman), Bridgewater (fundado por Ray Dalio), Oaktree (Howard Marks), ARK (Cathie Wood) y la Fundación Gates.
  - **Excluidos** (`excluidos` en `lista.json`, no entran ni solos): Duquesne (Stanley Druckenmiller), a pedido de Nico.
  - Sin "Últimos movimientos" en la portada (pedido de Nico): los movimientos se ven en la página de cada uno.
- **Actualización:** `scripts/inversores.py` (Python), con un workflow que corre todos los lunes (`.github/workflows/inversores.yml`) y sube los cambios solo si los hay. Baja también el logo de las acciones nuevas que no tienen (Financial Modeling Prep, como los demás); si no hay, queda el monograma.
- **Con datos reales (22/11/2026):** 24 inversores, casi todos con la cartera al 30/9/2026 (Pershing al 31/3 y Oaktree al 30/6: todavía no presentaron el último). Los 18 con foco en Argentina tienen **US$ 3.463 M** en acciones argentinas; el que más, Aquamarine (US$ 857 M, 44 % de su cartera: YPF, Galicia, Macro, BBVA).
- **Fondos que informan en miles:** desde 2023 el 13F va en dólares, pero algunos siguen informando en miles (Duquesne daba US$ 4,1 M en vez de US$ 4.149 M). `corregir_miles()` lo detecta por el precio por acción que resulta (mediana de menos de US$ 2) y multiplica por 1.000, también al buscar los fondos con foco en Argentina. 831 de las 844 acciones que se muestran tienen ticker (los códigos que empiezan con letra se buscan como CINS); 566 logos nuevos (de 467 a 1.033). Se descartaron 3 logos de FMP que no servían (una foto, uno vacío). Capturas en `.shots/inversores/` (375 y 1440 px, claro y oscuro).
- **Activos argentinos:** 19 CUSIP verificados en los propios 13F (`data/inversores/argentinos.json`): YPF, Galicia, Macro, BBVA, Supervielle, Pampa, Vista, TGS, Central Puerto, Edenor, Telecom, Loma Negra, IRSA, Cresud, Corporación América, Adecoagro, Lithium Argentina, Bioceres y el ETF ARGT.

### Lo que no entra todavía
- **FCI argentinos:** la CAFCI cerró su API ("Route not allowed") y la CNV recibe las carteras semanales de los fondos (RG 961/2023) pero no las publica en un formato abierto; cada administradora las sube en PDF a su sitio.
- **Burry (Scion):** cerró el fondo; su último 13F es del 30/9/2025.
- **Congresistas de EE.UU. (Pelosi):** son declaraciones en PDF ante el Congreso; los datos ordenados los venden terceros con licencia.

### Decisiones para revisar
1. **Nombres de los fondos, no de las personas,** salvo cuando quién está atrás es público y seguro (Buffett, Ackman, Druckenmiller, Marks, Wood, Gates, Citrone, Thiel, Schreiber; Bridgewater dice "Fundado por Ray Dalio"). De Aquamarine, Ping o Helikon la SEC no lo dice.
2. **Sin fotos:** monogramas con las iniciales del fondo.
3. **Los bancos enormes** (JPMorgan, Fidelity, Morgan Stanley) tienen mucho en Argentina en dólares, pero es menos del 1 % de lo que manejan: no entran (piso del 3 %).
4. **El 13F llega hasta 45 días tarde** y no muestra bonos ni cortos: lo dice cada página, con las dos fechas (cartera y presentación).
5. **Abu Dhabi Investment Council** es un fondo soberano: entra solo por tener el 26 % de su cartera de 13F en Vista.

---

## Siguiendo: sin la cantidad y en la moneda que elegís (rama `siguiendo-moneda`, 22/11/2026)

> Correcciones de Nico: el botón sin el número de seguidos, y que cada activo se sume en la moneda que se estaba mirando (siguió BTC y se agregó en pesos).

- **El botón dice solo "★ Siguiendo"**, sin "· N".
- **El botón está siempre** (22/11/2026, pedido de Nico): si no seguís nada, la lista lo dice y explica cómo sumar un activo (antes el botón no aparecía, y en Vercel parecía que faltaba: lo seguido se guarda en cada navegador y en cada dirección por separado).
- **Cada activo se sigue en la moneda que estás mirando** en el gráfico de la ficha ("En pesos" / "En dólares"): el gráfico la anota (`fijarMonedaVista`) y "★ Seguir" la guarda con el activo. El aviso lo dice ("Seguís Bitcoin en dólares"). Si la ficha no tiene selector, va en la moneda del activo (bonos en dólares; el resto en pesos).
- **La lista muestra cada uno en su moneda.** El servicio de precios ahora trae también la otra moneda: CEDEARs con su especie en dólares, bonos con su especie en pesos, cripto con su precio en dólares; acciones y LECAPs pasadas al dólar MEP. La variación en la otra moneda compone la del activo con la del MEP del día. Los que se siguieron antes de este cambio quedan en la moneda del activo.
- Probado: BTC (en dólares, como abre la ficha) → US$ 63.936; ETH en pesos → $ 3.039.900; GGAL en dólares → US$ 2,61; AL30 → US$ 47,50.
- **Cripto con variación en la lista:** BTC, ETH, USDT y USDC no mostraban variación. Ahora llevan la de las últimas 24 h de Binance, como su ficha: BTC y ETH en dólares, de su par contra USDT; en pesos, esa compuesta con la del dólar cripto (USDT/ARS); USDT y USDC, la de su par en pesos (`binance.ticker24h`).
- **Scroll con la lista abierta (compu):** el panel quedaba abierto pero se iba con la página, y la rueda, al llegar al final de la lista, seguía bajando la página de atrás. Ahora, mientras la lista está abierta, la página queda quieta (como con el calendario) y la rueda mueve solo la lista; se cierra con un clic afuera o Esc. En el celular ya andaba bien (sube desde abajo y bloquea la página).
- **Gráfico del Merval los fines de semana:** salía una línea plana y una variación que no era la real (−0,26 % en vez de −0,24 %). Yahoo publica puntos los sábados y domingos, todos con el último cierre, y el código los tomaba como una rueda. Además, el cierre oficial de BYMA llega un rato después de las 17 h y se usaba el último dato de la rueda. Ahora solo cuentan los días hábiles con movimiento, la línea termina en el cierre oficial y la base es el cierre oficial de la rueda anterior (`ultimaRueda`, con un test nuevo).
- **De paso, cripto en Mercados:** las tarjetas de BTC y ETH mostraban en dólares la mediana de los exchanges argentinos, que cotizan con sobreprecio (BTC US$ 63.976 contra US$ 60.906 en Binance). Ahora usan el precio de Binance, como la ficha y como dice Metodología (`binance.precioActual`, caché de 15 s). Los exchanges en dólares quedan de respaldo si Binance no responde. El precio en pesos no cambia (mediana de los exchanges, que ya coincidía).

### Decisiones para revisar
1. **Acciones y LECAPs en dólares, al MEP:** no tienen especie en dólares con precio propio, así que se dividen por el MEP del momento.
2. **Mismo activo en las dos monedas:** se sigue una sola vez. Para cambiarle la moneda, dejás de seguirlo y lo volvés a seguir mirando la otra.

---

## Rediseño: la home como una historia (rama `rediseno`, sin subir todavía)

> Pedido de los fundadores (17/11/2026): llevar el diseño al nivel de moahu.com.ar, Apple y Whoop. La parte de producto de la home se cuenta como una historia por secciones, con una idea por sección y componentes reales en modo demo.

**Estado:** la home completa está hecha.
- La portada, la cinta, el comparador y las 8 escenas, cada una con dos rondas de revisión con capturas en 375 y 1440 px, dark y light.
- El resto de las páginas ya tiene la base nueva (tipografías, colores, botones, nav y solapas), pero todavía no su rediseño de composición.
- Capturas y videos de cada escena: `.shots/narrativa/`.

**Regla de movimiento:** cada animación empieza con algo que pasa (scrolleás o tocás), llega a su lugar y frena. Nada se mueve en loop. Está en DISENO.md §7.

**Técnica:**
- GSAP + ScrollTrigger para todo lo atado al scroll, y Motion para los botones y las solapas.
- Lenis (scroll suave) solo en la home.
- Las escenas son HTML de servidor. Un "director" de cliente muy chico les conecta la coreografía, y GSAP se carga cuando el navegador queda libre, así no compite con la carga de la portada.
- Las escenas largas usan `position: sticky` dentro de un contenedor alto (no el *pin* de GSAP), así no hay saltos de layout.
- Solo se animan `transform` y `opacity`, y las escenas fuera de pantalla no se dibujan (`content-visibility`).
- Con movimiento reducido, cada escena ocupa su alto natural y aparece con un fundido de 120 ms.
- Sin JavaScript se ve todo en su estado final.

### Cómo se lee la home de arriba a abajo

| # | Sección | La idea en una frase | Qué componente real usa | Coreografía (qué entra, desde dónde, cuándo y dónde frena) |
|---|---|---|---|---|
| 0 | **La foto de hoy** (portada) | "Hoy el dólar MEP está a **$ X** y tu plata rinde hasta **Y %** sin plazo." El titular es la respuesta | Cotización MEP y mejor tasa sin plazo (en píldoras verde y celeste dentro del titular), oficial y brecha, tasa a 30 días y "qué pasó hoy" (todo real) | **Al cargar:** el titular sube palabra por palabra (70 ms entre palabras) y después llegan los tres datos de abajo. Frena. **Es lo único que se mueve sin que hagas nada.** |
| — | **Cinta de cotizaciones** | Los números del día, de un vistazo | Las cotizaciones reales | Banda amarilla inclinada. **Solo avanza mientras scrolleás** y frena cuando parás. |
| — | **¿Dónde rinde más tu plata?** | La herramienta | El comparador real | Sin coreografía: es una herramienta y tiene que estar quieta y lista. Va sobre una lámina invertida. |
| 1 | **El problema** | "Tu plata está repartida y no sabés si rinde." | 6 lugares de la cartera de ejemplo con su monto (rotulado) | Las fichas **entran desde los bordes** a posiciones desordenadas e inclinadas, con un "¿rinde?" donde iría la tasa. Al 50 % aparece el total. Frena. |
| 2 | **La respuesta** | "Todas las tasas, en la misma cuenta." | La mejor opción real de cada tipo, en TEA y en pesos por mes | Lámina celeste. Las barras **crecen hasta su TEA en desorden** y los números cuentan con ellas. Al 42 % las filas **se reordenan de mayor a menor** y aparece "La más alta". Frena al 75 %. |
| 3 | **El dólar** | "El dólar más barato, app por app." | Ranking real de USD con comisiones | Cada proveedor **llega desde la derecha a su precio** sobre una regla común. Después aparece la guía del más barato y el ahorro contra el más caro **se arma número por número**. Frena. |
| 4 | **Tu cartera** | "¿Le ganaste a la inflación y al dólar?" | Análisis real de la cartera de ejemplo contra IPC y MEP, en base 100 (rotulado) | Lámina lila. Las tres líneas **se dibujan de izquierda a derecha**; al 52 % aparecen las etiquetas y al 62 % los veredictos, que cuentan hasta su valor. Frena. |
| 5 | **Alertas** | "Te avisamos antes." | 3 alertas de ejemplo evaluadas con los datos de este momento | Las alertas **bajan una por una como notificaciones** (al 14, 30 y 46 %). La que se cumple hoy es verde y marca "Se cumple hoy". Frena. |
| 6 | **Macizo o hueco** | "La misma plata, dos destinos." | $ 1.000.000 por 12 meses: quieta contra puesta en la mejor tasa sin plazo, con la inflación del REM, en pesos de hoy (decimal.js) | Lámina invertida. **El scroll es el tiempo:** el contador va del mes 0 al 12; la "quieta" es un contorno que se achica (hueca) y la "puesta a rendir" se llena (maciza). La línea punteada marca lo que pusiste. Frena en el mes 12 con la diferencia. |
| 7 | **Confianza** | "Ningún número sin su fuente." | Las 6 fuentes con su estado real ahora (En vivo, Demorado, Cierre, Sin respuesta) | Las filas entran escalonadas y cada una prende su estado. Al lado, tres reglas. En mobile la escena fluye (no es pegajosa) porque no entra en una pantalla. Frena. |
| 8 | **Cierre** | "Empezá gratis." | Botones reales a Cartera y Alertas | Lámina sol que **sube** mientras entra; el titular gigante se asienta (0,9 → 1) y llegan los botones. Frena. |

**Qué salió de la home:** el bento "El mercado de un vistazo". Su contenido quedó repartido en la historia: el ranking del dólar en la 3 y las tasas en la 2. El riesgo país y los eventos siguen en /bonos y en la barra de pulso.

### Rendimiento medido (build de producción, 17/11/2026)

- **Scroll en un celular medio** (CPU 4× más lenta, 375 px): **60 fps de mediana en las 8 escenas**. Entre el 2 % y el 8 % de los cuadros tarda más de 33 ms, y "La respuesta" es la más pesada porque cuenta cinco números a la vez. Hay que confirmarlo en un teléfono real: el navegador de prueba dibuja sin placa de video.
- **Saltos de layout (CLS): 0** en todas las escenas (0,0006 en "La respuesta").
- **Lighthouse mobile** (tres corridas): performance **76–81**, accesibilidad **100**, LCP simulado 3,7–3,9 s, TBT 330–490 ms. Antes del rediseño era 76–84: quedamos igual. El LCP sigue arriba de la meta de 2,5 s. Lo que más pesa es hidratar el comparador y la nav en un celular lento.

### Decisiones del rediseño para revisar

1. **El titular de la portada es la respuesta del día con los números adentro**, en vez de un eslogan. Si el dato falla, la frase se adapta ("mirá dónde rinde más tu plata").
2. **Cada color de tarjeta tiene un tema fijo:** verde para el dólar, celeste para las tasas, lila para la cartera, sol para lo del día y coral para la inflación. Está en DISENO.md §1 y §3.
3. **Las etiquetas dejaron de ir en mayúsculas** en todo el sitio, y no resaltamos una sola palabra del titular en otro color. Son dos marcas típicas de "hecho por IA".
4. **El punto "En vivo" late una sola vez** y queda quieto, por la regla de nada en loop.
5. **"Macizo o hueco" compara contra la plata quieta en la cuenta** (0 %), no contra el plazo fijo. Es el caso más común y el más claro.
6. **La escena de la cartera muestra el resultado real de la cartera de ejemplo aunque pierda contra la inflación** (hoy: −11,6 %). No la maquillamos.
7. **"Empezá gratis":** hoy no hay planes pagos activos. Si se lanza un plan pago, hay que revisar ese texto.
8. **El plugin `frontend-design` no se pudo instalar desde la terminal** (la CLI responde "not found" aunque está en el catálogo). Seguí la guía de la skill leyéndola directo del catálogo descargado.

### Segunda tanda (rama `rediseno-2`)

- **Imágenes de compartir rediseñadas:** fondo tinta, wordmark nuevo y la cifra en una píldora del color de su tema. Aplica a Inicio, Dólar, Pesos y los resultados de las calculadoras.
- **Encabezados de color en las demás páginas:** se probaron (láminas con el color de cada sección) y **se descartaron** por pedido de los fundadores. Las páginas internas quedan con su encabezado anterior.
- **LCP:**
  - El LCP **real** medido en la home es **0,38–0,48 s**.
  - El de 3,5–3,7 s es la estimación de Lighthouse para un celular lento con 4G lenta.
  - Se probó apagar la animación del titular y no cambia nada.
  - Se achicaron los datos que viajan al comparador; performance quedó en 76–83.
  - Lo que queda es el costo de hidratar React en ese celular simulado.

### Lista de cambios pendientes (17/11/2026): puntos 1, 4, 5 y 7

- **1. Cinta de cotizaciones:** ahora gira sola y continua, como la franja de rulo.com.ar. Es la única excepción a la regla de "nada en loop" (anotada en DISENO.md §7). Con movimiento reducido queda quieta.
- **4 y 5. Logos de apps, bancos y activos:**
  - Cubre 69 proveedores (bancos, billeteras, exchanges, brokers) y 93 activos (CEDEARs, acciones y cripto).
  - Se bajan una sola vez con `python scripts/logos.py` y viven en `public/logos/`, así la web no depende de un servicio externo.
  - Si una marca no tiene un logo usable, sigue el monograma de dos letras.
  - **Segunda pasada (logos manuales):** se sumaron logos oficiales de Wikimedia Commons, revisados uno por uno. Son los de Macro, ICBC, Banco Provincia, Banco Ciudad, Credicoop, Tesoro Nacional (escudo), YPF, AMD, Boeing, Costco, TSMC, ExxonMobil, Loma Negra, Molinos, Morixe, Autopistas del Sol y Comercial del Plata.
    - En los logos anchos se recortó solo el símbolo, para que se lean a 28 px.
    - Quedaron **75 proveedores y 106 activos con logo**.
    - Se descartaron los candidatos que eran de otra empresa, y los que son solo texto chico (Berkshire y los ETF de State Street).
    - Las fuentes originales están en `assets/logos-fuente/` (`python scripts/logos_manuales.py` las baja; `python scripts/logos.py` arma todo).
  - **Siguen sin logo** (no hay versión pública de calidad): Prex, Personal Pay, Carrefour Banco, CMF, Piano, Julio, Masventas, Meridian, Bibank, Banco Andina, Dino, Allaria, Adcap, SBS, CryptoMarket, Banexcoin, Saldo, Plaza Cambio, Tría Cambio, Bytelime, Peanut, Vibrant, Eluter, Plus Crypto, Berkshire, los ETF SPY/DIA/XLE y 9 acciones chicas del panel general. Lo natural es pedirles el kit de marca cuando arranquen los acuerdos.
  - **Para revisar:** son los íconos oficiales de cada sitio, usados para identificar a cada empresa. Antes de lanzar conviene confirmar que no hay problema de marcas.
- **7. Sin atajos de teclado a la vista:** se sacaron el "⌘K" de la barra, el "esc" y la línea "↑↓ para moverte / ↵ para abrir" del buscador. El teclado sigue funcionando para quien lo use.

### Noticias (etapa 1, 17/11/2026, rama `noticias`)

**Qué es:** una página nueva, **/noticias**, con las noticias económicas y financieras de los principales medios.
- La noticia más importante del momento va destacada arriba: la que más medios cubren y cuyo título habla de un mercado. Las notas de rutina ("a cuánto cotiza hoy") no compiten por ese lugar.
- Debajo, todo por día y hora, con el logo del medio, a qué mercado pertenece y qué empresas menciona.
- Cuando varios medios cuentan lo mismo, se muestra una sola vez con "También en…".
- Filtro por mercado: Dólar, Tasas y pesos, Bonos y deuda, Acciones y CEDEARs, Cripto y Economía.
- **Por decisión de los fundadores, no hay noticias en el Inicio**, y la página se llama "Noticias", no "Último momento".

**Medios:** Infobae, La Nación, Ámbito, El Cronista, iProfesional y Bloomberg Línea (RSS públicos, verificados el 17/11/2026, todos respondieron).
- Se actualiza cada 5 minutos con el mercado abierto y cada 15 fuera de hora.
- Si un medio falla, se muestran los demás y se avisa cuál no respondió.

**Cómo funciona:**
- La clasificación por mercado, la detección de empresas y la agrupación de duplicados están en `src/lib/noticias/` y tienen 13 tests.
- Una nota que solo nombra una empresa al pasar no entra.

**Decisiones para revisar:**
1. **Seeking Alpha no se usa:** su feed dice expresamente que es solo para uso personal y prohíbe publicarlo. MarketWatch y CNBC tampoco, por la misma razón. Para noticias internacionales en inglés hace falta una licencia o un servicio pago (Finnhub, Marketaux).
2. **Bancos argentinos:** ninguno publica sus informes de research en un formato que se pueda tomar automáticamente. Se pueden sumar si se consigue acceso.
3. **BCRA, CNV e INDEC:** no tienen RSS. Los comunicados del BCRA y los hechos relevantes de la CNV necesitan su propio adapter (etapa siguiente).
4. **Qué mostramos de cada nota:** solo el título, un extracto de hasta 220 caracteres que el medio publica en su feed, la hora y el link. La nota completa queda en el sitio del medio. Conviene confirmarlo con un abogado antes de lanzar.

### Gráficos de cada activo (18/11/2026, rama `graficos`)

- **Variación de hoy siempre visible** al lado del precio ("▲ 1,84 % hoy"), además de la del período elegido ("−36,78 % en el año"). En cripto es "en 24 h".
- **Área, Línea o Velas**, a elección. El sitio recuerda la elección de cada persona en su navegador.
  - Las velas usan apertura, máximo, mínimo y cierre reales: acciones y CEDEARs (en pesos y en dólares MEP), bonos (en dólares y en pesos) y BTC/ETH.
  - En 5 años y Máx, una vela por semana.
  - El dólar, la brecha y las tasas solo tienen el cierre de cada día: ahí hay Área y Línea, sin velas inventadas.
- **"1D" con el recorrido del día, solo en cripto:** BTC y ETH en dólares y en pesos, y USDT en pesos. Son las últimas 24 h en velas de 5 minutos, de Binance (verificado el 18/11/2026), con caché de 1 minuto.

**Decisión pendiente:** "1D" para acciones, CEDEARs y bonos. data912 no tiene recorrido del día (lo verificamos). Hay dos caminos:
1. Guardar nosotros el precio cada 5 minutos durante la rueda. Necesita la base de datos de la v2 y arranca vacío.
2. Contratar una fuente intradiaria: Matba Rofex/Primary para Argentina, o un servicio pago para EE.UU.

### Lo que falta del rediseño

- Rediseñar el cuerpo de cada página (cifra héroe, tablas y gráficos) con la misma profundidad que la home, empezando por /dolar.
- Probar el scroll en un teléfono real (Android de gama media).

---

## Dónde comprar y las comisiones de los brokers (punto 29, rama `brokers-comisiones`, 22/11/2026)

> Pedido de Benja: que, como en el dólar, en acciones, CEDEARs, bonos y opciones aparezcan los brokers para comprar, con sus comisiones. De cuatro ideas dibujadas eligió dos: "Dónde comprar" en cada ficha y una página con todas las comisiones.

- **"Dónde comprar {ticker}" en cada ficha** de acción, CEDEAR, bono y letra, y "Dónde operar opciones" en Opciones. Los brokers van del más barato al más caro para el monto que pongas, con lo que te cobra cada uno, IVA incluido.
- **Mercados → Brokers** (`/mercados/brokers`), solapa nueva. Muestra:
  - las comisiones por tipo (acciones y CEDEARs, bonos, letras y opciones);
  - el monto, y el plazo para las letras;
  - el plan que se tomó de cada tarifario, la custodia, el link al tarifario y las notas (comisiones más bajas por volumen, planes pagos).
- **Los datos** (`data/ar/comisiones-brokers.ts`): los tarifarios oficiales de cada broker, leídos el 22/11/2026, con su link. Es lo que paga una persona que opera online y recién abre la cuenta.

  | Broker | Acciones y CEDEARs | Bonos | Letras | Opciones |
  |---|---|---|---|---|
  | Cocos | 0,45 % + IVA | 0,45 % | 1,5 % anual | 1 % + IVA |
  | IOL | 0,5 % + IVA | 0,5 % | 0,20 % | 0,5 % + IVA |
  | Balanz | hasta 0,5 % + IVA | hasta 0,5 % | hasta 0,10 % | hasta 0,5 % + IVA |
  | Bull Market | 0,5 % + IVA | 0,5 % | 0,25 % | 0,5 % + IVA |
  | PPI | 0,6 % + IVA | 0,6 % | 0,20 % | 1 % + IVA |

  Allaria, SBS y Adcap se sumaron el 23/11/2026, con los logos de Bull Market y Adcap (ver la sección de arriba).
- **Cálculo** (`src/lib/calculos/comisiones.ts`, 6 tests):
  - lo que cobra cada broker es monto × comisión × (1 + IVA), con IVA solo en acciones, CEDEARs y opciones;
  - las letras de Cocos se prorratean por los días que le quedan;
  - los tests usan los tarifarios cargados, así que también avisan si un dato queda mal.
- **Los derechos de mercado de BYMA no entran en el orden:** son iguales en todos los brokers. Van como nota, con los valores que publican los tarifarios. No coinciden del todo entre sí (IOL: 0,05 % + IVA en acciones; Bull Market: 0,070 %) y no pudimos confirmar el de BYMA.
- Sección "Comisiones de los brokers" en Metodología. Revisado en 1366 px (oscuro) y 375 px (claro).
- **Comparar sigue siendo una solapa** (Benja la había sacado; Nico pidió dejar todas, 23/11/2026). Las solapas de Mercados quedan: CEDEARs, Acciones, Bonos, Cripto, Opciones, Comparar, Inversores y Brokers. `SectionTabs` conserva la opción `sinSolapa` por si una página de la sección no tiene solapa.

### Para revisar
1. **Actualizar los tarifarios cada tanto:** los brokers los cambian. Cada uno tiene su fecha de lectura y su link.
2. **"Hasta" de Balanz:** su tarifario publica máximos, y se toman esos.
3. **Cocos y las letras:** cobra 1,5 % anual prorrateado. Para una letra corta es barato y para una larga es el más caro, por eso el orden cambia según el plazo.

---

## Vuelve "Siguiendo", como un botón debajo del calendario (punto 18, rama `siguiendo`, 22/11/2026)

> El 19/11 se sacó la lista de Siguiendo porque arriba bajaba la página y al costado tapaba. Benja propuso ponerla debajo del calendario; de las opciones dibujadas (fila con los seguidos, botón, franja, filtro en las tablas) eligió el botón.

- **"★ Seguir" en cada ficha** (acciones, CEDEARs, bonos, LECAPs y cripto), al lado de "Avisame". Al tocarlo pasa a "★ Siguiendo" y un aviso ofrece ir a Mercados.
- **En Mercados, "★ Siguiendo · N"** debajo de "Calendario", en todas las solapas.
  - En la compu, uno arriba del otro; en el celular, uno al lado del otro.
  - Si no seguís nada, no aparece.
- **Al tocarlo, la lista de tus seguidos:** logo, ticker, nombre, precio y variación de hoy. Toda la fila lleva a la ficha y la cruz lo deja de seguir.
  - En la compu, un panel debajo del botón; en el celular, sube desde abajo.
  - Los precios se piden al abrir (o al pasar el mouse por el botón) y, mientras está abierta, cada 30 segundos (`/api/precios`).
- **Se guarda en el navegador,** en la misma base que antes del 19/11 (`rinde-favoritos`): quien había seguido algo lo vuelve a ver. Los grupos no vuelven.
- Revisado en 1366 × 768 (oscuro) y 375 px (claro), siguiendo y dejando de seguir activos reales.

### Para revisar
1. **La cripto no muestra la variación del día** en la lista: el servicio de precios no la trae para cripto (lo mismo pasa en las alertas).

---

## Calendario del mes en Mercados (punto 26, rama `calendario-mes`, 21/11/2026)

> Pedido: en vez de la semana arriba de Mercados, un botón chico "Calendario" que abra el mes entero en una ventana grande en el medio, con el mismo contenido. Benja eligió esta opción (la A) entre cuatro maquetas.

- **El botón:** "Calendario", con su ícono, sin números. Ocupa el lugar de la semana, que se sacó (`semana.tsx` y `semana-cliente.tsx`).
- **En la compu:** una ventana en el medio que usa casi todo el alto de la pantalla (hasta 1160 × 880 px, con 12 px de borde). Arriba, una sola fila con el mes, las flechas, los filtros y cerrar.
  - La grilla del mes de lunes a viernes. **Se ve siempre entera, sin deslizar:** las semanas se reparten el alto.
  - En cada día, arriba el número con hasta 3 logos de las empresas que presentan resultados ("+N" si hay más). Hoy, resaltado.
  - Debajo, lo que entra según el alto de cada semana:
    - con lugar (102 px o más): dos eventos escritos con su punto de color, y "+N más";
    - más justo: uno y "+N";
    - muy justo (menos de 62 px): solo puntos de colores al lado del número.
  - Todo lo demás se ve en el detalle del día.
  - Medido día por día, sin nada cortado ni deslizable: 1440 × 900 (152 px por semana), 1366 × 768 (126), 1280 × 680 (108), 1100 × 560 (75, un evento) y 1024 × 460 (55, puntos).
  - Al costado, el detalle del día elegido en filas grandes: bandera, qué es, a qué hora y el link a su página.
  - Flechas para cambiar de mes y Esc para cerrar; al cerrar, el foco vuelve al botón.
- **En el celular:** sube desde abajo (el mismo panel que las alertas y la cartera). El mes en números con puntos de colores, y abajo la lista del día. Los días son botones de 48 px, fáciles de tocar.
- **Filtros:** por tipo (datos, tasas, empresas, bonos y letras, opciones) y por país (Argentina, EE.UU.). Los feriados se ven con cualquier tipo, porque explican por qué ese día no hay nada.
- **Colores:** un color por tipo, el mismo en los filtros, la grilla y el detalle. Son los categóricos del sitio, más oscuros en el tema claro.
- **Datos:** los mismos de la semana (INDEC, Fed, Nasdaq, feriados, opciones de GGAL, pagos de bonos y LECAPs), semana por semana. Si una semana falla, el mes se muestra igual.
  - `/api/calendario?mes=AAAA-MM`: se puede ir un mes para atrás y dos para adelante.
  - El mes se pide recién al abrir (o al pasar el mouse por el botón), y después se trae el siguiente de fondo. La primera vez que se pide un mes tarda unos segundos; después queda en caché.
- **Cálculo** (`src/lib/calendario/mes.ts`, 5 tests): las semanas que cubren cada mes, el mes que se muestra al abrir, los meses permitidos y los filtros.
- Revisado en 1440, 1366 × 768 y 375 px, oscuro y claro.

### Para revisar
1. **Se sacó la semana a la vista:** ahora hay que tocar el botón para ver qué pasa. Era lo que pedía el punto 26; si se extraña, el botón puede decir el próximo evento ("Mañana · Inflación").
2. **Hasta dos meses para adelante:** más allá, las fuentes casi no publican fechas.

---

## Escenas de la home que no entran en la pantalla (rama `home-escenas-sin-fijar`, 20/11/2026)

> Benja vio que en su notebook el título "El dólar más barato, app por app." quedaba cortado al terminar la tarjeta celeste de tasas. Un primer arreglo achicaba los títulos en pantallas bajas y se descartó: no quería tocar el diseño.

- **Qué pasaba:** cada escena queda fija una pantalla de alto mientras corre su animación. Si el contenido es más alto que la pantalla, se corta arriba y abajo, o queda debajo del menú.
  - A 1366 × 680 se cortaban "La respuesta", "El dólar", "Tu cartera" y "Macizo o hueco".
  - A 1366 × 768, las dos primeras.
  - En un teléfono chico (375 × 667), cinco escenas. En 375 × 812, el cierre de las tasas quedaba debajo de la barra de abajo.
- **Ahora:** cada escena mide su contenido. Si no entra, deja de quedar fija y fluye como una página común; nada se corta y el diseño es el mismo (mismos títulos, espacios y animaciones). Vuelve a medir al cambiar el tamaño de la ventana.
  - En 1440 × 900 o más no cambia nada: todas siguen fijas.
- **La animación en ese modo:** arranca cuando la escena asoma y termina con su centro en el centro de la pantalla. Así se ve completa (por ejemplo, las tasas ya ordenadas) mientras el título todavía está a la vista.
- **Código:**
  - `SiNoEntra` (`src/components/escenas/si-no-entra.tsx`) marca la escena con `data-bajo`.
  - El CSS la suelta (`globals.css`). Sin `content-visibility`, para que la página no salte al llegar.
  - El director usa el recorrido fluido y recalcula los recorridos si una escena cambia de modo.
- **Lo que se pierde en esas pantallas:** el efecto de escena pegada. En las grandes sigue igual.

---

## DolarApp ahora es ARQ, con su logo (rama `logo-arq`, 21/11/2026)

- CriptoYa publica "dolarapp" en USDC, pero no estaba en nuestra lista de proveedores: salía con iniciales y el nombre armado del id. DolarApp pasó a llamarse **ARQ** el 2/3/2026 (misma empresa, DolarApp Inc., y misma app; sitio arqfinance.com).
- Ahora es "ARQ (ex DolarApp)", billetera que opera 24/7, con el ícono oficial de su app en el App Store de Argentina ("ARQ: Finanzas Globales", id 1567954123, anotado en `assets/logos-fuente/proveedores/app-store.json`).
- **De paso, en la ficha de cada bono:** en "¿Cuánto cobrás y cuándo?", la barra de scroll de la lista de pagos se montaba sobre la columna de capital (en los bonos largos, como el GD46). El encabezado pasó adentro de la lista, fijo arriba, para que las columnas queden alineadas con o sin barra, y hay un margen a la derecha para la barra.

---

## Estrategias de opciones en inglés y las más usadas (punto 27, rama `estrategias-ingles`, 21/11/2026)

> Pedido: los nombres de las estrategias en inglés y sumar las que más se hacen.

- **De 7 a 17 estrategias**, con el nombre en inglés en el botón y, en la explicación de abajo, el nombre de acá ("Covered Call" → "Lanzamiento cubierto: …"; "Long Straddle" → "Cono comprado: …").
- **Agrupadas por lo que esperás del precio:**
  - Si creés que sube: Long Call, Covered Call, Short Put, Bull Call Spread, Bull Put Spread.
  - Si creés que baja: Long Put, Bear Put Spread, Bear Call Spread.
  - Para cubrir tus acciones: Protective Put, Collar.
  - Si se va a mover mucho: Long Straddle, Long Strangle.
  - Si va a quedar quieto: Short Straddle, Short Strangle, Iron Condor, Iron Butterfly, Butterfly.
- Cada una se arma sola con las bases más cercanas al precio y los precios de las puntas, como antes; después se puede cambiar cada pata. Probadas las 17 con GGAL a $ 4.550: ganancia y pérdida máximas y equilibrios coherentes con cada estrategia, sin errores.
- No se sumó el **calendar spread**: usa dos vencimientos y la calculadora trabaja con uno.

### Decisiones para revisar
1. **Nombres en inglés en los botones** (pedido), aunque el resto del sitio esté en castellano: el nombre de acá queda en la explicación, para quien lo conozca así.
2. **Las estrategias con ventas descubiertas** (Short Put, Short Straddle, Short Strangle) piden garantía en el broker; la calculadora ya avisa cuando hay ventas sin cubrir.

---

## Precios que se actualizan solos y el Merval en Acciones (puntos 20 y 22, rama `en-vivo-merval`, 20/11/2026)

> Pedido: que las cotizaciones cambien todo el tiempo, sin recargar ni cambiar de sección, con colores cuando se mueven (sin el indicador "En vivo"). Y en Acciones, cambiar el promedio del día por una tarjeta del Merval como las de Wall Street.

- **Sin recargar:** Mercados (todas las solapas), Dólar, LECAPs y las fichas de cada activo vuelven a pedir sus datos cada 15 segundos mientras la pestaña está a la vista (`RefrescoEnVivo`, con `router.refresh`). Lo que la persona está haciendo (filtros, orden, búsqueda, lo que escribió) queda igual. La barra de arriba (MEP, oficial, riesgo país) pasó de 1 minuto a 15 segundos.
  - Para que haya algo nuevo cada vez, esas páginas se regeneran cada 15 s y el caché de dólar y mercado bajó de 60 s a 15 s en horario. data912 renueva sus precios cada 30 s, así que un precio llega con hasta ~45 s de atraso sobre data912 (que a su vez tiene la demora de BYMA).
  - El Inicio no se refresca solo (salvo la barra de arriba): la historia animada se re-armaría con cada cambio y el scroll ya tiene un problema anotado (punto 3).
- **Destello:** cuando un precio cambia, se marca un segundo con fondo verde si subió o rojo si bajó, y en las cifras grandes los dígitos ruedan al valor nuevo. Está en las tablas de CEDEARs, acciones, bonos y ONs (también en el celular), cripto, los dólares, Dónde comprar, la ficha y las tarjetas de Wall Street y del Merval. En la ficha sigue al último precio, no al que se ve al pasar el cursor por el gráfico.
- **Merval:** el S&P Merval dejó de existir el 16/10/2026: desde el 19/10 es el **MSCI Merval**, con base 100.000 (por eso Yahoo `^MERV` y Ámbito quedaron congelados en 2.848.945). El nuevo está en Yahoo como `^768692-ARS-STRD` (pesos) y `^768692-USD-STRD` (dólares), al minuto. Verificado el 20/11/2026: 80.122 puntos, −0,8 % en el día; contra el 16/10 bajó ~20 %, en línea con GGAL (−22 %), YPF (−31 %), Pampa (−18 %) y Macro (−13 %) en data912. BYMA Open Data no respondió (timeout).
  - La tarjeta: variación en pesos grande, los puntos y la variación en dólares abajo, y el recorrido de la rueda al costado (5 minutos, verde o rojo). Antes de que abra el mercado muestra la rueda anterior. Si Yahoo no responde, no se muestra y la tabla sigue igual.
  - Función pura `ultimaRueda()` en `adapters/yahoo.ts`, con 3 tests.

### Decisiones para revisar
1. **15 segundos:** es el mínimo que tiene sentido con data912 (30 s). Cada página abierta pide al servidor 4 veces por minuto; con muchas visitas, en Vercel conviene mirar el consumo (las páginas se sirven del caché, así que muchas personas comparten la misma regeneración).
2. **Yahoo para el Merval** (como para Wall Street): no es una API oficial; revisar sus condiciones antes del lanzamiento comercial. La alternativa oficial (BYMA Open Data) no respondió.

---

## Logos y gráficos para muchos más activos (tarea 19, rama `logos-y-graficos`, 19/11/2026)

> Pedido de Benja: muchos activos seguían sin logo o sin gráfico.

- **Logos: de 106 a 281 activos.** Se sumaron 175 (CEDEARs, ETF y acciones argentinas), con el mismo método de siempre: el ícono oficial del sitio de cada empresa. El sitio sale de Wikidata (la empresa con ese ticker en NYSE o Nasdaq); los ETF, de su emisora (iShares, Vanguard, VanEck, ProShares…); las argentinas, verificadas a mano con el título de su sitio. Todos revisados a ojo en una hoja de contactos.
  - Como en esta compu no hay Python, se bajaron con un script de Node equivalente (sin dependencias nuevas). Los dominios quedaron anotados en `scripts/logos.py` para que el script de siempre los mantenga.
  - **Siguen con monograma (46):** las que solo tienen un ícono de 16 px o bloquean la descarga (Ford, Verizon, Cisco, 3M, UnitedHealth, Newmont, Berkshire, Nu…), los ETF de State Street (su logo es texto chico, ya descartado) y las argentinas que no pudimos verificar (Carlos Casado, Celulosa, Autopistas del Oeste, Rosenbusch, Polledo, Boldt Gaming). GCDI se descartó: su ícono es un cuadrado vacío. El paso siguiente sería sumarlos a mano desde Wikimedia Commons, como hizo Nico con los bancos.
- **Gráficos de los CEDEARs nuevos:** cuando data912 no publica la historia del CEDEAR (NBIS, NU, Robinhood, Rocket Lab, Booking, Cameco…), la ficha muestra el gráfico de la acción en Estados Unidos, en dólares (5 años, de Yahoo Finance, que ya usamos para Wall Street hoy), con una línea que lo aclara. También salen de ahí el rendimiento, el rango de 52 semanas, la volatilidad y la máxima caída, rotulados "en EE.UU.". Las acciones argentinas no tenían este problema: data912 tiene su historia.

- **Al juntarla con `main` (20/11/2026):** Nico había hecho el mismo punto en paralelo (rama `balances-cnv`, "Todos los logos que faltaban", más abajo). En los 167 activos que habíamos hecho los dos quedó el de Financial Modeling Prep, que es el logo completo y no el ícono del sitio (por ejemplo, IBM: el ícono de ibm.com es una abeja). De esta rama se sumaron los 8 que no estaban: Carboclor, Fiplasto, Dos Anclas, Juramento, La Anónima, Southern Copper, Semino y Xerox. Total: 467 activos con logo.

**Para revisar:**
1. **El gráfico de un CEDEAR nuevo es el de la acción en EE.UU.**, no el del CEDEAR en pesos (no hay de dónde sacarlo). Está aclarado debajo.
2. **Yahoo no es una API oficial** (igual que para Wall Street hoy): revisar sus condiciones antes del lanzamiento comercial.

---

## Logos de bancos y billeteras que faltaban (rama `logos-proveedores`, 19/11/2026)

> Benja vio a Prex, Banco Andina y Plaza Cambio sin ícono en "Dónde comprar", y pidió buscar también en Google.

- **14 proveedores más con logo (de 83 a 97):**
  - Con el **ícono oficial de su app** (App Store; en todos, la app la publica la propia empresa): Banco CMF, Banco Dino, Masventas, Meridian, Banco Piano, Carrefour Banco, Prex, Peanut, Vesseo (ex Vibrant) y Plus Crypto (la app de Plus, de Plus Fintech).
  - Plaza Cambio, Banco Julio y Andina Cambio: el símbolo de su logo, recortado del archivo de su propio sitio. CryptoMarket: su isotipo, de la foto de su cuenta oficial de X (@CryptoMKT).
- **Vibrant pasó a llamarse Vesseo** (misma empresa, Sunship, y misma app): ahora se muestra como "Vesseo (ex Vibrant)".
- Las fuentes quedan en `assets/logos-fuente/proveedores/` (con `app-store.json`, que dice de qué app sale cada uno), así que el script de logos los mantiene si se vuelve a correr.
- **"Banco Andina" no era un banco:** el "andina" de CriptoYa es **Andina Cambio**, una casa de cambio de Bariloche y Villa La Angostura (así lo nombran DolarClaro, CotizaYa y otros que toman el mismo dato). Se corrigió el nombre y el tipo.
- **Siguen con monograma (2):** Bytelime (es la agencia de cambio habilitada por el BCRA que opera el dólar oficial de Tienda Dólar, Buenbit y Manteca, sin una marca propia para el público: no sabemos de cuál es la cotización de CriptoYa, así que no ponemos un logo que podría ser de otro) y Adcap (su ícono es la palabra en letra chica, ilegible a 28 px).

---

## La home ya no muestra las fuentes (rama `portada-sin-fuentes`, 19/11/2026)

> Pedido de Benja: sacar de la portada la escena "Todo sale de fuentes públicas.". Quien quiera ver las fuentes las tiene en el pie de cada página y en /metodologia.

- Se sacó la escena de confianza (la lista de fuentes con su estado y los principios "Neutral", "Con la cuenta a la vista" y "Sin números de relleno"). La home pasa de "La misma plata, dos destinos" al cierre "Empezá gratis.".
- Se borró su componente y su coreografía, y la home dejó de pedir las cotizaciones del dólar, que solo usaba esa escena.
- Las fuentes siguen en el pie del sitio (con el link a la Metodología) y en /metodologia#fuentes.

---

## Comparar activos en el mismo gráfico (punto 23, rama `comparar-activos`, 19/11/2026)

> Pedido de Benja: poder poner acciones, CEDEARs y otros activos en el mismo gráfico, como "Comparar" en Google Finance.

- **Dónde:** Mercados → **Comparar** (`/mercados/comparar`), y un botón "Comparar" al lado de "Avisame" en la ficha de cada acción, CEDEAR, bono, Bitcoin y Ether.
  - Los activos elegidos viven en la URL (`?t=MELI,GGAL,SPY,BTC`), así una comparación se puede compartir.
  - Sin activos, ejemplos de un toque ("S&P 500 contra Nasdaq", "Bonar 2030 contra Global 2030"…). Con uno solo (como se llega desde la ficha), sugerencias para sumarle otro.
- **Qué se puede comparar:** hasta 5 entre CEDEARs, acciones argentinas, bonos en dólares, Bitcoin y Ether. Las LECAPs y los dólares cripto no, porque no tienen una historia de precios que sirva.
- **El gráfico:** todas las líneas arrancan en 0 % el mismo día, en pesos o en dólares MEP, de 1 mes a 5 años. Al pasar el cursor, la leyenda muestra cada valor en esa fecha.
- **La tabla de abajo:** rendimiento, máxima caída y volatilidad del período, y precio de hoy.
- **Números de las empresas:** si hay acciones o CEDEARs, PER, margen neto, ROE, crecimiento de ingresos, dividendo y fecha del último balance, lado a lado. Salen de los mismos balances que la ficha (SEC o CNV).
- **Bonos, rendimiento total:** el día de corte (el hábil anterior al pago), el precio de los Bonares y Globales cae lo que pagan, alrededor de 8 % dos veces por año. Comparar solo el precio daba que el AL30 "perdió 23 %" en dólares en el último año, cuando con los pagos cobrados quedó en +0,4 % (verificado a mano contra data912).
  - Ahora cada pago del cronograma (el mismo de la ficha) se reinvierte en el mismo bono ese día. El precio de hoy no cambia.
  - Función `conPagosReinvertidos()` en `src/lib/calculos/comparar.ts`, con tests.
- **Fuentes:** las mismas de cada ficha (data912, Binance). Para los CEDEARs que data912 no tiene, la acción en EE.UU. (Yahoo), con una nota. La fórmula de cada número está en Metodología.
- **De paso:** las solapas de sección en el celular ahora muestran la solapa activa al cargar. Antes la última quedaba fuera de la pantalla: pasaba con "Opciones" y ahora con "Comparar".
- 7 tests nuevos (`tests/comparar.test.ts`).
- Revisado en 1440 y 375 px, oscuro y claro. Las tablas anchas dejan fija la columna del nombre al deslizar, como en los balances.

### Decisiones para revisar
1. **Inicio común:** si un activo tiene menos historia que el período elegido (por ejemplo NVDA, cuya historia en data912 arranca en noviembre de 2025 por el cambio de ratio), todos arrancan ese día y una nota lo explica. La alternativa sería que cada línea arranque cuando puede, pero entonces dejan de ser comparables.
2. **Acciones y CEDEARs sin dividendos:** no tenemos los dividendos de todas. En las que pagan mucho, el rendimiento real es algo mayor. Lo dice la nota debajo del gráfico.
3. **El ROE de GGAL da 1,6 %** con los datos de la CNV (en la ficha da igual). Parece bajo para Galicia; vale revisarlo en `balances-cnv` (¿patrimonio de otro período o resultado de un trimestre solo?).

---

## El dólar implícito deja de ser la cifra principal de CEDEARs (rama `dolar-implicito-chico`, 19/11/2026)

> Pregunta de Benja: ¿importa tanto como para estar arriba de todo? Casi siempre es igual al MEP (hoy, 0,6 % menos), así que no cambia ninguna decisión.

- **Ya no es una cifra gigante:** es una línea arriba de la tabla ("Dólar implícito de los CEDEARs: $ 1.619,43 · 0,6 % menos que el MEP · mediana de los 30 más operados"). Wall Street hoy queda como lo principal y la tabla sube.
- **Aviso solo cuando importa:** si se separa 2 % o más del MEP, la línea pasa a ser un aviso de color (rojo si comprar CEDEARs en pesos sale más caro, verde si sale más barato) con el implícito y el MEP. Regla en `estadoDolarImplicito()` (`src/lib/calculos/activo.ts`), con test.

**Para revisar:** el umbral del 2 % (`UMBRAL_AVISO_IMPLICITO`). Es una diferencia que ya se nota en una compra; se puede subir o bajar.

---

## Balances de las acciones argentinas desde la CNV (rama `balances-cnv`, 19/11/2026)

> Pedido de los fundadores: los balances de las acciones argentinas estaban muy atrasados porque salían de la SEC (Galicia: marzo de 2025). Ahora salen de la CNV, al día, con la misma pantalla que los CEDEARs (anual y trimestral, gráfico, los tres estados y los números clave).

- **Fuente:** el formulario de estados contables de la Autopista de Información Financiera de la CNV.
  - La página de cada empresa (`cnv.gov.ar/SitioWeb/Empresas/Empresa/{cuit}`, unos 4 MB) lista sus presentaciones.
  - La vista pública de cada una (`aif2.cnv.gov.ar/presentations/publicview/{guid}`) trae el formulario en XML: período, cierre, consolidado o individual, **unidad** ("Millones de $" o "Miles de $": cambia según la empresa), cantidad de acciones y cada rubro con su código fijo.
  - Verificado el 19/11/2026 con YPF, Pampa, Banco Galicia, Grupo Galicia, Macro, Aluar, Cresud y Ternium. YPF, Aluar, Cresud y Ternium ya tienen el balance al 30/09/2026.
- **Tabla de empresas** (`data/ar/cnv.ts`): 57 empresas del panel líder y del general, con el CUIT que devuelve el buscador de la propia CNV, revisado contra la razón social. GGAL es Grupo Financiero Galicia (el holding), no el banco.
- **Cálculo** (`src/lib/calculos/balances-cnv.ts`, 8 tests): se arma el mismo resumen que con la SEC, así la pantalla es la misma.
  - Todo en dólares al oficial mayorista del día de cierre.
  - Los resultados vienen acumulados en el ejercicio. Cada trimestre se resta **en pesos**, con el acumulado anterior llevado por IPC a la moneda del cierre nuevo, y recién después se pasa a dólares. Restar ya en dólares deformaba el trimestre cuando el dólar saltó (YPF daba +76 % interanual en vez de +41 %).
  - Bancos con su propio mapa de rubros (sin "ingresos" ni deuda financiera, como con la SEC).
- **Estados completos:** las tablas de Resultados, Balance y Flujo de caja muestran todos los rubros del formulario de la CNV, en su orden oficial (YPF: 22, 34 y 4; Banco Macro: 24, 35 y 6), y no solo los que coinciden con las filas fijas de la SEC. Los bancos tienen los suyos (depósitos, préstamos, intereses, comisiones, incobrabilidad). Gastos y costos con signo negativo, como en el formulario. El flujo de caja de las empresas es corto porque el formulario solo trae los totales de operaciones, inversión y financiación (no la inversión en bienes de uso ni los dividendos).
- **Múltiplos** para las acciones argentinas: el precio de hoy en BYMA pasado a dólares al mayorista y la cantidad de acciones del formulario (PER, precio / valor libro, valor de empresa / EBITDA).
- **Respaldo:** si la CNV no responde, la ficha usa la SEC como antes (las que tienen ADR). Los CEDEARs siguen con la SEC.
- Para el código compartido con la SEC (`calculos/balances.ts`) se separaron en funciones los "últimos 12 meses" y los indicadores, sin cambiar resultados: los 17 tests de Benja siguen pasando.

### Decisiones para revisar
1. **Las acciones argentinas se muestran en dólares** (al mayorista de cada cierre), no en pesos. En pesos no se pueden comparar balances de distintas fechas, y así quedan igual que los CEDEARs.
2. **Mayorista y no MEP:** es el que usan las empresas para su contabilidad. En dólares MEP las cifras darían algo menores.
3. **La ganancia por acción por período no se muestra** (YPF dividió sus acciones por 10 en 2026 y la serie informada no es comparable). La de 12 meses sale de la ganancia / la cantidad de acciones de hoy.
4. **Los trimestres de empresas que llevan su contabilidad en dólares** (YPF, por ejemplo) también se reexpresan por IPC antes de restar; para ellas el ajuste correcto sería el tipo de cambio. La diferencia es chica salvo en trimestres con saltos fuertes del dólar.
5. **Cada empresa nueva** se suma a mano en `data/ar/cnv.ts` (con el buscador de la CNV). Quedaron afuera Grupo Financiero Valores, Importadora Patagonia e Introductora: la CNV no las encontró con un nombre inequívoco.

---

## Balances y resultados de las empresas (punto 14 de la lista, rama `balances`, 18/11/2026)

> En la ficha de cada CEDEAR y de cada acción argentina con ADR, debajo del rendimiento. Datos reales de la SEC (EDGAR), gratis, sin cuenta y de dominio público.

- **Cuatro cifras arriba:** ingresos y ganancia neta (últimos 12 meses o último ejercicio), con el crecimiento y el margen; PER (o, si no se puede, la rentabilidad sobre el patrimonio); dividendo (o flujo de caja libre).
- **Resultados trimestrales y anuales** (selector Trimestral / Anual): el último trimestre contra el mismo del año anterior, en una frase, y el gráfico de los últimos 8 trimestres (o 4 ejercicios): ingresos en gris y ganancia en verde, o en rojo por debajo del cero si fue pérdida.
- **Los tres estados contables completos**, en solapas, con una columna de variación interanual:
  - *Resultados:* ingresos, costo de ventas, ganancia bruta, investigación y desarrollo, gastos comerciales, ganancia operativa, EBITDA, intereses, ganancia antes de impuestos, impuestos, ganancia neta, margen, ganancia y dividendo por acción, acciones.
  - *Balance:* caja, inversiones de corto plazo, cuentas por cobrar, inventarios, activo corriente, bienes de uso, llave de negocio, intangibles, activo total, cuentas por pagar, deuda de corto y de largo plazo, pasivo corriente y total, deuda financiera, patrimonio.
  - *Flujo de caja:* de las operaciones, amortizaciones, inversión en bienes de uso, flujo libre, de inversión, de financiación, dividendos pagados y recompras.
- **Números clave**, en cinco grupos con una línea que explica cada uno: valuación (capitalización, valor de empresa, PER, precio/ventas, valor libro, EV/EBITDA, rendimiento del dividendo y del flujo libre), rentabilidad (márgenes bruto, operativo, EBITDA y neto, ROE, ROA), crecimiento (anual e interanual), salud financiera (liquidez corriente, prueba ácida, deuda neta, deuda neta/EBITDA, deuda y pasivos sobre patrimonio, cobertura de intereses) y accionistas (ganancia y dividendo por acción, payout, dividendos pagados, recompras, acciones).
- **Cálculos propios** en `src/lib/calculos/balances.ts`, con 17 golden tests sobre recortes reales de Apple, Coca-Cola, Mercado Libre y Galicia (`tests/fixtures/sec-*.json`). Metodología en /metodologia#balances. La SEC suma su línea en el pie del sitio.
- Probado con Apple, Coca-Cola, Nvidia, Mercado Libre, Nebius, Nu, TSMC, YPF y Galicia. SPY (ETF) y Aluar (sin ADR) no muestran la sección.
- La sección carga aparte (con un esqueleto del mismo tamaño): la ficha no espera a la SEC.

**Decisiones para revisar:**
1. **Fuente: la SEC.** Cubre los CEDEARs de empresas (no los ETF) y las argentinas con ADR (Galicia, YPF, Pampa, Macro, BBVA, Supervielle, Central Puerto, TGS, Telecom, Loma Negra, Edenor, Cresud e IRSA). Las demás acciones argentinas necesitarían la CNV, que no tiene una API: quedan sin balances por ahora.
2. **Las argentinas suelen estar atrasadas en la SEC** (Galicia: el último con datos es de marzo de 2025). Si el último balance tiene más de 15 meses, aparece un aviso que lo dice y explica que los nuevos están en la CNV. TSMC tampoco cargó su 2025 en formato de datos.
3. **Balances en pesos (ajustados por inflación):** solo se comparan ejercicios del mismo balance y no se muestran trimestres. Mezclar balances distintos daría crecimientos inflados.
4. **Múltiplos (PER, etc.) solo en empresas de EE.UU. con balances en dólares** (10-K): en un ADR un papel puede ser varias acciones, y en pesos el precio de hoy contra un balance viejo engaña.
5. **Se muestran los ejercicios de los dos últimos balances anuales** (unos cuatro años). Más atrás aparecían cifras de antes de reestructuraciones (Nebius cuando era Yandex) o mal cargadas en la SEC.
6. **La SEC pide un mail de contacto** en cada consulta. Usamos el de `site.contacto` (hoy `hola@rinde.example`): **hay que poner uno real antes de publicar**.
7. **Bancos:** no informan "ingresos" como el resto; se muestran ganancia, patrimonio y rentabilidad, sin flujo libre, EBITDA ni deuda neta.
8. **Deuda financiera:** en US GAAP, la deuda de largo plazo con su porción corriente más los papeles comerciales; en IFRS, los préstamos y, si los informa aparte, los bonos. No incluye arrendamientos salvo que la empresa los sume en el mismo concepto (Coca-Cola).
9. **El trimestre de cierre de ejercicio y el flujo trimestral se derivan** restando acumulados (las empresas no los informan por separado). La ganancia por acción de ese trimestre queda vacía: no es una resta exacta.

---

## Todos los logos que faltaban (punto 19, 19/11/2026)

- **De 106 a 459 logos de activos.** Casi todos los CEDEARs que operan (392 de los 404 de hoy) y las acciones argentinas del panel general que se pudieron verificar. Fuente: el logo por ticker de **Financial Modeling Prep** (`financialmodelingprep.com/image-stock/{ticker}.png`, sin cuenta; si no lo tiene responde 404, así que nunca entra una imagen genérica). CEDEARs con su ticker de EE.UU.; las brasileñas con `.SA`; las argentinas con su ADR o con `.BA`.
- **De 6 a 147 logos de medios:** los que más aparecen en las noticias de los activos (Yahoo Finance, The Motley Fool, CNBC, CNN, Reuters, Bloomberg, WSJ, FT, Forbes, Barron's, Clarín, TN, Página/12…), en `scripts/medios.json`. En cada nota de Google Noticias el medio se identifica por su dominio ("cnbc.com"), que es el nombre del logo.
- **Bancos, billeteras y exchanges: de 75 a 83.** Allaria, Banexcoin, Bibank, Eluter, Personal Pay, Saldo, SBS y Tria, con el ícono grande de su sitio. Quedan con monograma los que no publican un ícono usable (Carrefour Banco, CMF, Julio, Piano, Prex, CryptoMarket y algunos más).
- **Logos claros sobre fondo oscuro:** varios logos vienen en blanco (IBM, Ferrari, Disney, UnitedHealth…). `scripts/logos.py` los detecta y los pone sobre fondo casi negro, para que se vean.
- **Revisados a ojo** con hojas de contacto. Se descartaron los que estaban mal (Fiplasto traía el logo de Mastodon y Rosenbusch el de WordPress), los genéricos (un cuadrado gris con una letra) y los de las especies cable (BA.C es Boeing en dólar cable, no Bank of America). Coca-Cola pasó del ícono de su sitio a su logo.
- Todo con `python scripts/logos_extra.py` y después `python scripts/logos.py`. Una empresa nueva toma su logo la próxima vez que se corren.

### Decisiones para revisar
1. **Financial Modeling Prep e icon.horse no son fuentes oficiales de logos.** Se bajan una sola vez y se sirven desde nuestro sitio, como los íconos de Google de antes. Los logos son marcas de cada empresa: se usan solo para identificarla.
2. **Prefiero el monograma a un logo dudoso:** unas 20 acciones chicas del panel general (Carlos Casado, Domec…) quedan sin logo hasta conseguir uno verificado. (Carboclor, Fiplasto, Juramento y Semino los sumó Benja en `logos-y-graficos`, verificados con su sitio.)

---

## Noticias en todos los activos (punto 21, rama `noticias-activos`, 19/11/2026)

> Pedido de los fundadores: faltaban noticias en muchos activos. Sumar más fuentes, sobre todo de EE.UU. (CNN, CNBC…). Todos los activos tienen que tener noticias, directas o del mercado que los afecta.

- **Fuente nueva: Google Noticias** (RSS de búsqueda, sin autenticación), en castellano (edición Argentina) y en inglés (edición EE.UU.). Verificada el 19/11/2026: "Nvidia" trajo 100 notas de 3 días con su medio (Reuters, CNBC, The Motley Fool…). Así entran CNN, CNBC, Reuters, Bloomberg, Barron's, Seeking Alpha y cientos más, sin tener que sumar los feeds de a uno.
- **Qué se busca** (`src/lib/data/servicios/noticias-activo.ts`):
  - CEDEARs: la empresa en inglés (`"Nvidia" stock`) y en castellano (`"Nvidia" acciones`). Con contexto, "Apple" encuentra la empresa y no la fruta.
  - ETF: el ticker.
  - Acciones argentinas: el nombre en castellano y, si tienen ADR, también en inglés.
  - Bonos: el ticker (`"AL30" bonos`). LECAPs: el ticker.
  - Cripto: Bitcoin, Ethereum, "Tether" stablecoin, "USDC" stablecoin.
- **Si hay menos de 4 notas que lo nombren**, se completa con las del mercado que lo mueve, en un bloque aparte ("Lo que lo afecta"): Wall Street, el Merval, el riesgo país, las tasas en pesos o cripto. En bonos, LECAPs y cripto, las notas generales de nuestros medios pasan a ese bloque.
- **Limpieza** (`src/lib/noticias/activo.ts`, 11 tests): sin páginas de cotización ni de gráficos, sin series de opciones, sin notas automáticas de compras de fondos y cambios de precio objetivo, y sin los sitios que solo publican eso (MarketBeat, TradingView y otros). La misma noticia en varios medios queda una, con "también en N medios".
- **En la ficha:** cada nota con su medio y la marca "En inglés" cuando corresponde.
- Probado con Nvidia, Apple, Coca-Cola, SPY, Mercado Libre, Nebius, Galicia, Aluar, Transener, Morixe, AL30, GD35, S30N6, Bitcoin y USDT: todos con noticias (de 2 a 8).

### Decisiones para revisar
1. **Google Noticias y los medios de EE.UU. no tienen una licencia comercial clara** para mostrar sus titulares (igual que los feeds de CNBC o Seeking Alpha que habíamos dejado afuera). Mostramos título, medio, hora y link, y la nota se lee en el sitio de cada medio. **Antes del lanzamiento comercial hay que revisarlo** o pasar a un servicio pago de noticias.
2. **Los titulares en inglés no se traducen.** Llevan la marca "En inglés".
3. **El link pasa por Google** (news.google.com) y de ahí a la nota original.

---

## Calendario de la semana (punto 15, rama `calendario-semanal`, 19/11/2026)

> Pedido de los fundadores: inspirado en el calendario de resultados de Earnings Whispers, pero también con datos como el IPC. Sin sección nueva: arriba a la derecha de Mercados. Semanal y con muy pocas palabras.

- **Dónde:** en el encabezado de Mercados, a la derecha del título (en todas sus solapas). En el celular va debajo de la bajada y se desliza de costado, arrancando en el día de hoy.
- **Qué muestra:** lunes a viernes. En cada día, en una o dos palabras con su bandera: datos del INDEC (IPC, EMAE, PBI, Balanza, Desempleo, Pobreza, Salarios), de EE.UU. (Inflación, Empleo, PCE, PBI), la Tasa Fed, feriados, pago de bonos en dólares, vencimientos de LECAPs y de opciones de GGAL. Abajo, los logos de las empresas que presentan resultados: primero las argentinas (ADRs), después las que tienen CEDEAR por tamaño, como mucho 4 por día (+N). Hoy resaltado; los días que pasaron, más claros.
- **Al tocar algo**, una línea con el detalle: "Jueves 19 · 16:00 h · Balanza: Comercio exterior de octubre · INDEC". Los datos de EE.UU. traen lo esperado y lo anterior (y lo que dio, cuando sale). Las empresas, si es antes de la apertura o después del cierre, con link a la ficha.
- **Flechas** para ir una semana para atrás y hasta cuatro para adelante (`/api/calendario?semana=…`, que no acepta otras fechas). El sábado y el domingo arranca en la semana que viene.
- **Fuentes, verificadas el 19/11/2026:**
  - INDEC: su calendario de difusión mensual (`/Calendario/FiltrosCalendario/mes/Diciembre-2026/0`); se lee el título, la fecha y la hora de cada informe.
  - Reserva Federal: las reuniones del FOMC de 2026 y 2027 de su página oficial.
  - Nasdaq: resultados de empresas y datos económicos de EE.UU. **Su calendario económico viene corrido un día** (lo de un jueves aparece al pedir el viernes; el empleo del viernes 4/12, el sábado 5/12; la Fed del 9/12, el 10/12). Lo compensamos. Para la Fed usamos la página oficial.
  - Feriados (ArgentinaDatos), bonos y LECAPs (nuestras tablas) y opciones (data912).
- Cada fuente es independiente: si una falla, falta lo suyo y el resto se ve. Si fallan todas, el calendario no aparece y la página sigue igual. 10 tests (INDEC con un fixture real, Fed, horarios con y sin horario de verano de EE.UU., filtro de empresas, armado de la semana).

### Decisiones para revisar
1. **Va en Mercados, en todas sus solapas.** El IPC o las licitaciones también le importan a Pesos; se puede sumar ahí después.
2. **Empresas: solo las argentinas y las que tienen CEDEAR**, como mucho 4 por día. Las demás quedan en "+N".
3. **Nasdaq no es una API oficial** (igual que Yahoo): revisar sus condiciones antes del lanzamiento comercial.
4. **Las licitaciones del Tesoro y el REM del BCRA todavía no están**: no encontramos una fuente con sus fechas que se pueda leer de forma confiable. No ponemos fechas que no podamos verificar.

---

## Wall Street hoy con el gráfico del día (rama `wall-street-graficos`, 19/11/2026)

- Cada tarjeta de "Wall Street hoy" (S&P 500, Nasdaq 100, Dow Jones) suma un minigráfico del día, como el de Yahoo: el recorrido de la rueda cada 5 minutos, una línea punteada en el cierre anterior y el área entre las dos, en verde si la tarjeta viene positiva y en rojo si no.
- Fuente nueva: **Yahoo Finance** (`/v8/finance/chart/{SPY,QQQ,DIA}?range=1d&interval=5m`), verificada el 18/11/2026: 79 puntos y el cierre anterior. Caché de 5 minutos. Si no responde, la tarjeta se muestra igual, sin gráfico. data912 no tiene recorrido del día y el de Nasdaq vino incompleto (1 punto para SPY y DIA fuera de horario).
- Yahoo se sumó a las fuentes del pie.

### Decisiones para revisar
1. **El gráfico es el del ETF en Nueva York; la cifra grande, la del CEDEAR en BYMA.** Casi siempre van en el mismo sentido; el color sigue a la cifra de la tarjeta.
2. **Yahoo no es una API oficial**: antes del lanzamiento comercial hay que revisar sus condiciones o pasar a un servicio pago.

---

## Sin Siguiendo (rama `sin-siguiendo`, 19/11/2026)

> Los fundadores probaron la lista de Siguiendo y no los convenció: se saca y Mercados vuelve a verse como antes, a todo el ancho.

- Fuera la lista de Siguiendo (la columna de la derecha y el botón con estrella del celular), los grupos y el botón "Seguir" de cada ficha. Se borraron `favoritos.tsx`, `elegir-grupo.tsx`, `src/lib/favoritos/` y sus tests.
- Se quedan: Bonos como solapa de Mercados, "Wall Street hoy" arriba de CEDEARs y el botón "Avisame" de cada ficha (las alertas de precio siguen igual).
- Lo que alguien haya seguido queda guardado en su navegador (IndexedDB `rinde-favoritos`) sin usarse; no molesta.

---

## Mercados más ordenado: bonos adentro, grupos y Wall Street (rama `mercados-bonos-grupos`, 18/11/2026)

> **Actualización 19/11/2026:** los grupos y la lista de Siguiendo se sacaron (ver "Sin Siguiendo", arriba).

> Pedido de Benja: pasar Bonos a Mercados para tener menos secciones arriba, armar grupos de seguimiento y mostrar los índices de EE.UU. en CEDEARs.

- **Bonos es una solapa de Mercados** (`/mercados/bonos`): CEDEARs · Acciones · Bonos · Cripto · Opciones. El menú de arriba queda en 6 (Inicio, Dólar, Pesos, Mercados, Metas, Calculadoras). `/bonos` redirige con un 308, así que los links viejos y lo que haya indexado Google siguen andando. La ficha de cada bono, el buscador, el glosario y el sitemap apuntan a la ruta nueva.
- **Grupos de seguimiento:** cada activo que seguís puede ir a un grupo, y **cada persona arma los suyos** (no hay grupos armados de antemano; hasta 24 letras). Se elige desde la ficha (al lado de "Siguiendo") o con **Organizar** en Siguiendo, que también deja de seguir. Arriba de la lista aparecen los filtros por grupo (solo si alguno tiene grupo) y el último filtro elegido se recuerda en el navegador. Lógica pura en `src/lib/favoritos/grupos.ts` con tests.
- **Siguiendo va al costado**, para no tapar lo importante: en pantallas de 1280 px o más es una columna fija a la derecha; en el celular y la tablet, un botón con una estrella al lado de las solapas (con la cantidad) que abre la lista. En Opciones, que tiene tablas anchas, solo está el botón.
- **Wall Street hoy** (arriba de la solapa CEDEARs): S&P 500, Nasdaq 100 y Dow Jones, con la variación del día en dólares y, abajo, en pesos. Tocás uno y vas a la ficha del CEDEAR.

**Decisiones para revisar:**
1. **Los índices se miden con el CEDEAR de su ETF** (SPY, QQQ, DIA), no con el índice en sí: data912 no publica los índices y el panel de EE.UU. no tiene SPY, QQQ ni DIA. La cifra grande es la variación de la especie en dólares (D), que es la que se parece a la del índice; está aclarado debajo. Para el número del índice (6.800 puntos) hace falta una fuente con licencia.
2. **Mostramos también la variación en pesos**, que suma lo que se movió el dólar. Hoy se ve bien la diferencia: el S&P bajó 0,5 % en dólares y el CEDEAR subió 1,6 % en pesos.
3. **Los grupos son uno por activo** (un activo no puede estar en dos grupos a la vez). Es lo más simple de entender; si se quiere, se pasa a etiquetas.
4. **Bonos no tiene encabezado propio**: usa el de Mercados, como las otras solapas.

---

## Fuentes discretas (punto 17 de la lista, rama `fuentes-discretas`, 18/11/2026)

> Pedido de los fundadores: sacar de las pantallas las notas de fuente ("Fuente: ArgentinaDatos · CNV · data912 · actualizado…") y los rótulos "de ejemplo", que se veían hechos por IA. Se eligió la versión discreta.

- **Las fuentes van en un solo lugar:** una línea en el pie del sitio (DolarAPI, ArgentinaDatos, BCRA, CNV, data912, CriptoYa y Binance, más Wikipedia y Wikidata para las descripciones) y /metodologia.
- **El estado queda corto** (`EstadoDiscreto`): un punto y "En vivo", "Demorado 20 min · 16:29" o "Cierre del 18 nov". Primero lo dejamos solo como punto y no se entendía (corrección de los fundadores).
- **Inicio:** sin "Alertas de ejemplo…", "Datos de ejemplo: una cartera inventada…" ni las notas de fuente de las escenas del dólar y de las tasas. La escena de confianza pasa a titularse "Todo sale de fuentes públicas."
- **Fichas:** sin la línea "Fuente: Wikipedia (CC BY-SA 4.0)" ni "Armado con los datos de Wikidata": la atribución está en el pie.
- `SourceNote` sigue en las 28 pantallas, pero solo dibuja el punto. CLAUDE.md (regla 2), DISENO.md y DATOS_Y_FORMULAS.md actualizados; el test e2e ahora verifica que no haya "Fuente:" en las páginas y que el pie tenga las fuentes.

### Decisiones para revisar
1. **La cartera y la meta de ejemplo (en /cartera y /metas) siguen rotuladas "Datos de ejemplo".** Ahí alguien podría creer que son sus datos. Las del Inicio no, porque son una demostración.
2. **"¿De dónde sale este número?" sigue igual** (con la fórmula y la fuente): solo aparece si alguien lo toca.
3. **Wikipedia pide atribución (CC BY-SA)**: la pusimos en el pie del sitio en vez de debajo de cada descripción. Es una forma aceptada de atribuir, pero conviene confirmarlo antes del lanzamiento comercial.
4. **La frase "Es una comparación, no una recomendación"** de la escena de tasas del Inicio también se fue: el disclaimer general del pie sigue en todas las páginas.

---

## Opciones de GGAL, primera entrega (rama `opciones`, 18/11/2026)

> Punto 9 de la lista de cambios pendientes. Pantalla nueva en **/mercados/opciones** (solapa "Opciones" de Mercados), con link desde la ficha de GGAL. Datos reales de data912.

- **Cadena por vencimiento:** calls a la izquierda, puts a la derecha, la base en el medio. Compra, venta, último, volumen, volatilidad implícita y delta. Una línea marca dónde está el precio de GGAL; el lado de cada base que ya tiene valor intrínseco va sombreado. En el celular, calls o puts de a uno. Arranca en el vencimiento con más volumen.
- **Volatilidad:** la implícita de la base más cercana al precio (promedio de call y put) contra la histórica de 20 y 60 ruedas, con una frase que la explica.
- **Lanzamiento cubierto como tasa:** para cada call, la TNA si te ejercen, cuánto puede bajar GGAL y que igual te ejerzan, y el punto de equilibrio. Al lado, la caución, la LECAP y el plazo fijo de plazo parecido. Por defecto se ven las bases por debajo del precio; las de arriba, con un botón.
- **Cálculos propios** (`src/lib/calculos/opciones.ts`, 20 tests): vencimientos (tercer viernes, o el hábil anterior), lectura de los símbolos, Black-Scholes, volatilidad implícita, delta y lanzamiento cubierto. Metodología en /metodologia#opciones.
- **Validación:** se excluyen las series vencidas y las puntas cruzadas; la VI fuera de 5 %–300 % no se muestra; las puntas muy separadas se marcan; un lanzamiento con TNA fuera de ±300 % se descarta.

### Decisiones de opciones para revisar

1. **Las opciones van en Mercados (solapa "Opciones"), no en el menú de arriba.** También hay un link desde la ficha de GGAL.
2. **Vencimiento: tercer viernes del mes, o el hábil anterior si es feriado.** Es la regla de BYMA que conocemos; conviene confirmarla con un broker.
3. **Modelo Black-Scholes europeo, sin dividendos.** Las de BYMA son americanas; en puts con mucho valor intrínseco la VI es aproximada. Está dicho en la página y en la metodología.
4. **Tasa del modelo:** la caución al plazo más parecido; si la caución no está al día, la LECAP más parecida. Sin tasa disponible, 0 % (y la página lo dice).
5. **Lanzamiento cubierto con las puntas reales** (comprás la acción a la punta vendedora, vendés el call a la compradora) y días de la liquidación de hoy al cobro del ejercicio. Antes de comisiones: cambian mucho entre brokers.
6. **No sumamos el lanzamiento cubierto al comparador de /pesos.** Tiene riesgo de precio (si GGAL cae debajo del punto de equilibrio, perdés), así que mezclarlo con plazo fijo y billeteras confundiría. Se compara en la página de opciones.
7. **"Volumen" se muestra tal como lo da data912**, sin confirmar si son contratos o nominales.

### Opciones, segunda y tercera entrega (misma rama, 18/11/2026)

Opciones queda en tres solapas: **Cadena** (`/mercados/opciones`), **Tasas** (`/mercados/opciones/tasas`) y **Estrategias** (`/mercados/opciones/estrategias`). El vencimiento elegido se recuerda al pasar de una solapa a otra.

- **Calculadora de estrategias:** siete armadas (compra de call o put, lanzamiento cubierto, spreads alcista y bajista, mariposa, cono) o una propia de hasta 6 patas. Las primas arrancan en las puntas de ahora y se pueden editar. Muestra lo que pagás o cobrás hoy, la ganancia y la pérdida máximas ("sin techo" o "sin piso"), los puntos de equilibrio y el gráfico de ganancia y pérdida al vencimiento y hoy (Black-Scholes), con el resultado en cada precio al pasar el dedo. Avisa cuando hay ventas de opciones (garantía y riesgo).
- **Cajas:** para colocar o tomar pesos, con la tasa ya neta de comisión y cuántas cajas se pueden armar con las cantidades de las puntas.
- **Comisión de cada persona:** un campo en Tasas y Estrategias (arranca en 0,5 %, se recuerda en su navegador). El lanzamiento cubierto ahora también la descuenta.
- **Sonrisa de volatilidad:** gráfico de la VI por base, con puts por debajo del precio y calls por encima.
- **Historial de primas:** `scripts/guardar-opciones.mjs` guarda cada día hábil a las 19 h (mismo workflow de GitHub que las tasas) compra, venta, último y volumen de cada serie de GGAL en `data/historico/opciones/`. La primera foto es del 18/11/2026; el gráfico de cada serie aparece desde la segunda rueda.
- **Alertas de primas:** "Avisame de esta prima" en la solapa Cadena. Usa el sistema de alertas de siempre: `/api/precios` ahora entiende símbolos de opciones (GFGC5400DI → "Call GGAL 5.400 dic").
- 35 tests de opciones (cajas, estrategias calculadas a mano, comisión, historial).

**Decisiones para revisar (además de las de arriba):**
8. **Comisión de referencia: 0,5 %** (comisión + derechos de mercado) sobre cada operación, editable. Es un valor típico, no el de un broker en particular.
9. **Las cajas se filtran entre la mitad y el doble de la caución** al plazo más parecido. Sin ese filtro aparecían "préstamos al 0,3 % anual" que salían de puntas sueltas de 1 o 2 contratos en bases lejanas.
10. **La sonrisa usa solo opciones fuera del dinero.** Los puts muy adentro del dinero daban VI de 200 %: el modelo europeo no capta el ejercicio anticipado de las americanas.
11. **El historial se guarda con el mismo commit automático diario que las tasas** ("Tasas y opciones del…"). Si falla la parte de opciones, las tasas igual se guardan. Los feriados (sin volumen) no se guardan.
12. **Las opciones no se pueden "Seguir"** (favoritos): la lista de Siguiendo lleva a la ficha de cada activo y las opciones no tienen ficha. Sí tienen alertas.

**Lo que sigue:** otros subyacentes (YPF, PAMP: alcanza con sumarlos en `data/ar/opciones.ts` y en `scripts/guardar-opciones.mjs`), cuando lo decidan.

---

## Primera tanda de ideas (rama `primera-tanda`, 18/11/2026)

> Ideas de Benja para que la gente vuelva: favoritos y alertas desde la ficha, "¿qué hubiera pasado si…?", compartir el avance de una meta y empezar a guardar el historial de tasas.

**1. Favoritos y alertas desde la ficha.** Cada ficha (CEDEAR, acción, bono, LECAP, cripto) tiene "Seguir" y "Avisame". Lo que seguís aparece en "Siguiendo", arriba de Mercados, con el precio de hoy. "Avisame" crea una alerta nueva (el precio de un activo sube o baja de un valor, en pesos o, para bonos, en US$ por 100 nominales) que se suma a las de /alertas y respeta el límite de 3 del plan gratuito. Endpoint nuevo `/api/precios?t=…` (solo recibe tickers validados, hasta 40) que usan los favoritos y el vigía. Todo en el navegador (IndexedDB `rinde-favoritos`).

**2. ¿Qué hubiera pasado si…?** (`/calculadoras/que-hubiera-pasado`). Ponés un monto y hace cuánto (1 mes a 5 años): cuánto tendrías hoy quieto en pesos, en dólar MEP o blue, en un plazo fijo renovado cada 30 días, en una acción o CEDEAR (SPY, Apple, Nvidia, Mercado Libre, Galicia, YPF) o en bitcoin, y si le ganó a la inflación. Se puede compartir como imagen. Cálculos con 6 tests.

**3. Compartir el avance de una meta.** "Compartir mi avance" genera una imagen para historias con el porcentaje, la barra y cuándo llega. No muestra montos.

**4. Historial de tasas.** Un workflow de GitHub Actions (`.github/workflows/tasas-diarias.yml`) corre de lunes a viernes a las 19 y guarda una foto del día (plazo fijo por banco, billeteras y cuentas, LECAPs) en `data/historico/tasas/`, con un commit automático en `main`. La primera foto es la del 18/11/2026 (33 bancos, 21 cuentas, 8 letras). /pesos/plazo-fijo muestra cómo cambió cada banco cuando haya más de un día. Se puede correr a mano: `node scripts/guardar-tasas.mjs`.

**Dos arreglos que salieron en el camino:**
- **La tasa de plazo fijo de referencia de la cartera estaba mal en fechas de 2024:** la serie de depósitos a 30 días de ArgentinaDatos mezcla fracción (0,3443) y porcentaje (34,43) hasta enero de 2025, y la cartera dividía todo por 100. Lector nuevo que normaliza (`ad.depositos30Dias()`), con test.
- **Cambios de ratio y splits ajustados, no cortados:** SPY cambió de ratio en mayo de 2026 (×3) e YPF tuvo un split en agosto (×10). Antes la historia se cortaba ahí; ahora los precios de antes se dividen por ese entero exacto (`ajustarRatios`, con tests) y la ficha lo aclara. Un salto que no da un número entero (hay uno en agosto de 2023 en varias acciones) sigue cortando la serie.

### Decisiones de la primera tanda para revisar

1. **El historial se guarda con commits automáticos en `main`** (uno por día hábil, solo en `data/historico/tasas/`). Es la forma más simple sin una base de datos; cuando haya Supabase se puede mover ahí. Hay que hacer `git pull` seguido, pero esos archivos no chocan con el código. **Para que corra, GitHub Actions tiene que estar habilitado en el repo** (pestaña Actions) y `main` no puede tener una protección que impida el push del bot.
2. **Las alertas de un activo, como las demás, avisan solo con Rinde abierto** (revisa cada 3 minutos). Las push con la app cerrada necesitan las cuentas.
3. **"¿Qué hubiera pasado?" usa el plazo fijo promedio** (tasa de depósitos a 30 días), no el mejor banco: es lo que conseguía cualquiera.
4. **Los activos de "¿qué hubiera pasado?" son seis fijos**, elegidos por ser los más conocidos y con historia larga. Se pueden sumar más.
5. **Bitcoin en pesos arranca en febrero de 2023** (desde ahí hay dólar cripto histórico).

---

## Ficha de cada activo (rama `ficha-activo`, 18/11/2026)

> Pedido de los fundadores: al tocar un activo, que traiga toda su info más sus noticias, como la página de un activo en Google Finance.

**Dónde está:** `/activo/[ticker]` (por ejemplo `/activo/AAPL`, `/activo/GGAL`). Se llega tocando cualquier fila de CEDEARs o acciones (en la compu toda la fila es clickeable y la primera celda es un link; en el celular la fila entera es el link), desde el buscador y desde los tickers de cada noticia.

**Qué muestra:**
- Encabezado con logo, nombre, ticker, tipo (CEDEAR o acción del panel líder/general) y sector.
- **Gráfico** con rangos (1S a Máx) y selector **en pesos / en dólares** (cada cierre dividido por el MEP de ese día).
- Precio de hoy y, en los CEDEAR, cuánto más caro o barato sale su dólar implícito contra el MEP.
- **Datos clave:** cierre anterior, rango del día (o de la última rueda), rango de 52 semanas, volumen, volatilidad anual y máxima caída del último año. En los CEDEAR, además: precio de un CEDEAR en dólares, precio de la acción en EE.UU. con su variación y dólares implícitos MEP y CCL.
- **Rendimiento** a 1 semana, 1 mes, 3 meses, en el año, 1 año y 5 años, **en pesos y en dólares MEP**.
- **Noticias** de la empresa (las de la sección Noticias que la nombran) y **Acerca de** (Wikipedia, con la fuente y la licencia).
- **Otros del mismo sector** (CEDEAR) o del mismo panel (acción), con link a su ficha.

**Datos:** data912 (precio, historia con apertura/máximo/mínimo/cierre/volumen, panel de EE.UU.), ArgentinaDatos (MEP histórico), DolarAPI (MEP de hoy), Wikipedia (descripción) y los medios de Noticias. Cálculos en `src/lib/calculos/activo.ts` con 8 golden tests (`tests/activo.test.ts`).

**Fuentes verificadas (18/11/2026):**
- data912 `/historical/{cedears,stocks}/{ticker}`: además de `c` trae `o`, `h`, `l`, `v` (y `dr`, `sa`, que no usamos). Para tickers que no tiene responde 200 con `{"Error": …}`: por ejemplo **NU no tiene historia**; la ficha lo dice y muestra el resto.
- data912 `/live/usa_stocks`: precio y variación de la acción en EE.UU. (con demora).
- Wikipedia `/api/rest_v1/page/summary/{título}`: responde sin clave, pero **limita los pedidos seguidos** (429). Se cachea una semana y se pide solo el título verificado de cada ticker (`data/ar/wikipedia.ts`): la búsqueda automática confundía, por ejemplo, Tesla con Nikola Tesla.

### Fichas de bonos, LECAPs y cripto (misma rama)

- **Bonos** (`/activo/AL30`): gráfico en dólares (especie D) y en pesos, TIR, duration, paridad, cupón de hoy y hasta cuánto sube, rendimiento corriente, capital que queda, próximo pago, rango de 52 semanas, volatilidad y máxima caída. **Su par en la otra ley** (AL30 ↔ GD30) con la diferencia de TIR en puntos básicos. La **calculadora de flujos** (antes en un panel de /bonos), rendimiento por período, noticias de bonos y deuda, una descripción armada con el cronograma del bono y los otros bonos ordenados por duration.
- **LECAPs y BONCAPs** (`/activo/S29E7`): la **calculadora de cobro** arriba, la **curva** con la letra marcada (data912 no publica historia de letras), TEA/TNA/TEM, ganancia en todo el plazo, precio y valor final, **si le gana a la inflación esperada** (REM, día por día hasta el vencimiento) y **contra el mejor plazo fijo** de plazo parecido, noticias de tasas y las letras de plazo parecido.
- **Cripto** (`/activo/BTC`, ETH, USDT, USDC): BTC y ETH con gráfico en dólares (Binance, ~2 años y 9 meses) y en pesos (× dólar cripto del día); USDT y USDC con el dólar cripto en pesos y su **brecha contra el MEP**. Rango, volatilidad (anualizada con 365 días), máxima caída, **dónde comprar más barato** (los 6 exchanges con mejor precio de compra), rendimiento, noticias de cripto y Wikipedia.
- Se llega desde las tablas de Bonos y LECAPs, desde Mercados → Cripto y desde el buscador. El smoke e2e suma 5 fichas.
- Cálculos nuevos con tests: volatilidad con 365 días, serie en pesos, inflación esperada hasta el vencimiento y resumen del cronograma de un bono (12 tests en `tests/activo.test.ts`).

**Fuentes verificadas (18/11/2026):** data912 `/historical/bonds/AL30` (pesos) y `AL30D` (dólares) con apertura/máximo/mínimo/cierre/volumen; para letras responde "no tengo ese ticker". Binance `/api/v3/klines?interval=1d&limit=1000`. ArgentinaDatos `/cotizaciones/dolares/cripto` (diario desde feb 2023). Wikipedia: Bitcoin, Ethereum, USD Coin y **"Tether (criptomoneda)"** (el artículo "Tether" es una canción).

**Un hallazgo de layout:** el texto oculto para lectores de pantalla ("sube"/"baja") dentro de una tabla con scroll horizontal se escapaba del contenedor y ensanchaba la página en el celular (la barra inferior quedaba más ancha que la pantalla). Se arregla con `relative` en el contenedor con scroll; quedó aplicado en las tablas nuevas y en la de alternativas de Metas.

### Activos que no están en nuestras listas (por ejemplo NBIS)

> Pedido de Benja: "hay algunos activos sin datos, como NBIS".

- **Wikidata** como fuente nueva (CC0, sin clave; pide un User-Agent): a partir del ticker trae el perfil de la empresa (nombre, país, sede, fundación, empleados, sitio web, industria, bolsa y sus artículos de Wikipedia). Solo cotizaciones vigentes en NYSE, Nasdaq o la Bolsa de Buenos Aires; si un ticker es de varias empresas (la "C" figura en Citigroup y en tickers viejos de otras), gana la más conocida.
- **Nombres en las tablas:** los CEDEARs y acciones que no están en `data/ar/mercados.ts` ahora muestran su nombre (NBIS → Nebius Group, MU → Micron Technology). Se piden en tandas de 80, cacheadas una semana.
- **Ficha:** descripción en castellano (el artículo de Wikipedia que Wikidata asocia, o una línea armada con el perfil, con link a Wikipedia en inglés), datos de la empresa (también para las curadas), industria en el encabezado, noticias que nombran a la empresa aunque no esté en la lista, puntas de compra y venta, operaciones del día, ratio aproximado del CEDEAR (solo si da casi entero) y volumen en EE.UU.
- **Sin historia (NBIS, NU):** precio grande arriba, cierre anterior calculado con la variación del día, sin filas vacías ni tabla de rendimiento, y como parecidos los CEDEARs más operados.
- 8 tests nuevos (`tests/perfil.test.ts`) con respuestas reales de Wikidata guardadas en `tests/fixtures/wikidata.json`.

**Lo que sigue faltando:** la **historia de precios** de los CEDEARs nuevos (data912 no la tiene; las fuentes que sí, como Financial Modeling Prep o Alpha Vantage, piden crear una cuenta para sacar una API key) y los **logos** de las empresas que no están en `public/logos/`.

### Decisiones de la ficha para revisar

1. **Sin búsqueda en Wikipedia:** solo los 78 tickers con artículo verificado (74 acciones y CEDEARs, y 4 cripto) tienen descripción. Los que no tienen artículo propio (Cresud, TGN, Ternium Argentina, varias del panel general) o tienen uno ambiguo (Metrogas, Banco Hipotecario) quedan sin descripción.
2. **Los ETF los describimos nosotros** en una línea (qué índice replican).
3. **Noticias solo de los medios que ya seguimos** (últimos 3 días). Para CEDEARs de EE.UU. va a haber pocas: no sumamos Google News ni Yahoo porque sus feeds son para uso personal.
4. **Sin datos de balance** (P/E, capitalización, dividendos): no hay una fuente gratuita y confiable que los publique para usar en la web. Se suman si conseguimos una.
5. **Bonos, LECAPs y cripto también tienen ficha** (ver abajo). Al tocar una fila de Bonos o de LECAPs ahora se abre la ficha, que tiene la calculadora que antes se abría en un panel.
6. **Precio en dólares de BTC y ETH: Binance**, no el promedio en dólares de los exchanges locales (que trae unos 5 % de sobreprecio y no coincidía con el gráfico).
7. **El rendimiento de los bonos es solo precio:** no suma los cupones y el capital cobrados (está aclarado en la tabla). Un "rendimiento total" necesita reinvertir los pagos.
8. **Un ticker que no existe** muestra la página "no encontrado" con `noindex`, pero responde 200 y no 404: con la carga en streaming, Next.js ya mandó la página cuando se entera (está documentado así).

---

## Metas de ahorro (rama `metas`, 17/11/2026)

> Idea de los fundadores (audios del 17/11): separar las metas de la jubilación y hacerlas un plan fácil para quien no conoce el mercado de capitales: "quiero un auto", "un viaje de US$ 800", "un departamento", "estudios".

**Dónde está:** `/metas`, sección propia en el menú principal (entre Pesos y Bonos), en "Tus herramientas" del pie, en el buscador y como acceso directo de la app instalada. En el celular entra por "Más". Calculadoras tiene un link. La de jubilación quedó solo para jubilación.

**Qué hace:**
- Cada persona arma sus metas: nombre libre, pesos o dólares, cuánto cuesta, cuánto ya tiene, para cuándo (1 a 120 meses) y cuánto puede poner por mes (opcional). Botones de arranque rápido: "Un viaje", "Un auto", "Un departamento", "Estudios", "Fondo de emergencia".
- **El plan:** cuánto poner por mes para llegar en fecha y, con lo que la persona dijo que puede poner, en qué mes llega (o que no llega).
- **La barra de avance** con una rayita de "según el plan" y la frase "Vas adelantado / atrasado: ±$ X" (con signo y palabra, no solo color).
- **Cuánto ponés y dónde:** con "Sumar plata" la persona carga cada depósito (o retiro) con su instrumento: las opciones reales del comparador con la TEA de hoy (las 12 que más rinden de cada tipo: billeteras, cuentas, fondos, plazos fijos, LECAPs, caución), "sin invertir", "dólares guardados" u "otro" con nombre y TEA a mano. Fecha editable.
- **Dónde está tu plata:** tabla por instrumento con lo que puso, lo que vale hoy (estimado con la TEA del día en que lo puso) y la ganancia total de sus inversiones. "Actualizar valores" reemplaza la estimación por el valor real que muestra su app.
- **Comparación neutral:** si lo suyo rinde en promedio al menos 1 punto menos que la mejor opción sin plazo de hoy, dice cuánto más por mes daría ese saldo. Sin "pasate a X".
- **Historial de movimientos** con borrar y "Deshacer".
- **Resumen arriba** (con 2 metas o más): lo juntado, lo puesto, lo que dieron las inversiones y lo que hay que poner por mes entre todas, separado por moneda, y cuántas esperan la carga del mes.
- **Rendimiento real** (metas en pesos): cada aporte actualizado por IPC hasta hoy contra lo que vale: "le ganaste por +$ X", "la inflación se comió −$ X" o "quedaste parejo" (menos de 0,5 %).
- **Camino a la meta:** gráfico mes a mes de lo que pone, lo que rinde y lo que va a costar (sube con la inflación), con la fecha elegida marcada y los hitos ("el 50 % en mar 2027 · la meta en sep 2027").
- **¿Dónde rinde más lo que pongas cada mes?:** la mejor opción de cada tipo (mismo ranking neutral de la home) con cuánto poner por mes y cuándo llega con lo planeado; con liquidez y tope de cada una.
- **Vencimientos:** cuándo vence cada plazo fijo, LECAP o caución cargado; si ya venció, avisa.
- **Dólar MEP:** las metas en pesos muestran su equivalente en dólares y las en dólares, en pesos.
- **Meta de ejemplo** cuando no hay ninguna: un viaje de $ 3 M con cuatro aportes, rotulada "Datos de ejemplo" (montos inventados; tasas, inflación y dólar reales).
- **Cada 30 días** "Sumar plata" se resalta: "Pasaron 33 días: ¿cuánto pusiste este mes?". El plan se recalcula con lo que hay y las tasas de ese día.
- Varias metas a la vez. Borrar con "Deshacer".
- Se guarda **solo en el navegador** (IndexedDB, `rinde-metas`), igual que la cartera y las alertas.

**Datos:** la tasa es la **mejor opción sin plazo de hoy** (`mejoresDelDia().liquida`, la misma que usa interés compuesto) y la inflación es la esperada del REM a 12 meses, pasada a mensual. Fuente y hora en la nota de abajo, fórmula en `/metodologia#metas`.

**Cálculo:** `src/lib/calculos/metas.ts` (puro, decimal.js), 24 tests en `tests/metas.test.ts`: valuación por instrumento (aportes, retiros, ajustes, orden de carga en un mismo día), TEA promedio, plan con dos tasas (lo invertido y lo nuevo), que tener más plata nunca atrasa la fecha de llegada, camino e hitos, rendimiento real, vencimientos, alternativas (neutrales: solo por TEA) y resumen por moneda.

**Datos que usa:** opciones en pesos (ArgentinaDatos, CNV, data912), inflación esperada (REM del BCRA), IPC mensual (INDEC vía ArgentinaDatos, últimos 36 meses) y dólar MEP (DolarAPI).

**Guardado:** IndexedDB `rinde-metas` v2. Las metas creadas con la primera versión (un saldo total por fecha) se convierten solas: cada diferencia entre controles pasa a ser un movimiento "sin invertir" (o "dólares guardados").

### Decisiones de metas para revisar

1. **Las metas en pesos se piensan en precios de hoy:** el objetivo sube con la inflación esperada (un depto de $ 95 M hoy "cuesta" unos $ 263 M en 5 años con el REM actual). Es lo honesto, pero el número asusta: se puede mostrar todo en pesos de hoy si lo prefieren.
2. **El aporte mensual se toma fijo en pesos.** Si la inflación le gana, la pantalla dice "no llegás: la meta sube más rápido de lo que juntás". Una mejora posible: ofrecer "aumentar el aporte con la inflación".
3. **Las metas en dólares no rinden** salvo que la persona ponga un rendimiento, y no se ajustan por inflación.
4. **El supuesto es la mejor opción sin plazo** (liquidez inmediata), no plazo fijo ni LECAP: es lo más simple para alguien que pone plata todos los meses y la puede sacar cuando quiera.
5. **"Según el plan"** = lo que tendría hoy si hubiera puesto lo planeado todos los meses, a la tasa del plan.
6. **Valores estimados:** cada instrumento crece con la TEA del día en que se puso la plata (si vuelve a poner, pasa a la TEA de ese día) y se supone que se renueva (un plazo fijo vencido sigue rindiendo igual). Los fondos y billeteras cambian de tasa todos los días: por eso está "Actualizar valores".
7. **Lo ya invertido y lo nuevo rinden distinto en el plan:** lo que tiene, a su TEA promedio; lo que ponga, a la mejor opción sin plazo de hoy.
8. **No se conecta con la cartera.** Las metas llevan su propio registro de movimientos. Se podría vincular una meta a posiciones de la cartera, pero duplicaría la carga o mezclaría plata que no es para la meta.
9. **Las alternativas no miran el tope ni la liquidez para ordenar:** se ordenan solo por tasa y se muestran la liquidez y el tope al lado. Una LECAP puede quedar primera aunque no sirva para plata que entra todos los meses.
10. **El rendimiento real se calcula solo en pesos.** En dólares haría falta la inflación de EE.UU.
11. **Sin aviso con la app cerrada:** el recordatorio de los 30 días aparece cuando la persona entra. Avisar por push o email necesita las cuentas de la fase 2.

---

## Qué está hecho, por sección

Todo funciona con **datos reales** salvo donde se indica. Cada número muestra su fuente, su hora y su estado.

| Sección | Qué tiene | Estado |
|---|---|---|
| **Cimientos** | Sistema de diseño (colores dark y light, tipografía, movimiento), barra superior con punto que se desliza, barra de pulso (MEP, oficial, riesgo país, mejor tasa, se actualiza cada minuto), barra inferior en el celular, buscador ⌘K, modo Simple/Pro, tema claro/oscuro, colores alternativos para daltonismo. Página **/sistema** para revisar cada pieza. | ✅ |
| **Inicio** | "La foto de hoy" (dólar MEP, dónde rinde más hoy, qué pasó hoy en dos líneas), **"¿Dónde rinde más tu plata?"** con monto, plazo y liquidez, y la historia del producto en 8 escenas (ver "Rediseño" arriba). | ✅ |
| **Dólar** | Cotizaciones de los 7 dólares con variación, brecha y gráfico de 30 días · **Dónde comprar** USD, USDT y USDC: ranking por precio final con comisiones, costo de USD 1.000, filtro 24/7, orden para comprar/vender/spread, precios con condiciones especiales aparte y cotizaciones excluidas con su motivo · **Histórico** de MEP, oficial y blue (hasta 2018) y de la brecha, con el número del encabezado que sigue al cursor · **Conversor** con todos los tipos de cambio. | ✅ |
| **Pesos** | **Comparador** de 120+ opciones normalizadas a TEA, sin duplicados · **Plazo fijo** por banco a 30/60/90/180/365 días · **Billeteras y cuentas** (incluye Mercado Pago y Ualá a través de sus fondos) · **Fondos money market** con la TNA calculada desde la cuotaparte · **Caución** · **LECAPs y BONCAPs** con curva, tabla sincronizada y calculadora por letra · **Simulador** a N días con escenarios de inflación (baja, REM, alta) y resultado real. | ✅ (CER pendiente) |
| **Calculadoras** | Interés compuesto, **metas de ahorro** (ver abajo), jubilación (en dólares, con la regla del 4 % explicada), plazo fijo, conversor TNA/TEA/TEM e inflación ("¿cuánto valen hoy?"). Todas con **"Compartir resultado"** (genera una imagen para historias y WhatsApp) y link a la fórmula. | ✅ (falta "sueldo en dólares") |
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
| data912 | `/live/arg_options` | Sí (18/11/2026) | 518 opciones de BYMA; 129 de GGAL (prefijo GFG). Puntas con cantidades, último, volumen y variación. **Sin griegas**: las calculamos nosotros. Con una base de 5 cifras el mes queda en una letra (GFGC10300D). |
| data912 | `/eod/option_chain/GGAL` | Sí, pero no sirve | Es la cadena de la GGAL de Nueva York (bases en US$), no la local. No la usamos. |

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
10. **Diseño** (reemplazado por el rediseño del 17/11: ahora el wordmark es "rinde" en minúscula con un punto sol, en Bricolage Grotesque): el wordmark eran tres barras crecientes + "Rinde" en Satoshi; el gris terciario del modo claro lo oscurecí (de `#6B717A` a `#61676F`) para cumplir contraste, y lo actualicé en DISENO.md.

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
