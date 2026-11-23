import type { Metadata } from "next";
import { pais } from "@/config/countries/ar";
import { Documento, Formula, type Seccion } from "@/components/modules/contenido/documento";
import { PageHeader } from "@/components/shell/page-header";
import { site } from "@/config/site";
import { FUENTES } from "@/lib/data/types";

export const metadata: Metadata = { title: "Metodología: fuentes, fórmulas y criterios", description: "De dónde sale cada número, cómo lo calculamos y cómo ordenamos los rankings." };

const FUENTES_TABLA = [
  { f: FUENTES.dolarapi, que: "Cotizaciones del dólar (oficial, MEP, CCL, blue, cripto, tarjeta, mayorista)", frec: "Cada 1 a 5 minutos" },
  { f: FUENTES.argentinadatos, que: "Histórico del dólar, plazo fijo por banco, billeteras y cuentas, fondos (ComparaTasas de la CNV), caución, letras, bonos CER, inflación, riesgo país, REM y feriados", frec: "Cada 1 a 24 horas" },
  { f: FUENTES.data912, que: "Precios de BYMA con demora: LECAPs, BONCAPs, bonos, ONs, CEDEARs, acciones, MEP y CCL implícitos, históricos diarios", frec: "Cada 1 a 15 minutos" },
  { f: FUENTES.criptoya, que: "Dólar por banco y casa de cambio; USDT, USDC, BTC y ETH por exchange, con comisiones", frec: "Cada minuto" },
  { f: FUENTES.bcra, que: "Estadísticas monetarias v4.0 (reservas, BADLAR, TAMAR, CER, UVA)", frec: "Cada 6 horas" },
  { f: { name: "Binance", url: "https://www.binance.com" }, que: "Histórico semanal de BTC y ETH en dólares (para valuar carteras)", frec: "Diario" },
];

const secciones: Seccion[] = [
  {
    id: "principios",
    titulo: "Principios",
    contenido: (
      <>
        <p>
          <strong>Ningún número sin procedencia.</strong> Cada dato muestra su fuente, su hora y su estado: <em>En vivo</em>, <em>Demorado</em>, <em>Cierre</em>, <em>Desactualizado</em> o <em>Datos de ejemplo</em>.
        </p>
        <p>
          <strong>Ninguna fuente sin validación.</strong> Antes de mostrar un dato lo validamos: excluimos instrumentos vencidos, tasas fuera de un rango plausible, cotizaciones viejas, precios atípicos y filas duplicadas. Cuando
          excluimos algo, lo decimos y explicamos por qué.
        </p>
        <p>
          <strong>Nada de recomendaciones personalizadas.</strong> Mostramos comparaciones con la cuenta a la vista. Nunca te decimos qué comprar o vender.
        </p>
      </>
    ),
  },
  {
    id: "fuentes",
    titulo: "Fuentes",
    contenido: (
      <table>
        <thead>
          <tr>
            <th>Fuente</th>
            <th>Qué usamos</th>
            <th>Frecuencia</th>
          </tr>
        </thead>
        <tbody>
          {FUENTES_TABLA.map((x) => (
            <tr key={x.f.name}>
              <td>
                <a href={x.f.url} target="_blank" rel="noopener noreferrer">
                  {x.f.name}
                </a>
              </td>
              <td>{x.que}</td>
              <td>{x.frec}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
  {
    id: "neutralidad",
    titulo: "Cómo ordenamos los rankings",
    contenido: (
      <>
        <p>
          Los rankings se ordenan <strong>solo por métricas objetivas</strong>: precio final con comisiones, spread, TEA o ganancia en pesos. El código que ordena no tiene acceso al registro de acuerdos comerciales, y un test
          automático verifica que marcar a un proveedor como socio no cambia su posición.
        </p>
        <p>
          Si en el futuro hay enlaces de afiliado, van rotulados como <strong>“Enlace de afiliado”</strong> y nunca dentro del ranking: solo en el detalle de cada proveedor. Los espacios pagos van rotulados como{" "}
          <strong>“Patrocinado”</strong>.
        </p>
      </>
    ),
  },
  {
    id: "tasas",
    titulo: "Tasas: TNA, TEA y TEM",
    contenido: (
      <>
        <p>Comparamos todo en TEA (tasa efectiva anual), que incluye la reinversión de los intereses. Es la única forma justa de comparar una billetera que paga todos los días con un plazo fijo a 30 días.</p>
        <Formula>
          {`TEA con capitalización diaria (billeteras, fondos) = (1 + TNA / 365)^365 − 1
TEA de un plazo a d días renovado               = (1 + TNA × d / 365)^(365 / d) − 1
TEM (convención 30/365)                          = (1 + TEA)^(30 / 365) − 1
Tasa real                                        = (1 + nominal) / (1 + inflación) − 1`}
        </Formula>
        <p>Usamos días corridos y la convención actual/365.</p>
      </>
    ),
  },
  {
    id: "donde-rinde",
    titulo: "¿Dónde rinde más tu plata?",
    contenido: (
      <>
        <p>Para un monto y un plazo, calculamos cuántos pesos ganás con cada opción y las ordenamos de mayor a menor ganancia.</p>
        <Formula>{`Ganancia = monto × ((1 + TEA)^(días / 365) − 1)`}</Formula>
        <ul>
          <li>Si el monto supera el tope de una cuenta, la tasa se aplica solo hasta el tope y el resto no rinde.</li>
          <li>“Hoy” muestra la ganancia de un mes con la plata siempre disponible.</li>
          <li>Plazo fijo y caución entran si su plazo no supera el elegido (se renuevan). Las LECAPs entran si vencen cerca del plazo elegido.</li>
          <li>Las tasas que piden condiciones (plan sueldo, consumo mínimo) se muestran aparte: no son comparables.</li>
          <li>Para que el top no sean cinco variantes de lo mismo, mostramos como máximo dos opciones por tipo y una por proveedor.</li>
        </ul>
      </>
    ),
  },
  {
    id: "plazo-fijo",
    titulo: "Plazo fijo",
    contenido: (
      <>
        <p>Usamos la TNA que cada banco informa al BCRA. La columna principal es la tasa para clientes a 30 días; también mostramos la de no clientes cuando existe.</p>
        <Formula>{`Intereses = capital × TNA × días / 365`}</Formula>
        <p>
          Los depósitos en pesos están cubiertos por la garantía de SEDESA hasta {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(pais.garantiaDepositos.monto)} por persona y
          por entidad (valor revisado el {pais.garantiaDepositos.revisado.split("-").reverse().join("/")}).
        </p>
      </>
    ),
  },
  {
    id: "fci",
    titulo: "Fondos money market",
    contenido: (
      <>
        <p>La tasa de un fondo no es fija: la calculamos con la variación de la cuotaparte en los últimos días hábiles disponibles (entre 5 y 8 días corridos).</p>
        <Formula>{`TNA = (cuotaparte hoy / cuotaparte hace n días − 1) × 365 / n
TEA = (cuotaparte hoy / cuotaparte hace n días)^(365 / n) − 1`}</Formula>
        <p>Mostramos una clase por fondo (la de acceso minorista, la A cuando existe). Excluimos fondos sin patrimonio o con la cuotaparte sin actualizar hace más de {pais.frescura.fciMaxDias} días.</p>
      </>
    ),
  },
  {
    id: "caucion",
    titulo: "Caución",
    contenido: <p>Tasa de la caución colocadora en pesos por plazo, de la última rueda informada. Si la fuente no tiene ruedas de los últimos {pais.frescura.caucionMaxHabiles} días hábiles, la marcamos como desactualizada y la sacamos del comparador.</p>,
  },
  {
    id: "lecaps",
    titulo: "LECAPs y BONCAPs",
    contenido: (
      <>
        <p>Con VF = valor final por 100 nominales, P = precio por 100 nominales y d = días corridos desde la liquidación (24 h hábiles) hasta el vencimiento:</p>
        <Formula>{`Rendimiento directo = VF / P − 1
TNA = (VF / P − 1) × 365 / d
TEA = (VF / P)^(365 / d) − 1
TEM = (VF / P)^(30 / d) − 1
Cobro al vencimiento = (monto / (P / 100)) × VF / 100`}</Formula>
        <ul>
          <li>Las vencidas se excluyen. Las que vencen en {pais.lecaps.minHabilesCurva} días hábiles o menos se muestran, pero quedan fuera de la curva: su tasa anualizada explota.</li>
          <li>Las que no operaron en el día quedan fuera de la curva.</li>
          <li>La curva se ajusta con el modelo de Nelson-Siegel. Un punto a más de {pais.lecaps.desviosAtipico} desvíos del ajuste se marca como atípico.</li>
          <li>Valor final: hoy lo derivamos del precio y la TEA publicados (diferencia menor al 0,01 % contra el oficial) y lo rotulamos como estimado. Lo vamos a reemplazar por el valor oficial de cada licitación.</li>
        </ul>
      </>
    ),
  },
  {
    id: "opciones",
    titulo: "Opciones de GGAL",
    contenido: (
      <>
        <p>
          Precios de BYMA con demora (data912): mejores puntas de compra y venta, último precio y volumen de cada serie. El símbolo dice todo: GFGC5400DI es un call (C; V es put) de GGAL con base $ 5.400 que vence en diciembre.
          Las series vencen el tercer viernes del mes; si es feriado, el hábil anterior. Cada contrato son 100 acciones y las primas están por acción.
        </p>
        <p>La fuente no publica griegas para las opciones locales: las calculamos nosotros con Black-Scholes.</p>
        <Formula>{`Precio de referencia = (compra + venta) / 2   (o el último, si operó hoy y no hay puntas)
Volatilidad implícita = la σ con la que Black-Scholes da el precio de referencia
Delta call = N(d1)      Delta put = N(d1) − 1
d1 = (ln(S / K) + (r + σ² / 2) × t) / (σ × √t)
S = punto medio de GGAL · K = base · t = días al vencimiento / 365 · r = ln(1 + TEA de la caución al plazo más parecido)`}</Formula>
        <ul>
          <li>Es un modelo para opciones europeas y sin dividendos. Las de BYMA son americanas: en los puts con mucho valor intrínseco la volatilidad implícita es aproximada.</li>
          <li>Excluimos las series vencidas y las puntas cruzadas (compra mayor que venta). Una volatilidad implícita fuera del rango de 5 % a 300 % anual no se muestra.</li>
          <li>Si la compra y la venta están separadas más de un 25 % del punto medio, la volatilidad implícita se marca como aproximada.</li>
          <li>Volatilidad histórica: el desvío de las variaciones diarias de las últimas 20 y 60 ruedas, anualizado con 252 ruedas.</li>
        </ul>
        <p>
          <strong>Lanzamiento cubierto.</strong> Comprás la acción a la mejor punta vendedora (S) y vendés el call a la mejor punta compradora (C). Si te ejercen, cobrás la base (K). Los días van de la liquidación de hoy (24 h) al
          cobro del ejercicio (vencimiento + 1 día hábil).
        </p>
        <Formula>{`Ponés por acción = S − C
Rendimiento directo = K / (S − C) − 1
TNA = rendimiento directo × 365 / días
Colchón = 1 − K / S   (cuánto puede bajar la acción y que igual te ejerzan)
Punto de equilibrio = S − C`}</Formula>
        <p>
          Con c = tu comisión más derechos de mercado (la ponés vos; arranca en 0,5 %), que se cobra al comprar la acción, al vender el call y al entregar las acciones en el ejercicio: ponés S × (1 + c) − C × (1 − c) y cobrás K
          × (1 − c). Sin impuestos ni dividendos. Lo comparamos con la caución, la LECAP y el plazo fijo de plazo más parecido, ordenados solo por TNA. Una tasa fuera de ±300 % sale de una punta suelta y se descarta.
        </p>
        <p>
          <strong>Cajas.</strong> Call comprado y put vendido en la base baja (K1), call vendido y put comprado en la alta (K2). Al vencimiento valen siempre K2 − K1. Para colocar pesos comprás la caja (pagás las puntas vendedoras de
          lo que comprás y cobrás las compradoras de lo que vendés); para tomar, la vendés.
        </p>
        <Formula>{`Colocar: ponés hoy = Call K1 (venta) + Put K2 (venta) − Call K2 (compra) − Put K1 (compra) + c × (suma de las cuatro primas)
Tomar: recibís hoy = Call K1 (compra) + Put K2 (compra) − Call K2 (venta) − Put K1 (venta) − c × (suma de las cuatro primas)
TNA = ((K2 − K1) / hoy − 1) × 365 / días
Cajas disponibles = la menor cantidad entre las cuatro puntas que usás`}</Formula>
        <p>
          Una caja es un préstamo sintético: mostramos solo las que dan entre la mitad y el doble de la tasa de caución al plazo más parecido (sin caución, entre 5 % y 150 % TNA). Fuera de esa banda son puntas sueltas de bases
          lejanas. No incluye los costos del ejercicio.
        </p>
        <p>
          <strong>Calculadora de estrategias.</strong> Cada pata es una compra o venta de un call, un put o la acción. Hoy pagás Σ (± precio × acciones) + c × Σ (precio × acciones). Al vencimiento, un call vale máx(0, S − K) y un
          put, máx(0, K − S). El resultado es lineal entre bases: la ganancia y la pérdida máximas salen de mirarlo en 0, en cada base y en la pendiente después de la última base (si sigue subiendo o bajando, no tiene techo o piso).
          Los puntos de equilibrio salen de interpolar entre bases. La curva de hoy valúa cada opción con Black-Scholes y su volatilidad implícita.
        </p>
        <p>
          <strong>Sonrisa de volatilidad.</strong> La volatilidad implícita de los puts por debajo del precio y de los calls por encima: las que todavía no tienen valor intrínseco, donde el modelo europeo es más confiable.
        </p>
        <p>
          <strong>Historial y alertas.</strong> data912 no publica la historia de las opciones locales: guardamos una foto de cada serie (compra, venta, último y volumen) cada día hábil a las 19 h, desde el 18/11/2026. La prima
          de cada día es el punto medio de las puntas o, si no había, el último si operó. Las alertas de una prima miran ese mismo precio.
        </p>
      </>
    ),
  },
  {
    id: "simulador",
    titulo: "Simulador",
    contenido: (
      <p>
        Para cada tipo de inversión tomamos la mejor opción disponible para el plazo elegido y calculamos la ganancia en pesos. El resultado real descuenta la inflación del escenario elegido: REM (la mediana del Relevamiento de
        Expectativas de Mercado del BCRA), baja (REM − 0,5 pp por mes) o alta (REM + 1 pp por mes).
      </p>
    ),
  },
  {
    id: "dolar",
    titulo: "Dólar",
    contenido: (
      <>
        <Formula>{`Spread = (precio al que comprás − precio al que vendés) / precio al que vendés
Costo de USD 1.000 = 1.000 × precio final con comisiones
Brecha = tipo de cambio / oficial − 1`}</Formula>
        <ul>
          <li>Excluimos cotizaciones de bancos con más de {pais.frescura.proveedorMaxHoras} horas y de exchanges con más de {pais.frescura.criptoMaxMin} minutos.</li>
          <li>Excluimos precios que se alejan más de {pais.bandas.desvioDolar * 100} % de la mediana, puntas cruzadas y spreads absurdos.</li>
          <li>Los precios P2P y el MEP vía broker se muestran aparte, como “condiciones especiales”.</li>
          <li>La normativa cambiaria cambia seguido: verificala antes de operar (revisión: {pais.normativa.revisado.split("-").reverse().join("/")}).</li>
        </ul>
      </>
    ),
  },
  {
    id: "bonos",
    titulo: "Bonos en dólares",
    contenido: (
      <>
        <p>Usamos el precio de la especie en dólares MEP (terminada en D), por 100 nominales originales, que en BYMA incluye el cupón corrido. Los flujos salen de los prospectos del canje 2020.</p>
        <Formula>{`TIR: resolver P = Σ flujo_i / (1 + TIR)^(t_i)   (t_i en años, actual/365, desde la liquidación)
Duration (Macaulay) = Σ t_i × VP(flujo_i) / P
Valor técnico = valor residual + intereses corridos
Paridad = P / valor técnico`}</Formula>
        <p>La TIR se resuelve con Newton-Raphson y bisección de respaldo. La curva de cada ley es un ajuste logarítmico de la TIR contra la duration.</p>
      </>
    ),
  },
  {
    id: "cedears",
    titulo: "CEDEARs",
    contenido: <Formula>{`MEP implícito = precio en pesos / precio en dólares (especie D)
CCL implícito = precio en pesos / precio de la especie C`}</Formula>,
  },
  {
    id: "inversores",
    titulo: "Carteras de grandes inversores",
    contenido: (
      <>
        <p>
          Salen del formulario 13F que los administradores de fondos de EE.UU. con más de US$ 100 millones presentan a la SEC cada trimestre, hasta 45 días después del cierre.
          Leemos los últimos cinco informes de cada fondo en EDGAR y, si hay una enmienda, usamos la versión que la reemplaza (o le sumamos las posiciones que agrega). Contamos solo
          acciones y ETF comprados: el 13F no incluye bonos, acciones que cotizan solo en BYMA, ventas en corto ni opciones (las opciones que informan, las dejamos afuera).
        </p>
        <p>
          El peso de cada posición es su valor sobre el total informado. Un movimiento compara la cantidad de acciones contra el informe anterior: nueva, aumentó o redujo (si
          cambió 2 % o más) o vendió todo. El código de cada acción (CUSIP) se pasa a ticker con OpenFIGI.
        </p>
        <p>
          Además de la lista que elegimos, cada trimestre se suman solos los fondos que más tienen en acciones argentinas (al menos US$ 10 millones y el 3 % de su cartera), según el
          conjunto de datos de 13F que publica la SEC. Información pública: no es una recomendación de inversión.
        </p>
      </>
    ),
  },
  {
    id: "merval",
    titulo: "Merval y actualización de los precios",
    contenido: (
      <>
        <p>
          El Merval de la solapa Acciones es el MSCI Merval: desde el 19 de octubre de 2026 lo calcula MSCI (antes era el S&amp;P Merval), con una base de 100.000 puntos al
          16 de octubre de 2026. Puntos, variación del día en pesos y en dólares y recorrido de la rueda, de Yahoo Finance; la variación es contra el cierre de la rueda anterior.
        </p>
        <p>
          Con el sitio abierto, Mercados, Dólar, LECAPs y las fichas piden los precios nuevos cada 15 segundos, sin recargar la página. Cuando un precio cambia, se marca un segundo
          en verde si subió o en rojo si bajó. Cada fuente tiene su propio ritmo: data912 renueva sus precios cada 30 segundos (BYMA, con demora), y el dólar y las tasas, cuando
          los publica cada fuente.
        </p>
      </>
    ),
  },
  {
    id: "activo",
    titulo: "Ficha de cada activo",
    contenido: (
      <>
        <p>
          Precio, rango del día y volumen: data912 (BYMA con demora). La serie arranca en el último salto de más de 55 % en un día (cambio de ratio de un CEDEAR o split no
          ajustado), igual que en la cartera. La descripción de cada empresa sale de Wikipedia en castellano: del artículo que verificamos a mano para cada ticker o, si no está en nuestra
          lista, del que Wikidata asocia a la empresa de ese ticker. Si no hay artículo en castellano, armamos una línea con los datos de Wikidata
          (industria, sede, fundación, bolsa). Sede, fundación, empleados y sitio web también salen de Wikidata. Los ETF los describimos nosotros. Noticias: las de nuestros medios que nombran al activo, más una búsqueda en Google Noticias en castellano y, para las empresas de EE.UU. y las argentinas con ADR, en inglés (CNBC, CNN, Reuters, Bloomberg y otros), con el nombre del activo y contexto (“Apple” stock). Sacamos las páginas de cotización, los gráficos y las notas automáticas sobre compras de fondos, y unimos la misma noticia publicada en varios medios. Si hay menos de cuatro que lo nombren, completamos con las del mercado que lo mueve (Wall Street, el Merval, el riesgo país, las tasas en pesos o cripto), en un bloque aparte. Bonos: precio de la especie D
          y flujos del prospecto del canje 2020. LECAPs: no hay historia de precios en nuestra fuente, por eso la ficha muestra la curva del día. Cripto: el precio en pesos es la
          mediana entre exchanges (CriptoYa); el precio en dólares de BTC y ETH es el de Binance, porque el promedio en dólares de los exchanges locales trae sobreprecio.
        </p>
        <Formula>{`Rendimiento = último cierre / cierre en o antes de la fecha − 1     (1 semana, 1 mes, 3 meses, en el año, 1 año, 5 años)
En dólares = cada cierre / dólar MEP de ese día (o el último anterior)
Volatilidad anual = desvío muestral de ln(P_t / P_t−1) en las últimas 252 ruedas × √252
Máxima caída = peor P_t / máximo previo − 1, en el último año
Rango de 52 semanas = mínimo y máximo del día del último año
Prima del CEDEAR = dólar implícito (MEP) / dólar MEP − 1
Bonos: rendimiento corriente = cupón anual de hoy × capital que queda / precio
LECAPs: ganancia del plazo = valor final / precio − 1; contra la inflación = (1 + ganancia) / (1 + inflación esperada) − 1
  inflación esperada = Π (1 + REM del mes)^(días del plazo en ese mes / días del mes) − 1
Cripto: volatilidad anualizada con 365 días (opera todos los días); BTC y ETH en pesos = precio en Binance × dólar cripto del día`}</Formula>
      </>
    ),
  },
  {
    id: "balances",
    titulo: "Balances y resultados de las empresas",
    contenido: (
      <>
        <p>
          <strong>Acciones argentinas: de la CNV.</strong> Salen del formulario de estados contables que cada empresa presenta en la Autopista de Información Financiera de la CNV, con un
          código fijo para cada rubro (total del activo, ingresos, ganancia del período, flujo de las operaciones, EBITDA…). Usamos el balance consolidado si la empresa lo presenta y, si
          corrigió uno, la versión más nueva. La unidad (miles o millones de pesos) sale del propio formulario.
        </p>
        <Formula>{`Cada balance, en dólares = monto en pesos / dólar oficial mayorista del día de cierre
Trimestre = (acumulado − acumulado anterior × IPC del cierre / IPC del cierre anterior) / dólar del cierre
  (los resultados vienen acumulados en el ejercicio y cada balance está en pesos de su propia fecha)
Cuarto trimestre = ejercicio − nueve meses, de la misma forma
Amortizaciones = EBITDA − EBIT   (los dos vienen calculados en el formulario)
Precio de una acción en dólares = precio de hoy en BYMA / dólar oficial mayorista de hoy`}</Formula>
        <p>
          Pasamos todo a dólares para poder comparar balances de distintas fechas: en pesos, cada uno está expresado en moneda de su propia fecha (ajuste por inflación), y algunas
          empresas llevan su contabilidad en dólares y la convierten a pesos para presentarla. Si la CNV no responde, usamos la SEC (las que tienen ADR, con atraso).
        </p>
        <p>
          <strong>CEDEARs: de la SEC.</strong> Salen de lo que cada empresa presenta ante la SEC de Estados Unidos (EDGAR, en formato XBRL): las de EE.UU. con el 10-K (anual) y el 10-Q
          (trimestral), las extranjeras con el 20-F y el 6-K. Los ETF no tienen esta sección. Cada concepto
          (ingresos, ganancia, flujo de caja) se busca entre los nombres que usan las normas contables de EE.UU. y las internacionales (IFRS). Si un ejercicio aparece en varios balances,
          usamos el más nuevo (las correcciones). Mostramos los ejercicios que traen los dos últimos balances anuales: más atrás aparecen cifras de antes de fusiones o reestructuraciones.
        </p>
        <Formula>{`Trimestres: los resultados vienen por trimestre; el flujo de efectivo, acumulado en el año (3, 6, 9 y 12 meses)
  trimestre = acumulado − acumulado anterior del mismo ejercicio; cuarto trimestre = ejercicio − nueve meses
Últimos 12 meses = suma de los últimos 4 trimestres seguidos    (si no hay, el último ejercicio)
Crecimiento anual = ejercicio / ejercicio anterior − 1         (los dos del mismo balance)
Interanual = último trimestre / mismo trimestre del año anterior − 1
Ganancia bruta = ingresos − costo de ventas (si no la informa)    EBITDA = ganancia operativa + amortizaciones
Márgenes = ganancia bruta, operativa, EBITDA o neta / ingresos (12 meses)
Flujo de caja libre = flujo de las operaciones − inversión en bienes de uso
ROE = ganancia de 12 meses / patrimonio       ROA = ganancia de 12 meses / activo total   (del último balance)
Liquidez corriente = activo corriente / pasivo corriente     Prueba ácida = (activo corriente − inventarios) / pasivo corriente
Deuda financiera = deuda de largo plazo con su porción corriente + papeles comerciales   (IFRS: préstamos + bonos)
Deuda neta = deuda financiera − caja − inversiones de corto plazo      Deuda neta / EBITDA (12 meses)
Cobertura de intereses = ganancia operativa / intereses (12 meses)     Payout = dividendos pagados / ganancia neta
Capitalización = precio de una acción en EE.UU. × acciones (promedio diluido del último período)
Valor de empresa = capitalización + deuda neta
PER = capitalización / ganancia de 12 meses     Precio/ventas = capitalización / ingresos de 12 meses
Precio/valor libro = capitalización / patrimonio     Valor de empresa / EBITDA
Rendimiento del dividendo = dividendo por acción del último ejercicio / precio
Rendimiento del flujo libre = flujo de caja libre de 12 meses / capitalización`}</Formula>
        <ul>
          <li>Los múltiplos (PER y demás) aparecen para empresas de EE.UU. con balances en dólares y para las acciones argentinas con balances de la CNV (con la cantidad de acciones que informa el formulario). No para los ADR: un papel puede representar varias acciones.</li>
          <li>
            Balances en pesos: están ajustados por inflación a la fecha de cada balance, así que solo comparamos ejercicios que vienen en el mismo balance y no mostramos trimestres. Las
            empresas argentinas presentan sus balances más nuevos en la CNV antes que en la SEC: si el último en la SEC tiene más de 15 meses, lo avisamos.
          </li>
          <li>Bancos: no informan &quot;ingresos&quot; como el resto, así que mostramos la ganancia, el patrimonio y la rentabilidad, sin flujo de caja libre, EBITDA ni deuda neta (su caja es la plata de los depositantes).</li>
        </ul>
      </>
    ),
  },
  {
    id: "cartera",
    titulo: "Tu cartera",
    contenido: (
      <>
        <p>Las posiciones se derivan de tus movimientos, con costo promedio ponderado. Se guardan solo en tu navegador.</p>
        <Formula>{`TWR = Π (V_t / (V_{t−1} + aportes_t)) − 1          (rendimiento sin el efecto de tus aportes)
XIRR: resolver Σ flujo_i / (1 + r)^((d_i − d_0) / 365) = 0   (rendimiento de tu plata)`}</Formula>
        <ul>
          <li>Valuamos semanalmente con precios históricos de data912 (CEDEARs, acciones y bonos) y Binance (BTC y ETH). Si una serie tiene un salto de más del 55 % en un día (cambio de ratio), usamos solo los datos posteriores.</li>
          <li>Las letras sin histórico se valúan a la tasa de compra, del precio pagado al valor final.</li>
          <li>Billeteras y fondos cargados con una TNA se valúan con esa tasa, con capitalización diaria (es una estimación).</li>
          <li>En dólares: dividimos por el MEP de cada fecha. En pesos constantes: por el IPC (el último mes publicado se proyecta hasta hoy).</li>
        </ul>
      </>
    ),
  },
  {
    id: "interes-compuesto",
    titulo: "Interés compuesto",
    contenido: (
      <Formula>{`Tasa mensual i = (1 + TEA)^(1/12) − 1
Valor futuro = C0 × (1 + i)^n + A × ((1 + i)^n − 1) / i × (1 + i × k)    (k = 1 si aportás al inicio del mes)
Aporte para una meta = (meta − C0 × (1 + i)^n) × i / (((1 + i)^n − 1) × (1 + i × k))`}</Formula>
    ),
  },
  {
    id: "metas",
    titulo: "Metas de ahorro",
    contenido: (
      <>
        <Formula>{`Valor de cada instrumento: entre movimiento y movimiento crece a su TEA, valor × (1 + TEA)^(días / 365)
  (la TEA es la del día en que pusiste la plata; un retiro resta; "Actualizar valores" lo reemplaza por el valor real)
Tasa mensual i = (1 + TEA)^(1/12) − 1
  i_saldo: TEA promedio de lo que ya tenés, ponderada por valor
  i_plan: la mejor opción sin plazo de hoy, o la que elijas, para lo que pongas de acá en adelante
Objetivo en el mes n = objetivo de hoy × (1 + π)^n     (π: inflación mensual esperada del REM; solo metas en pesos)
Aporte por mes = (objetivo en la fecha − saldo × (1 + i_saldo)^n) × i_plan / ((1 + i_plan)^n − 1)     (aportes al final de cada mes)
Meses para llegar: se simula mes a mes hasta que lo invertido más lo nuevo supera el objetivo de ese mes
Rendimiento real = lo que tenés − Σ aporte × IPC de hoy / IPC del día del aporte     (IPC del INDEC; después del último dato, REM)
Equivalencia en dólares = monto / dólar MEP de hoy (venta)`}</Formula>
        <p className="mt-3">
          Los valores son estimados: los fondos y billeteras cambian su tasa todos los días, así que conviene corregirlos de vez en cuando con lo que muestra tu app. &quot;Según el plan&quot;
          es lo que tendrías hoy si hubieras puesto lo que planeaste todos los meses, a la tasa del plan. La comparación con la mejor opción de hoy solo aparece si la diferencia es de al menos un
          punto. &quot;¿Dónde rinde más lo que pongas cada mes?&quot; recalcula el plan con la mejor opción de cada tipo y ordena solo por tasa, sin mirar si es afiliado. Los
          vencimientos salen de la fecha en que pusiste la plata más el plazo de la opción. Las metas en dólares no se ajustan por inflación y, salvo que elijas otro, suponen que los dólares no rinden.
        </p>
      </>
    ),
  },
  {
    id: "comparar",
    titulo: "Comparar activos",
    contenido: (
      <>
        <p>
          Hasta 5 activos: CEDEARs y acciones (data912, con los cambios de ratio ajustados), bonos en dólares (especie D, data912), Bitcoin y Ether (Binance). Si data912 no
          publica la historia de un CEDEAR, se usa la de la acción en Estados Unidos (Yahoo Finance). Las LECAPs y los dólares cripto no tienen una historia de precios que sirva.
          Los datos son diarios el último año y medio y semanales antes.
        </p>
        <Formula>{`En dólares = precio en pesos / dólar MEP de ese día (o el último anterior)
En pesos = precio en dólares × dólar MEP de ese día
Inicio = el comienzo del período elegido o, si la historia de algún activo arranca después, ese día (todos arrancan juntos)
Variación de cada línea = precio / precio del inicio − 1
Máxima caída = peor precio / máximo anterior − 1, dentro del período
Volatilidad = desvío de ln(P_t / P_t−1) en el último año × √252 (√365 para cripto)
Bonos, rendimiento total: el día de corte (hábil anterior al pago), cantidad × (1 + pago / precio de ese día)
  precio ajustado = precio × cantidad / cantidad de hoy`}</Formula>
        <p className="mt-3">
          En los bonos, el día que dejan de cotizar con el pago el precio cae lo que pagan (en Bonares y Globales, cupón y amortización: alrededor de 8 % dos veces por año). Para que
          esa caída no parezca una pérdida, cada pago (del cronograma del prospecto) se reinvierte en el mismo bono ese día; el precio de hoy no cambia. Las acciones y CEDEARs, sin
          dividendos. Los números de cada empresa (PER, margen, rentabilidad, crecimiento) salen de sus balances, como en su ficha.
        </p>
      </>
    ),
  },
  {
    id: "comisiones",
    titulo: "Comisiones de los brokers",
    contenido: (
      <>
        <p>
          De los tarifarios oficiales que publica cada broker (Cocos, IOL, Balanz, Bull Market y PPI), con la fecha en que los leímos. Se toma lo que paga una persona que opera
          online y recién abre la cuenta: con más volumen, algunos cobran menos. Si el tarifario dice &quot;hasta&quot;, se usa ese máximo. Allaria, Adcap y SBS no están porque
          no encontramos su tarifario publicado.
        </p>
        <Formula>{`Lo que te cobra = monto × comisión × (1 + IVA si corresponde)
IVA = 21 % sobre la comisión, en acciones, CEDEARs y opciones (los títulos públicos y las letras están exentos)
Letras con comisión anual (Cocos): comisión × días que le quedan / 365
Orden: del que menos cobra al que más; a igual costo, por nombre`}</Formula>
        <p className="mt-3">
          Los derechos de mercado de BYMA se suman aparte y son iguales en todos los brokers, así que no cambian el orden: alrededor de 0,05 % a 0,07 % en acciones y CEDEARs, 0,01 % en
          bonos, 0,001 % en letras y 0,2 % en opciones. Nadie paga por estar arriba.
        </p>
      </>
    ),
  },
  {
    id: "que-hubiera",
    titulo: "¿Qué hubiera pasado si…?",
    contenido: (
      <>
        <Formula>{`Dólar, acción, CEDEAR o bitcoin = monto × precio de hoy / precio de esa fecha   (el último dato en o antes de cada fecha)
Plazo fijo = Π (1 + TNA del momento × días / 365), renovado cada 30 días   (tasa promedio de depósitos a 30 días)
Para no perder = monto × IPC de hoy / IPC de esa fecha   (el mes en curso se proyecta con el REM)
Contra la inflación = valor de hoy / lo que necesitabas para no perder − 1`}</Formula>
        <p className="mt-3">
          Los dólares son MEP y blue (ArgentinaDatos); las acciones y CEDEARs, su precio en pesos en BYMA (data912), cortado en el último cambio de ratio; bitcoin, su precio en
          dólares en Binance por el dólar cripto de cada día. Sin comisiones ni impuestos. Ordena solo por cuánto tendrías hoy: son rendimientos pasados, no una recomendación.
        </p>
      </>
    ),
  },
  {
    id: "jubilacion",
    titulo: "Jubilación",
    contenido: (
      <p>
        Capital necesario = gasto anual / tasa de retiro. Con la regla del 4 %, para gastar US$ 12.000 por año hacen falta US$ 300.000. Es una referencia histórica de carteras diversificadas de EE.UU., no una garantía.
        Calculamos en dólares y con rendimiento real (por encima de la inflación) para que la meta no se achique sola.
      </p>
    ),
  },
  {
    id: "inflacion",
    titulo: "Inflación",
    contenido: <Formula>{`Inflación acumulada = Π (1 + inflación mensual) − 1
Monto actualizado = monto × índice destino / índice origen   (índice = producto acumulado del IPC)`}</Formula>,
  },
  {
    id: "calendario",
    titulo: "Próximos eventos",
    contenido: <p>Solo mostramos eventos con fecha cierta: vencimientos de letras, pagos de los bonos soberanos y feriados. El calendario completo (IPC del INDEC, licitaciones del Tesoro) llega en la próxima versión.</p>,
  },
];

export default function Metodologia() {
  return (
    <>
      <PageHeader titulo="Metodología" bajada={`De dónde sale cada número que ves en ${site.name}, cómo lo calculamos y cómo ordenamos los rankings. Si encontrás un error, escribinos.`} />
      <Documento secciones={secciones} />
    </>
  );
}
