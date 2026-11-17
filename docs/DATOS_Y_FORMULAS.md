# Datos y fórmulas

> Regla madre: **ningún número sin procedencia, ninguna fuente sin validación.** Los endpoints de abajo se relevaron en noviembre de 2026. Antes de usar cada uno, hacé un request real, confirmá la forma de la respuesta y anotá el resultado en `PROGRESO.md`. Varias rutas figuran por su nombre en la documentación y el path exacto hay que confirmarlo.

---

## 1. Arquitectura de datos

```
Fuente externa ──► Adapter (fetch + timeout + reintento) ──► Schema Zod ──► Normalización a tipos propios
      ──► Validación de sanidad (§4) ──► Caché (revalidate + tags) ──► Route handler /api/... ──► UI
```

- **Todo fetch externo ocurre en el servidor.** El navegador nunca le pega directo a una fuente: evita CORS, protege los límites de uso y hace que mil usuarios generen un solo request por ventana de caché.
- Cada respuesta interna tiene la forma:
  ```ts
  type Envelope<T> = {
    data: T;
    source: { id: string; name: string; url: string }[];
    asOf: string;        // momento del dato según la fuente
    fetchedAt: string;   // cuándo lo trajimos
    status: "live" | "delayed" | "close" | "stale" | "sample";
    excluded?: { id: string; reason: string }[]; // lo que filtró la validación
  };
  ```
- **Tipos comunes:** `Quote` (precio con compra/venta), `Rate` (tasa con tipo TNA/TEA, plazo y tope), `Instrument` (ticker, clase, moneda, vencimiento), `Provider` (banco, billetera, exchange, broker).
- **Fallback:** si la fuente falla, se devuelve el último dato válido cacheado con `status: "stale"` y su hora. Si no hay ninguno, se devuelve un error tipado y la UI muestra el estado de error del widget.
- **Modo ejemplo:** si una fuente todavía no existe, se usan fixtures en `data/samples/` con `status: "sample"`, y la UI lo rotula "Datos de ejemplo".

---

## 2. Fuentes por módulo

| Dato | Fuente principal | Endpoint o referencia | Alternativa |
|---|---|---|---|
| Dólar oficial, MEP, CCL, blue, cripto, tarjeta, mayorista | **DolarAPI** (sin auth) | `GET https://dolarapi.com/v1/dolares` y `/v1/dolares/{casa}` | CriptoYa (`/api/dolar`), BCRA |
| Histórico del dólar | **ArgentinaDatos** | `GET https://api.argentinadatos.com/v1/cotizaciones/dolares` y por casa | — |
| Dólar por app, banco y exchange (USD, USDT, USDC) y comisiones | **CriptoYa** | Base `https://criptoya.com/api`: cotización por exchange, cotización general, comisiones de retiro, dólar y bancos. Paths en `docs.criptoya.com/argentina`. **Límite: 120 req/min; actualiza cada minuto** | comparadolar.ar (no se conoce API pública: evaluar contacto) |
| Plazo fijo por banco | **ArgentinaDatos** | Doc: *finanzas → tasas → plazo fijo* (también UVA con pago periódico, UVA precancelable y depósitos a 30 días) | BCRA (comparador de tasas) |
| Rendimientos de billeteras cripto (USDT, USDC, ARS) | **ArgentinaDatos** | `GET /v1/finanzas/rendimientos` y `/{entidad}` (buenbit, fiwind, letsbit, belo, lemoncash, ripio) | CriptoYa |
| Cuentas remuneradas en pesos (Ualá, Naranja X, etc.) | **Tabla manual** `data/ar/cuentas-remuneradas.ts` | Con "verificado el dd/mm" visible | Buscar fuente estructurada (fase 2) |
| Cuentas remuneradas en USD | **ArgentinaDatos** | Doc: *finanzas → tasas → cuentas remuneradas USD* | — |
| FCI money market, renta fija, etc. | **ArgentinaDatos** | Doc: *finanzas → FCI → mercado de dinero / renta fija / … por fecha*, detalle e histórico por fondo, subset ComparaTasas | CAFCI |
| Caución ARS y USD | **ArgentinaDatos** | Doc: *finanzas → cauciones* | data912 |
| LECAPs, BONCAPs (precios) | **data912** | `GET https://data912.com/live/arg_notes` | BYMA open data |
| Bonos soberanos (precios) | **data912** | `/live/arg_bonds` | BYMA |
| ONs | **data912** | `/live/arg_corp` | BYMA |
| CEDEARs | **data912** | `/live/arg_cedears` + `/live/usa_stocks` (subyacente) | — |
| Acciones argentinas | **data912** | `/live/arg_stocks` | — |
| MEP y CCL implícitos | **data912** | `/live/mep`, `/live/ccl` | Cálculo propio desde bonos |
| Históricos (OHLC diario) | **data912** | `/historical/stocks/{t}`, `/historical/cedears/{t}`, `/historical/bonds/{t}` | — |
| Bonos CER | **ArgentinaDatos** | Doc: *finanzas → bonos CER* | data912 + flujos propios |
| Índice CER, UVA | **BCRA** / **CriptoYa** | BCRA v4.0 (ver abajo) / CriptoYa "Valor CER" y "Valor UVA" | ArgentinaDatos (UVA) |
| Inflación mensual e interanual, riesgo país, REM | **ArgentinaDatos** | Doc: *finanzas → índices* (inflación, interanual, UVA, riesgo país y su último valor) y *REM* | BCRA |
| Variables del BCRA (reservas, BADLAR, TAMAR, base monetaria…) | **BCRA Estadísticas Monetarias v4.0** (sin auth) | `GET https://api.bcra.gob.ar/estadisticas/v4.0/monetarias` (catálogo) y `/monetarias/{idVariable}?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&limit=&offset=` (límite máximo 3000). **La v3.0 quedó deprecada el 28/02/2026** | — |
| Cotizaciones oficiales de divisas | **BCRA Estadísticas Cambiarias** | API pública del BCRA | — |
| Cripto (BTC, ETH) | **CriptoYa** (en ARS por exchange) + API pública de un exchange grande (en USD) | — | — |
| Comisiones de brokers, cobros y remesas | **ArgentinaDatos** | Doc: *finanzas → otros → comisiones de brokers / comisiones de cobro / remesas* | Tabla manual |
| Créditos hipotecarios UVA y préstamos | **ArgentinaDatos** | Doc: *finanzas → créditos* | — |
| Feriados (para días hábiles) | **ArgentinaDatos** | Doc: *eventos → feriados* y *feriados bancarios* | Tabla estática de respaldo |
| Mercados globales (índices, commodities) | **Fase 2** | Requiere un proveedor con API key (ej. Twelve Data, Finnhub, Alpha Vantage). Revisar términos | data912 `usa_stocks` para acciones |

### Datos estáticos que tenés que construir y versionar

| Archivo | Contenido | Fuente |
|---|---|---|
| `data/ar/lecaps.ts` | ticker, tipo (LECAP / BONCAP), fecha de emisión, vencimiento, TEM de emisión, **valor final por 100 VN**, `vfEstimado` | Comunicados de licitación del Ministerio de Economía. Si no se encuentra el valor oficial, estimarlo con la TEM de emisión y marcar `vfEstimado: true` (la UI lo indica) |
| `data/ar/bonos-usd.ts` | AL/GD y demás soberanos USD (incluidos los emitidos en 2025–2026 que coticen): ley, cronograma de cupones y amortizaciones | Prospectos oficiales. Verificar contra al menos una fuente pública |
| `data/ar/bonos-cer.ts` | Ticker, vencimiento, CER base, cronograma | Prospectos |
| `data/ar/proveedores.ts` | id, nombre, tipo, regulador (BCRA / CNV / PSP), garantía de depósitos, opera 24/7, sitio, color del monograma | Investigación propia |
| `data/ar/calendario.ts` | Fechas de publicación del IPC (INDEC) y licitaciones del Tesoro | Calendarios oficiales |

---

## 3. Frecuencia y caché

| Dato | Revalidate (horario de mercado) | Fuera de horario |
|---|---|---|
| Dólares y cripto | 60 s | 5 min |
| data912 live (bonos, letras, CEDEARs, acciones) | 60 s | 15 min |
| Plazo fijo, billeteras, FCI, caución | 1 h | 6 h |
| Variables del BCRA | 6 h | 6 h |
| Inflación, REM, UVA, CER | 12 h | 24 h |
| Feriados | 7 días | 7 días |
| Históricos | 24 h | 24 h |

- Horario de mercado de referencia: días hábiles de 11 a 17 h (hora de Argentina). Que sea configurable.
- **Estado de frescura:** si un dato "en vivo" tiene más de 15 min en horario de mercado → `delayed`; si tiene más de un día hábil → `stale`.
- Respetar los límites de cada fuente. Si una pide más de lo que su límite permite, se agranda la ventana de caché.

---

## 4. Validación de sanidad (las lecciones de la competencia)

Se aplica **en el servidor, antes de cachear**. Todo lo excluido se informa en `excluded` con el motivo, y la UI ofrece "Excluimos N instrumentos. ¿Por qué?".

1. **Vencidos o por vencer:** se excluye de curvas y rankings todo instrumento con días al vencimiento ≤ 0. Con ≤ 5 días hábiles se muestra en la tabla con la etiqueta "Vence en X días", pero queda fuera de la curva (su precio suele estar desfasado y la tasa anualizada explota).
2. **Sin operaciones:** volumen 0 o precio sin actualizar en el día → fuera de la curva, rotulado "Sin operaciones hoy".
3. **Rango plausible por clase:** se definen bandas en `config/countries/ar.ts` (ej. TEA en pesos entre 0 % y 200 %, TIR de bonos USD entre −5 % y 60 %). Fuera de banda → excluido y logueado.
4. **Atípicos contra la curva:** después de ajustar la curva, un punto a más de 3 desvíos del ajuste se marca "Atípico" y no participa del ajuste.
5. **Duplicados:** clave única por instrumento o fondo + clase. En FCI se muestra una clase por fondo (la de acceso minorista) y el resto se agrupa.
6. **Unidades:** confirmar si cada precio viene por 1 o por 100 de valor nominal, y si los bonos que amortizan cotizan sobre el VN original. Testear con un caso conocido.
7. **Nunca notación científica ni `NaN`/`Infinity` en la UI:** si un cálculo da algo así, el dato se excluye.
8. **Errores aislados:** un widget que falla no tumba la página (error boundary por módulo y estado de error diseñado).

---

## 5. Fórmulas

Todas en `src/lib/calculos/`, con decimal.js, documentadas con JSDoc y con un ejemplo numérico en el comentario. Convención de días: **actual/365**. Si una fórmula usa otra convención, se documenta y se muestra en /metodologia.

### 5.1 Tasas

- Interés de un plazo fijo: `I = C × TNA × d / 365`
- TEA de un plazo fijo renovado al mismo plazo: `TEA = (1 + TNA × d/365)^(365/d) − 1`
- TEA con capitalización diaria (billeteras, cuentas remuneradas, FCI MM): `TEA = (1 + TNA/365)^365 − 1`
- TEM desde TEA: `TEM = (1 + TEA)^(30/365) − 1` (convención 30/365; documentarla)
- Tasa real: `r = (1 + nominal) / (1 + inflación) − 1`
- **Comparaciones del comparador y del simulador: siempre en TEA**, para que plazo fijo, billetera y LECAP sean comparables.
- Ganancia en el período para el widget "¿Dónde rinde más?": `G = monto × ((1 + TEA)^(d/365) − 1)`.
- Diferencia mensual para los insights: `ΔG_mes = monto × ((1 + TEA_b)^(30/365) − (1 + TEA_a)^(30/365))`.

### 5.2 FCI money market (desde la cuotaparte)

- Con `n` días corridos (usar 7 para suavizar): `TNA = (VCP_t / VCP_{t−n} − 1) × 365/n` y `TEA = (VCP_t / VCP_{t−n})^(365/n) − 1`.
- Mostrar la fecha de las dos cuotapartes usadas.

### 5.3 LECAPs y BONCAPs

Con `VF` = valor final por 100 VN, `P` = precio por 100 VN y `d` = días corridos desde la **liquidación** (CI = T+0; 24 hs = T+1 hábil, con feriados) hasta el vencimiento:

- Rendimiento directo: `VF / P − 1`
- TNA: `(VF / P − 1) × 365 / d`
- TEA (TIREA): `(VF / P)^(365/d) − 1`
- TEM: `(VF / P)^(30/d) − 1`
- Calculadora: "pongo $X hoy" → nominales = `X / (P/100)` → cobro al vencimiento = `nominales × VF/100`.

### 5.4 Bonos CER

- Valor ajustado: `VN_ajustado = VN × CER_{t−10 hábiles} / CER_base`
- TIR real: resolver `P = Σ CF_real_i / (1 + r)^(t_i)`, con los flujos expresados en términos reales.
- **Inflación breakeven** (contra una LECAP de vencimiento similar): `π_be = (1 + TEA_LECAP) / (1 + TIR_real_CER) − 1`. Mostrarla también mensual: `(1 + π_be)^(30/365) − 1`, y compararla contra el REM.

### 5.5 Bonos en USD y ONs

- TIR: resolver `P_sucio = Σ CF_i / (1 + y)^(t_i)`, con `t_i` en años (act/365) desde la liquidación. Newton-Raphson con bisección de respaldo.
- Duration Macaulay: `D = Σ t_i × PV(CF_i) / P`. Duration modificada: `MD = D / (1 + y)`.
- Valor técnico: `VT = valor residual + intereses corridos`. Paridad: `P / VT`.
- Calculadora de flujos: monto en USD → VN comprado → cronograma de cobros con fecha, cupón y amortización.

### 5.6 Dólar

- Spread de un proveedor: `(precio al que comprás − precio al que vendés) / precio al que vendés`.
- Costo de comprar USD 1.000: `1.000 × precio al que comprás + comisiones fijas + comisiones %` (desde CriptoYa o la tabla del proveedor).
- Brecha: `MEP / oficial − 1`.
- MEP implícito de un bono: `P_ARS(AL30) / P_USD(AL30D)`. CCL: contra la especie C.
- CEDEAR: `MEP implícito = P_ARS / P_D`; `CCL implícito = P_ARS / P_C`; `CCL contra el subyacente = P_ARS × ratio / P_USA`.
- Arbitraje (genérico, por ruta): `ganancia neta % = [P_venta_destino × (1 − com_venta) − costos_fijos/monto] / [P_compra_origen × (1 + com_compra)] − 1`. Las restricciones normativas (plazos mínimos, topes, percepciones) van como **parámetros configurables** en `config/countries/ar.ts`, con la fecha de su última revisión. No se codifican en duro: la normativa cambia.

### 5.7 Calculadoras personales

- Interés compuesto con aportes periódicos: con `i` = tasa por período (`(1 + TEA)^(1/12) − 1` si es mensual), `n` períodos, capital inicial `C0` y aporte `A`:
  `VF = C0 × (1 + i)^n + A × [((1 + i)^n − 1) / i] × (1 + i × k)`, con `k = 1` si el aporte es al inicio del período y `k = 0` si es al final.
- Aporte necesario para una meta: `A = (VF_meta − C0 × (1 + i)^n) × i / [((1 + i)^n − 1) × (1 + i × k)]`.
- Valor real de una meta: descontar por la inflación supuesta (o el REM), mostrar ambas cifras.
- Jubilación: capital necesario = gasto anual deseado / tasa de retiro (parámetro, por defecto 4 % anual real, con explicación de qué significa y de sus límites).
- Inflación acumulada: `Π(1 + π_m) − 1`. Actualizar un monto: `monto × índice_destino / índice_origen` (el índice se arma con el producto acumulado del IPC mensual).

### 5.8 Cartera

- Las posiciones se **derivan de los movimientos**. No hay una tabla de posiciones como fuente de verdad.
- Costo: **promedio ponderado.** Las comisiones suman al costo en compras y restan del producido en ventas.
- P&L realizado: `(precio_venta − costo_promedio) × cantidad − comisiones`. No realizado: `(precio_actual − costo_promedio) × cantidad`.
- Valuación en ARS, en **USD MEP** (con el MEP de cada fecha) y en **pesos constantes** (ajustados por IPC).
- **TWR** (para comparar contra índices), con flujos al inicio del día: `r_t = V_t / (V_{t−1} + F_t) − 1` y `TWR = Π(1 + r_t) − 1`.
- **XIRR** (el retorno de *tu* plata): resolver `Σ CF_i / (1 + r)^((d_i − d_0)/365) = 0`, con aportes negativos y valor final positivo. Newton con bisección de respaldo; si no converge, devolver `null` y la UI lo explica.
- Benchmarks: IPC, dólar MEP, plazo fijo promedio a 30 días renovado y (fase 2) S&P 500 en pesos.
- **Si existe `src/lib/calculos.ts` de un proyecto anterior,** sus funciones de TWR y TIR se reutilizan y sus tests se migran.

---

## 6. Golden tests obligatorios (`tests/fixtures/`)

Calculados a mano (o en planilla) y versionados:

1. TNA ↔ TEA ↔ TEM en ida y vuelta, con 30, 90 y 365 días.
2. Plazo fijo de $1.000.000 a 30 días al 24 % TNA (interés exacto).
3. LECAP con VF, precio y días conocidos → TNA, TEA y TEM.
4. FCI MM con dos cuotapartes conocidas.
5. Bono con flujos conocidos → TIR, duration y paridad (contra una fuente pública).
6. Breakeven entre una LECAP y un CER ficticios.
7. Interés compuesto con aportes al inicio y al final.
8. Aporte necesario para una meta.
9. Cartera multi-moneda (ARS + USD MEP + cripto) con compras, ventas parciales, un cupón y un depósito → posiciones, costo promedio, TWR y XIRR.
10. Ranking del dólar: el orden **no cambia** al marcar un proveedor como afiliado.
11. Validación: una LECAP vencida y un FCI duplicado quedan excluidos con su motivo.

---

## 7. Términos de uso y atribución

- Mostrar la fuente en cada widget y listar todas en /metodologia, con link.
- Antes de lanzar comercialmente, **revisar los términos de cada fuente** (DolarAPI, ArgentinaDatos, CriptoYa, data912, BYMA, BCRA) y, donde no estén claros, escribirles. CriptoYa publica un contacto en su documentación.
- TradingView Lightweight Charts pide atribución: incluirla como indica su licencia.
- No hacer scraping de sitios que lo prohíban. Si un dato solo existe así, se carga manualmente con fecha de verificación.
