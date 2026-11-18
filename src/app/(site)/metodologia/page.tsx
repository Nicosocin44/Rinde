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
    id: "activo",
    titulo: "Ficha de cada activo",
    contenido: (
      <>
        <p>
          Precio, rango del día y volumen: data912 (BYMA con demora). La serie arranca en el último salto de más de 55 % en un día (cambio de ratio de un CEDEAR o split no
          ajustado), igual que en la cartera. La descripción de cada empresa sale de Wikipedia en castellano, del artículo que verificamos a mano para cada ticker; los ETF los
          describimos nosotros. Las noticias son las de la sección Noticias que nombran a la empresa (en bonos, letras y cripto, las de su mercado). Bonos: precio de la especie D
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
