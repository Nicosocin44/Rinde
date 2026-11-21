import { BONOS_USD } from "@data/ar/bonos-usd";
import { LECAPS } from "@data/ar/lecaps";
import { CEDEARS } from "@data/ar/mercados";
import { armarMes, lunesDelMes, type MesCalendario, type MesISO } from "@/lib/calendario/mes";
import { armarSemana, diasHabiles, empresasDelDia, eventoEEUU, eventoFed, eventoIndec, type EventoCalendario, type SemanaCalendario } from "@/lib/calendario/semana";
import { cronograma } from "@/lib/calculos";
import * as ad from "../adapters/argentinadatos";
import * as fed from "../adapters/fed";
import * as indec from "../adapters/indec";
import * as nasdaq from "../adapters/nasdaq";
import { conRespaldo } from "../cache";
import { FUENTES } from "../types";
import { cargarOpciones } from "./opciones";

const valor = <T,>(r: PromiseSettledResult<T>, porDefecto: T): T => (r.status === "fulfilled" ? r.value : porDefecto);

/**
 * La semana de Mercados: datos del INDEC, de EE.UU. y la Fed, resultados de empresas (CEDEARs y argentinas), pagos de
 * bonos, vencimientos de LECAPs y de opciones, y feriados. Cada fuente es independiente: si una falla, falta lo suyo.
 */
export async function cargarSemana(lunes: string) {
  const fuentes = [FUENTES.indec, FUENTES.fed, FUENTES.nasdaq, FUENTES.argentinadatos, FUENTES.data912];
  return conRespaldo<SemanaCalendario>(`semana-${lunes}`, fuentes, async () => {
    const dias = diasHabiles(lunes);
    const meses = [...new Set(dias.map((d) => d.slice(0, 7)))];
    const anios = [...new Set(dias.map((d) => Number(d.slice(0, 4))))];
    const [indecR, fedR, feriadosR, opcionesR, ...porDia] = await Promise.allSettled([
      Promise.all(meses.map((m) => indec.calendarioDelMes(Number(m.slice(0, 4)), Number(m.slice(5, 7))))).then((x) => x.flat()),
      fed.reunionesFomc(),
      Promise.all(anios.map((a) => ad.feriados(a))).then((x) => x.flat()),
      cargarOpciones("GGAL"),
      ...dias.flatMap((d) => [nasdaq.eventosEconomicos(d), nasdaq.resultadosDelDia(d)]),
    ]);
    const enSemana = (fecha: string) => fecha >= dias[0]! && fecha <= dias[4]!;
    const eventos: EventoCalendario[] = [];

    for (const i of valor(indecR, [])) if (enSemana(i.fecha)) eventos.push(...[eventoIndec(i)].filter((e): e is EventoCalendario => !!e));
    for (const f of valor(fedR, [])) if (enSemana(f)) eventos.push(eventoFed(f));
    for (const f of valor(feriadosR, [])) if (enSemana(f.fecha)) eventos.push({ id: `feriado-${f.fecha}`, fecha: f.fecha, tipo: "feriado", pais: "AR", etiqueta: "Feriado", detalle: `${f.nombre ?? "Feriado"} · no hay rueda en Argentina` });

    const opciones = valor(opcionesR, null);
    if (opciones?.ok) for (const v of opciones.data.vencimientos) if (enSemana(v.fecha)) eventos.push({ id: `opc-${v.fecha}`, fecha: v.fecha, tipo: "opciones", pais: "AR", etiqueta: "Opciones GGAL", detalle: "Vencen las opciones de GGAL de este mes", href: "/mercados/opciones" });

    // Pagos de bonos en dólares: todos los que pagan el mismo día, juntos.
    const pagos = new Map<string, string[]>();
    for (const b of BONOS_USD) for (const f of cronograma(b)) if (enSemana(f.fecha)) pagos.set(f.fecha, [...(pagos.get(f.fecha) ?? []), b.ticker]);
    for (const [fecha, tickers] of pagos) eventos.push({ id: `bonos-${fecha}`, fecha, tipo: "bonos", pais: "AR", etiqueta: "Pago bonos", detalle: `Pagan ${tickers.join(", ")}`, href: "/mercados/bonos" });

    for (const l of LECAPS) if (enSemana(l.vencimiento)) eventos.push({ id: `lecap-${l.ticker}`, fecha: l.vencimiento, tipo: "lecap", pais: "AR", etiqueta: `Vence ${l.ticker}`, detalle: `Vence la ${l.tipo} ${l.ticker}`, href: `/activo/${l.ticker}` });

    const cedears = new Set(Object.keys(CEDEARS));
    const empresasPorDia: Record<string, ReturnType<typeof empresasDelDia>> = {};
    dias.forEach((d, k) => {
      for (const e of valor(porDia[2 * k] as PromiseSettledResult<nasdaq.EventoNasdaq[]>, [])) {
        const ev = eventoEEUU(e);
        if (ev) eventos.push(ev);
      }
      empresasPorDia[d] = empresasDelDia(d, valor(porDia[2 * k + 1] as PromiseSettledResult<nasdaq.ResultadoNasdaq[]>, []), cedears);
    });

    const fallaron = [indecR, fedR, ...porDia].filter((r) => r.status === "rejected").length;
    if (fallaron === 2 + porDia.length) throw new Error("Ninguna fuente del calendario respondió");
    return { data: armarSemana(lunes, eventos, empresasPorDia), asOf: new Date().toISOString(), status: fallaron > 0 ? "stale" : "close" };
  });
}

/**
 * El mes del calendario (punto 26): las semanas que lo cubren, cada una con sus fuentes. Si una semana no se puede
 * traer, queda vacía y el mes se muestra igual, marcado como dato viejo; si no se puede ninguna, falla.
 */
export async function cargarMes(mes: MesISO) {
  const fuentes = [FUENTES.indec, FUENTES.fed, FUENTES.nasdaq, FUENTES.argentinadatos, FUENTES.data912];
  return conRespaldo<MesCalendario>(`mes-${mes}`, fuentes, async () => {
    const lunes = lunesDelMes(mes);
    const semanas = await Promise.all(lunes.map((l) => cargarSemana(l)));
    if (semanas.every((s) => !s.ok)) throw new Error("Ninguna semana del mes respondió");
    const viejo = semanas.some((s) => !s.ok || s.status === "stale");
    return {
      data: armarMes(
        mes,
        semanas.map((s, k) => (s.ok ? s.data : armarSemana(lunes[k]!, [], {}))),
      ),
      asOf: new Date().toISOString(),
      status: viejo ? "stale" : "close",
    };
  });
}
