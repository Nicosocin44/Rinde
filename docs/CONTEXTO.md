# Contexto: de dónde sale la idea

Este archivo junta la materia prima: lo que hablamos los fundadores, las ideas que ya teníamos anotadas y lo que aprendimos mirando a la competencia. Es para que entiendas el *por qué* de cada decisión de `PRODUCTO.md` y `DISENO.md`.

---

## 1. Quiénes somos

Somos dos amigos que arman esto en paralelo a sus trabajos. Una de las fundadoras viene de marketing y marca (estrategia, medios, contenido), así que la difusión y el crecimiento son parte del plan desde el día uno. **Ninguno es programador experto.** Por eso:

- todo tiene que poder correrse con un comando;
- `PROGRESO.md` tiene que estar escrito para que lo entienda alguien no técnico;
- las decisiones técnicas se explican en una línea, sin jerga innecesaria.

---

## 2. Lo que hablamos por WhatsApp (resumen de dos audios)

### Audio 1, del socio (14/11)

- **rendimientos.co es de Ariel Sbdar, el CEO de Cocos.** La armó más que nada para él: no la publicita, "la tiene ahí, pero la gente no sabe". La oportunidad está en armar algo así **y difundirlo**.
- La visión es un **ecosistema**: un solo lugar donde ves rendimientos, bonos y dólares, y además **tu cartera con sus porcentajes**.
- Sumar **calculadoras de interés compuesto** y una herramienta para **separar plata para la jubilación**, "y le metés varias cosas".
- **Monetización:** cuando el sitio tiene tráfico, se acercan los brokers, Arq, Takenos y procesadores de pago. Con **códigos de referido** cobrás una comisión por cada usuario que se abre una cuenta. También **Google Ads**.
- **Duda práctica:** "no entiendo cómo pasar de Claude a una página" con dominio propio. → Por eso existe `DEPLOY.md`.

### Audio 2, del socio (16/11)

- Le gustó la dirección: **muy enfocado en el seguimiento de la cartera** y, además, en el **seguimiento de todos los activos argentinos** (LECAPs, plazos fijos, letras), **con avisos** y **calculadora de interés compuesto**.
- **Su preocupación:** si solo manejamos LECAPs, plazos fijos y letras, **puede quedar muy de nicho** y no sabe cuánto alcance va a tener. → La respuesta estratégica está en `PRODUCTO.md` §5.
- **Afiliarse con distintos brokers y armar rankings** le parece muy bien: "es así como lo hacen todos".

### Lo que pedimos nosotros, además

Seguimiento de cartera, cálculo de tasas, precios del dólar, **comparación del dólar entre apps**, **comisiones**, cotizaciones en vivo, **ideas de movimientos de cartera**, gráficos. Muy completo para el inversor argentino, con LatAm como posible segundo paso.

**Pedido explícito sobre el diseño:** moderno, limpio, atractivo y ordenado. rendimientos.co nos parece desordenada y poco atractiva. Que **no se note que la hizo una IA**: transiciones, colores, botones lindos, solapas, algo innovador. La vara es Apple y Whoop.

---

## 3. Ideas que ya teníamos anotadas (de las capturas)

**Personalización, la diferencia más fuerte:**
- *Cartera propia:* cargás lo que tenés (billetera, plazo fijo, LECAPs, CEDEARs, cripto) y ves cuánto te rinde todo junto, en pesos, en dólares y en términos reales.
- *"¿Dónde rendiría más mi plata?":* según tu cartera, algo como "tus $2M en Mercado Pago rinden 32 % TNA; en X rendirían 36 %, son $6.600 más por mes".
- *Rendimiento real contra la inflación y contra el dólar:* ¿le ganaste al IPC? ¿Al MEP? Casi nadie lo muestra bien. Ya existen TWR y TIR armadas y testeadas en un `src/lib/calculos.ts` de un proyecto previo.

**Alertas:**
- "Avisame si el MEP pasa $X", "si una billetera supera el 35 % TNA", "si una LECAP rinde más que el plazo fijo".
- Vencimientos: "tu plazo fijo vence mañana; hoy la mejor tasa es Y".
- Canales: push (vía PWA), email, Telegram o WhatsApp.

**Herramientas para decidir:**
- *Simulador comparativo:* "invierto $1M a 90 días" y te muestra lado a lado plazo fijo, caución, LECAP, CER, dólar MEP + bono y FCI money market, con escenarios de inflación.
- *Curvas de tasas* de LECAPs, CER y duales, más la **inflación breakeven** (cuánta inflación descuenta el mercado).
- *Calculadora de arbitrajes:* MEP contra cripto contra oficial, con las comisiones reales.
- *Impuestos:* cuánto pagás de Ganancias o Bienes Personales por cada instrumento. Es un dolor real y casi nadie lo resuelve.

**Contenido y confianza:**
- *Histórico de tasas* por billetera o banco (¿cuál baja la tasa apenas sube el dólar?).
- *Ranking de confiabilidad:* garantía de depósitos, regulación CNV/BCRA, tiempos de retiro, reclamos.
- *Resumen diario o semanal en lenguaje simple*, generado con IA a partir de los mismos datos: "esta semana las LECAPs subieron, el MEP se calmó…".

**Monetización (rendimientos.co no muestra ninguna):**
- *Freemium:* comparador gratis; cartera avanzada, alertas e impuestos pagos.
- *Links de afiliado* a billeteras y brokers, con cuidado de no sesgar el ranking.
- *B2B:* versión con marca propia para asesores o fondos chicos. Se conecta con un portal de fondo ya pensado: el cliente ve su cuotaparte y, además, el contexto de mercado.

---

## 4. Auditoría de rendimientos.co (relevada el 16/11/2026)

### Qué tiene

Estética de terminal ("tty"), fondo casi negro, todo en tipografía monoespaciada. Navegación por solapas de texto: **monitor, ars, bonos, ons, intradiario, dólar, pix, remesas, earnings, cedears, hipotecarios, bcra**, más una paleta de comandos.

| Sección | Contenido |
|---|---|
| Monitor | Índices de EE.UU., tasas del Tesoro, energía, metales, agro, monedas y cripto (último, variación, YTD, 28 días). Las acciones de EE.UU. que más se movieron y un calendario de *earnings* |
| ARS | Sub-solapas: plazo fijo por banco a 30/60/90 días, billeteras (cuentas remuneradas y FCI money market), plazo fijo periódico, LECAPs (tabla + curva), CER y un **comparador** unificado por TNA |
| Bonos | Soberanos en USD (Bonares y Globales): ladder con cupón, YTM, duration y precio; curva YTM × duration; calculadora con flujos |
| ONs | Obligaciones negociables: emisor, vencimiento, YTM, duration, precio |
| Intradiario | Gráfico intradiario de cualquier activo de BYMA (datos con demora) |
| Dólar | Ranking de proveedores (bancos, fintechs, cripto) con precio de compra y venta, spread y variación. Filtros USD/USDT/USDC, "solo 24/7" y precios con condiciones especiales |
| PIX | Ranking de proveedores para pagar en Brasil, con precio implícito ARS/BRL |
| Remesas | Comparador de apps para cobrar USD del exterior: fee, mínimo, apertura, tarjeta y neto sobre USD 1.000 |
| CEDEARs | 361 CEDEARs con precio en ARS, especies D y C, subyacente, MEP y CCL implícitos y ratio. Exporta CSV |
| BCRA | 25 variables monetarias y cambiarias (reservas, BADLAR, TAMAR, base monetaria, depósitos…) |

**Fuentes que cita:** comparadolar.ar, BCRA, argentinadatos.com, BYMA (open.bymadata), data912 y CAFCI.

### Qué hace mal (lo que nosotros tenemos que hacer mejor)

1. **Sin jerarquía.** Todo pesa lo mismo: mono, mayúsculas, tablas largas. No hay un "esto es lo importante hoy".
2. **Orientada al experto.** TEM, TEA, YTM y duration sin explicación. Un ahorrista común no entiende qué le conviene.
3. **Bugs visibles de datos:**
   - En LECAPs muestra un instrumento **vencido** (S30O6, 1 día al vencimiento) con **TEM de 13.426 %** y TEA en notación científica (`8.49e+27 %`). Eso rompe la escala del gráfico y lo deja inútil.
   - El comparador tiene **filas duplicadas** del mismo FCI.
   - La sección **hipotecarios se cae** con un error de JavaScript que se le muestra al usuario.
   - El endpoint intradiario devolvía error 502 al momento del relevamiento.
4. **Sin personalización:** no hay cartera, alertas ni metas.
5. **Sin explicación ni educación:** no te dice *por qué* algo conviene.
6. **Monetización casi nula:** solo un banner de su propio banco en PIX y en Dólar.
7. **Logos heterogéneos** que ensucian las tablas.

### Qué hace bien (y vale la pena igualar o superar)

- Amplitud de datos y velocidad.
- Rankings simples de "mejor para comprar / vender / menor spread".
- Implícitos de CEDEARs (MEP y CCL) y curva de bonos.
- Distinción entre "precio para todos" y "precio con condiciones especiales".
- Compartir en X.

---

## 5. Otros jugadores para tener en el radar

- **comparadolar.ar / comparatasas.ar / comparapix.ar** (y la app *Compara AR*): comparadores puntuales de dólar, tasas y PIX.
- **dolarito.ar:** cotizaciones, índices, mercado, CEDEARs, ONs y calculadoras de préstamos e hipotecarios.
- **CriptoYa:** cotizaciones de cripto y dólar por exchange (también es fuente de datos).
- Apps de brokers (Cocos, IOL, Balanz, PPI) y billeteras: tienen datos, pero cada uno muestra solo lo suyo.

**Nuestro hueco:** nadie junta **comparadores neutrales + tu cartera real + alertas + explicación clara**, con un diseño de primer nivel y una estrategia de difusión.
