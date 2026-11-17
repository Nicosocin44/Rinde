# Progreso

> Escrito para los fundadores. Se actualiza al final de cada sesión.

## Plan de la sesión 1 (17/11/2026)

1. Cimientos: cálculos con tests, capa de datos con validación, design system, shell. ✅
2. Inicio: la foto de hoy, "¿Dónde rinde más tu plata?", bento. ✅ (falta la sección de producto)
3. Dólar → 4. Pesos → 5. Calculadoras → 6. Cartera → 7. Bonos, Mercados, Alertas → 8. Metodología, Aprender, Legal, 404, PWA, OG.

## Fuentes verificadas (16 y 17/11/2026, con requests reales)

| Fuente | Endpoint | ¿Respondió? | Notas |
|---|---|---|---|
| DolarAPI | `/v1/dolares` | Sí | 7 casas (oficial, blue, bolsa=MEP, CCL, mayorista, cripto, tarjeta). Precios en pesos por dólar. |
| ArgentinaDatos | `/v1/cotizaciones/dolares/{casa}` | Sí | Histórico diario desde 2018 (MEP). ~290 KB por casa. |
| ArgentinaDatos | `/v1/finanzas/tasas/plazoFijo` | Sí | 33 bancos. TNA como fracción (0,24). Algunos traen tasas por plazo. |
| ArgentinaDatos | `/v1/finanzas/fci/otros/ultimo` | Sí | Billeteras y cuentas remuneradas (Ualá, Naranja X, Belo…). Mercado Pago no está: se cubre con su fondo (Mercado Fondo). Brubank figura con dato de 2025: se excluye. |
| ArgentinaDatos | `/v1/finanzas/fci/comparatasas` | Sí | Subset ComparaTasas de la CNV: variación de cuotaparte de los últimos ~5–8 días, en %. De ahí sale la TNA de los fondos money market. |
| ArgentinaDatos | `/v1/finanzas/fci/mercadoDinero/{AAAA/MM/DD}` | Parcial | Por fecha trae pocos fondos (21). No lo usamos. |
| ArgentinaDatos | `/v1/finanzas/cauciones/ars` | Sí, pero viejo | La última rueda informada es del 05/11. Se muestra rotulada como desactualizada y queda fuera del comparador. |
| ArgentinaDatos | `/v1/finanzas/letras` | Sí | Trae TTD26 (dual TAMAR) con TEA −70 %: lo excluimos por patrón de ticker y por banda. |
| ArgentinaDatos | `/v1/finanzas/bonos-cer`, `/indices/inflacion`, `/inflacionInteranual`, `/riesgo-pais`, `/rem/ultimo`, `/feriados/{año}` | Sí | REM trae dos muestras (todos y top 10): usamos "todos". |
| data912 | `/live/arg_notes`, `/arg_bonds`, `/arg_corp`, `/arg_cedears`, `/arg_stocks`, `/mep`, `/ccl` | Sí | Letras y bonos cotizan por 100 de valor nominal original (AL30 = $81.500; AL30D = US$ 51,42). Las BONCAPs (T15E7, T30A7…) están en `arg_bonds`. |
| data912 | `/historical/bonds/{t}` | Sí, salvo letras | Para S30N6 responde un texto de error con status 200: hay que validar siempre. |
| CriptoYa | `/api/bancostodos`, `/api/{usdt,usdc,btc,eth}/{ars,usd}/{vol}` | Sí | `totalAsk`/`totalBid` incluyen comisiones. 9 de 22 bancos tienen cotizaciones de hace meses: se excluyen (> 30 h). El volumen no cambia el precio. |
| BCRA v4.0 | `/estadisticas/v4.0/monetarias` y `/{id}` | Sí | Catálogo y series OK (reservas, BADLAR, CER, UVA, TAMAR). |

## Decisiones para revisar

(se completa al cierre)
