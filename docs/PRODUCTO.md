# Producto

## 1. En una frase

**El lugar donde un argentino entra a ver el dólar y se queda porque le ordena la plata.**

Comparadores neutrales y en vivo de todo lo que importa (dólar, tasas, LECAPs, bonos, CEDEARs, cripto), más **tu cartera real**, **alertas** y **cuentas claras** para decidir. Con un diseño que da ganas de volver.

---

## 2. Para quién

| Segmento | Qué busca | Por dónde entra | Qué lo retiene |
|---|---|---|---|
| **Ahorrista** (la mayoría) | "¿Dónde rinde más mi plata?", "¿dónde compro dólares más barato?" | Google: "dólar hoy", "plazo fijo tasa", "mejor billetera" | Alertas, "tu plata podría rendir $X más" |
| **Inversor minorista** | LECAPs, bonos, CEDEARs; seguir su cartera contra inflación y MEP | Curvas, comparador, calculadoras | Cartera, insights, alertas de precio y vencimiento |
| **Freelancer / cobra del exterior** | Cobrar USD barato, pasar a pesos, pagar con PIX | Remesas, ranking del dólar, arbitraje | Alertas de spread |
| **Asesor o fondo chico** (B2B, futuro) | Mostrarle a sus clientes cartera + contexto con su marca | Contacto directo | Marca blanca |

Modo por defecto: **Simple** (lenguaje llano, "cuánto ganás por mes en pesos"). Un toggle global pasa a **Pro** (TEM, TEA, TIR, duration, días al vencimiento, implícitos). Es *progressive disclosure*, como en Whoop.

---

## 3. Por qué ahora y por qué nosotros

- La información está dispersa en diez sitios. Cada broker o billetera muestra solo lo suyo.
- rendimientos.co probó que existe demanda de un tablero así, pero no se difunde, no personaliza y no se entiende sin ser experto.
- La tasa en pesos cambia seguido y la brecha entre opciones es grande: **elegir bien vale plata todos los meses**. Eso genera visitas recurrentes.
- Una de nosotros sabe de marketing: la distribución no es una ocurrencia de último momento.

---

## 4. Posicionamiento

| | rendimientos.co | Comparadores puntuales | Apps de brokers | **Rinde** |
|---|---|---|---|---|
| Amplitud de datos | Alta | Baja | Media (lo propio) | **Alta** |
| Neutralidad | Media (banco propio) | Alta | Baja | **Alta, con reglas en código** |
| Se entiende sin ser experto | No | Sí | Más o menos | **Sí (modo Simple)** |
| Cartera propia multi-broker | No | No | Solo la propia | **Sí** |
| Alertas | No | Parcial | Parcial | **Sí** |
| Explica el porqué | No | No | No | **Sí ("¿De dónde sale este número?")** |
| Diseño | Terminal, denso | Correcto | Variable | **Nivel Apple/Whoop** |

---

## 5. "¿No es muy de nicho?" (la duda del audio 2)

Es una duda válida. La respuesta es un **embudo**: puertas de entrada masivas arriba y profundidad abajo.

1. **Puerta de entrada masiva (tráfico):** dólar hoy en todas sus variantes, ranking de dónde comprar dólares, "¿dónde rinde más mi plata?", calculadoras (interés compuesto, plazo fijo, inflación, jubilación, sueldo en dólares). Son búsquedas de millones de argentinos, no de inversores.
2. **Enganche (registro y recurrencia):** alertas ("avisame si el MEP baja de $X"), cartera, metas.
3. **Profundidad (lealtad del inversor):** LECAPs, CER, curvas, bonos, ONs, CEDEARs, breakeven.
4. **Expansión:** cripto, mercados globales, educación y LatAm (Uruguay, Chile, México comparten varios de estos problemas).

El nicho es **el núcleo de valor**, no el techo. Nadie entra buscando "TEM de LECAPs": entra por el dólar o por "¿dónde pongo mi aguinaldo?", y se queda porque encuentra algo mejor.

---

## 6. Mapa del sitio

```
/                       Inicio: la foto del día + "¿Dónde rinde más tu plata?"
/dolar                  Cotizaciones · Dónde comprar (ranking por app) · Histórico y brecha · Conversor · Arbitraje
/pesos                  Comparador · Plazo fijo · Billeteras y cuentas · FCI money market · Caución · LECAPs y BONCAPs · CER · Simulador
/mercados/bonos         Soberanos USD · ONs · Calculadora de flujos
/mercados               CEDEARs · Acciones · Cripto · Global
/mercados/inversores    Carteras de grandes inversores (13F de la SEC): con foco en Argentina y los grandes del mundo; ficha de cada uno con su cartera y sus movimientos
/calculadoras           Interés compuesto · Jubilación y metas · Plazo fijo · Conversor de tasas · Inflación · Sueldo en dólares
/cartera                Resumen · Posiciones · Movimientos · Rendimiento · Ideas
/alertas
/calendario             Vencimientos, pagos de bonos, dato de inflación, licitaciones, feriados
/aprender               Glosario y explicadores cortos
/metodologia            Fuentes, fórmulas y criterios de ranking (confianza)
/legal                  Términos, privacidad, aviso de afiliados, "no es asesoramiento"
```

Las solapas de cada sección son rutas reales (`/pesos/lecaps`), no estado local: se pueden compartir, indexar y volver atrás.

---

## 7. Módulos

Cada módulo se diseña en **tres capas** (glance → trend → deep dive):
1. **Un vistazo:** el número o la respuesta, grande.
2. **Tendencia:** un gráfico o ranking corto.
3. **Detalle:** la tabla completa, la fórmula y la fuente.

### 7.1 Inicio: "La foto de hoy"

- **Barra de estado:** fecha, hora, mercado abierto o cerrado y frescura de los datos.
- **Tres respuestas grandes** (no diez números): ¿cuánto está el dólar? (MEP y oficial, con delta y sparkline), ¿dónde rinde más mi plata hoy? (la mejor opción líquida y la mejor a 30 días) y ¿qué pasó hoy? (un resumen de dos líneas generado por reglas en v1 y por IA más adelante).
- **Widget "¿Dónde rinde más tu plata?"**: monto + plazo (hoy mismo, 30, 60, 90, 180 días) + liquidez. Devuelve el top 5 con "ganás $X en el período" y una barra comparativa. Es la feature estrella del sitio.
- **Bento grid:** ranking del dólar (top 3), curva de LECAPs en miniatura, riesgo país, inflación del último mes y expectativa (REM), próximos eventos del calendario.
- **Sección de producto** (para quien todavía no usa la cartera): mostrar la cartera y las alertas con componentes reales en modo demo, no capturas. Scroll con revelado sutil, estilo Apple.

### 7.2 Dólar

- **Cotizaciones:** oficial, MEP, CCL, blue, cripto (USDT), tarjeta y mayorista. Compra, venta, variación y sparkline. Brecha contra el oficial.
- **Dónde comprar** (ranking por app y banco): pestañas USD / USDT / USDC; orden por "mejor para comprar", "mejor para vender" o "menor spread"; filtro "opera 24/7"; **costo total de comprar USD 1.000** con comisiones; bloque aparte para "precios con condiciones especiales".
- **Histórico y brecha:** gráfico de precio con rangos (1S, 1M, 3M, 1A, 5A, Máx) y brecha MEP/oficial.
- **Conversor:** pesos ↔ dólares con cualquier tipo de cambio.
- **Arbitraje:** oficial → MEP → cripto, con comisiones y tiempos reales. Muestra "ganancia neta estimada" y advierte restricciones vigentes (parametrizables, porque la normativa cambia).

### 7.3 Pesos (ahorro en pesos)

- **Comparador unificado:** billeteras, cuentas remuneradas, FCI money market, plazo fijo, caución y LECAPs **normalizados a TEA** para comparar peras con peras. Columnas: tipo, liquidez, tope, riesgo y garantía. **Sin duplicados.**
- **Plazo fijo:** por banco a 30, 60 y 90 días, más UVA y precancelable.
- **Billeteras y cuentas:** tasa, tope y condiciones. **Histórico de tasa** por proveedor (¿quién baja la tasa primero?).
- **FCI money market:** rendimiento calculado desde la cuotaparte, con fecha.
- **Caución:** tasas por plazo.
- **LECAPs y BONCAPs:** tabla (días al vencimiento, precio, TNA, TEA, TEM) + **curva** con ajuste suave. Hover sincronizado entre la tabla y la curva. Click → calculadora del instrumento ("si pongo $X hoy, al vencimiento cobro $Y").
- **CER:** bonos ajustados por inflación, con tasa real y **inflación breakeven** contra LECAPs de vencimiento similar.
- **Simulador:** "pongo $1M a 90 días" → todas las alternativas lado a lado, con escenarios de inflación (baja, REM, alta) y el resultado nominal y real.

### 7.4 Bonos y ONs

- **Soberanos USD:** Bonares y Globales. TIR, duration, paridad, precio, cupón y próximo pago. Curva TIR × duration, separada por ley (local y NY).
- **ONs:** emisor, vencimiento, TIR, duration, precio y mínimo. Filtros por sector y ley.
- **Calculadora de flujos:** monto → cronograma de cobros (cupón + amortización) en USD, con la TIR resultante.

### 7.5 Mercados

- **CEDEARs:** precio en ARS, especies D y C, subyacente, ratio y MEP/CCL implícitos. Buscador y filtros por sector.
- **Acciones argentinas:** panel líder y general.
- **Cripto:** BTC, ETH, USDT y USDC en ARS y USD por exchange.
- **Global** (fase 2): índices, tasas de EE.UU., commodities y monedas.

### 7.6 Calculadoras

Cada calculadora: inputs a la izquierda (o arriba en mobile), resultado grande + gráfico a la derecha, explicación en una línea, botón "Compartir resultado" (genera una imagen) y link a la fórmula.

- **Interés compuesto:** capital inicial, aporte mensual, tasa, plazo y frecuencia de capitalización. Gráfico apilado de aportes vs intereses. Resultado nominal y real (con inflación supuesta).
- **Jubilación y metas:** "¿cuánto necesito ahorrar por mes para tener X a los Y años?" en USD y en pesos reales. Incluye una regla de retiro sostenible, explicada.
- **Plazo fijo:** monto, tasa y plazo → intereses, TEA y comparación contra la inflación esperada.
- **Conversor de tasas:** TNA ↔ TEA ↔ TEM, con el plazo.
- **Inflación:** "¿cuánto valen hoy $X de [fecha]?" (IPC).
- **Sueldo en dólares:** cuánto es tu sueldo en MEP, blue y oficial, y cómo cambió.

### 7.7 Cartera (el corazón de la retención)

- **Carga:** manual por instrumento (billetera, plazo fijo, LECAP, bono, ON, CEDEAR, acción, cripto, efectivo en USD), importación por CSV y, en el futuro, conexión con brokers que tengan API.
- **Modelo:** las posiciones se **derivan de los movimientos** (compras, ventas, depósitos, retiros, cupones, dividendos, intereses). Costo promedio ponderado.
- **Resumen:** valor total en **ARS, USD MEP y pesos constantes**; variación del día; distribución por tipo, moneda y plazo (gráfico sobrio).
- **Rendimiento:** TWR (para comparar contra índices) y XIRR (el retorno real de *tu* plata). Contra **IPC**, contra **dólar MEP** y contra **plazo fijo**. "¿Le ganaste a la inflación?" con respuesta clara.
- **Ideas** (motor de insights, ver §8).
- **Modo demo:** una cartera de ejemplo precargada y claramente rotulada, para que cualquiera vea el valor sin cargar nada.
- **v1 local-first:** se guarda en el navegador, con exportar e importar. **v2:** cuenta y sincronización (Supabase).

### 7.8 Alertas

- **Tipos:** precio ("MEP > $X"), tasa ("alguna billetera > 35 % TNA"), comparación ("una LECAP rinde más que el plazo fijo a igual plazo"), vencimiento ("tu plazo fijo vence mañana") y spread ("comprar USD en X cuesta menos que en Y").
- **v1:** crear, editar y listar alertas, con evaluación en el cliente y aviso dentro del sitio. **v2:** evaluación en el servidor (cron) y envío por push (PWA), email y Telegram. WhatsApp más adelante, por costo.

### 7.9 Calendario

Vencimientos de LECAPs y bonos, pagos de cupón y amortización, publicación del IPC del INDEC, licitaciones del Tesoro y feriados. Se puede filtrar por "lo que tengo en mi cartera".

### 7.10 Confianza

- **"¿De dónde sale este número?"** en cada métrica: popover con la fórmula **completada con los valores reales**, la fuente y la hora.
- **/metodologia:** fuentes, frecuencia, fórmulas y criterios de ranking. Pública.
- **Ranking de confiabilidad** (fase 3): garantía de depósitos (SEDESA), regulación (BCRA, CNV, PSP), tiempos de retiro y reclamos públicos.

### 7.11 Más adelante

- **Resumen semanal con IA** (en el sitio y por newsletter), redactado a partir de los mismos datos, con las fuentes citadas.
- **Impuestos:** estimación de Ganancias y Bienes Personales por instrumento, con disclaimer fuerte y parámetros configurables.
- **Earnings y global.**

---

## 8. Motor de ideas: "¿Dónde rendiría más mi plata?"

Reglas deterministas, testeadas y explicables. Cada idea tiene: título, cuenta visible, impacto en $ por mes o por período, un CTA (que puede ser un link de afiliado rotulado) y el disclaimer "Es una comparación, no una recomendación".

Ejemplos de reglas:

| Regla | Disparo | Mensaje |
|---|---|---|
| Liquidez mejorable | Saldo en billetera o cuenta con TNA ≥ 2 pp por debajo de la mejor opción con liquidez inmediata | "Tus $2.000.000 en X rinden 32 % TNA; en Y rendirían 36 %: son ≈ $6.600 más por mes" |
| Vencimiento próximo | Plazo fijo o LECAP que vence en ≤ 3 días hábiles | "Tu plazo fijo vence el jueves. Hoy la mejor tasa a 30 días es 24 % en Z" |
| Curva vs plazo fijo | LECAP con TEA mayor que la del plazo fijo a igual plazo, por ≥ 1,5 pp | "A 90 días, la LECAP T15E7 rinde 25,9 % TEA contra 23,8 % del mejor plazo fijo" |
| Pérdida real | Rendimiento de los últimos 12 meses < IPC | "En los últimos 12 meses tu cartera en pesos rindió 18 % y la inflación fue 24 %" |
| Concentración | Un instrumento > 40 % del total | "El 55 % de tu cartera está en un solo activo" (informativo, sin juicio) |
| Moneda | Exposición en pesos o en dólares por encima de lo que el usuario fijó como objetivo | "Tu objetivo era 50/50 y hoy estás 70/30" |

Los números de los ejemplos son ilustrativos: en el producto siempre salen de los datos.

---

## 9. Monetización

En orden de prioridad:

1. **Afiliados y referidos** (brokers, billeteras, exchanges, apps de remesas como Arq o Takenos, procesadores de pago). Registro central en `partners.ts` con: id, nombre, categorías, URL de referido, código, notas de comisión y `activo`. El componente `<PartnerCTA>` muestra "Abrir cuenta en X" + "Enlace de afiliado".
   - **Regla de oro:** el ranking no sabe quién es socio. Hay un test que lo verifica.
2. **Freemium "Pro":** gratis todos los comparadores, las calculadoras, una cartera y hasta 3 alertas. Pago: alertas ilimitadas y por Telegram o push, varias carteras, exportes, impuestos e histórico largo.
3. **Patrocinios:** espacios rotulados "Patrocinado", separados de los rankings. Newsletter patrocinado.
4. **Publicidad display (Google Ads):** con criterio, solo en contenido (Aprender, notas) y nunca dentro de tablas o rankings. Los anuncios genéricos degradan un diseño premium; por eso queda último.
5. **B2B / marca blanca:** para asesores y fondos chicos. Conecta con el portal de fondo (el cliente ve su cuotaparte y el contexto de mercado).

En el MVP **no se cobra nada**, pero la arquitectura queda lista: registro de partners, slots rotulados y flags de plan.

---

## 10. Crecimiento (difusión)

- **SEO programático:** una página por banco, billetera, LECAP, bono y CEDEAR (`/pesos/plazo-fijo/banco-nacion`, `/pesos/lecaps/t15e7`), con datos vivos, título y meta claros, schema.org y sitemap.
- **Contenido compartible:** imágenes OG dinámicas ("El dólar hoy en 10 apps", "Dónde rinde más tu plata hoy") pensadas para historias de Instagram, X y WhatsApp. Un botón "Compartir" en cada ranking y calculadora.
- **Rituales:** "La foto del lunes" (resumen semanal) por newsletter y canal de Telegram.
- **Widgets embebibles** para blogs y medios ("Dólar hoy, por Rinde"), con link de vuelta.
- **Comunidad:** X, Instagram y TikTok con piezas cortas generadas desde los mismos datos.
- **Partners:** cuando haya tráfico, los referidos son además canal de difusión cruzada.

---

## 11. LatAm

v1 es solo Argentina, pero sin cerrar puertas:
- `config/countries/ar.ts` define moneda, locale, feriados, tipos de cambio y fuentes.
- Los adapters se registran por país.
- La UI no hardcodea "ARS" ni "pesos": lo toma del país.
- Candidatos para seguir: Uruguay, Chile y México (algunas APIs de cotizaciones ya cubren varios países).

---

## 12. Legal y cumplimiento (para revisar con un abogado antes de lanzar)

- **No es asesoramiento financiero.** Disclaimer en el footer, en cartera, en ideas y en calculadoras.
- **CNV:** las ideas sobre la cartera son comparaciones informativas y genéricas. Antes de ofrecer algo que se parezca a una recomendación personalizada, consultar si requiere registro como asesor (AAGI) u otra figura.
- **Datos personales:** cuando haya cuentas, cumplir la Ley 25.326 (política de privacidad, consentimiento, baja).
- **Afiliados:** aviso visible y página de transparencia.
- **Fuentes de datos:** revisar los términos de uso de cada API para uso comercial y atribuir donde corresponda.
- **Marcas y logos:** en v1 se usan monogramas propios. Los logos oficiales se suman con permiso (los partners suelen dar kit de prensa).

---

## 13. Métricas de éxito

- Visitas recurrentes semanales (no solo totales).
- Uso del widget "¿Dónde rinde más?" (cálculos por sesión).
- Carteras creadas y alertas activas.
- Compartidos (imágenes generadas).
- Clics en enlaces de afiliado y conversión.
- Core Web Vitals en verde.

---

## 14. Nombre

**"Rinde" es provisorio.** Otras opciones para evaluar (chequear dominio .com.ar y .com, marca y redes): *Rinde*, *Tasa*, *Cauce*, *Plata Clara*, *Brújula*. El nombre vive en `src/config/site.ts`.
