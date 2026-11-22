"""
Carteras de grandes inversores (punto 28), desde los formularios 13F de la SEC.

Qué hace:
1. Descubre los fondos que más tienen en acciones argentinas: baja el último data set trimestral de 13F de la SEC
   (un zip de ~100 MB con todos los informes) y suma, por fondo, lo que tiene en los activos de
   data/inversores/argentinos.json. Solo lo vuelve a bajar cuando la SEC publica uno nuevo.
2. Para la lista curada (data/inversores/lista.json) y los descubiertos, lee de EDGAR sus últimos 5 informes 13F
   (con las enmiendas aplicadas), arma la cartera de cada trimestre y los movimientos contra el anterior.
3. Pasa cada CUSIP a ticker con OpenFIGI (gratis, sin cuenta) y guarda la traducción en data/inversores/cusips.json.
4. Baja el logo de los tickers que todavía no tienen (Financial Modeling Prep, el mismo de scripts/logos_extra.py).
5. Escribe data/inversores/carteras.json, que lee la página /mercados/inversores.

Uso: python scripts/inversores.py            (todo)
     python scripts/inversores.py --sin-zip  (no busca un data set nuevo: usa los descubiertos de la última vez)

La SEC pide un User-Agent con contacto y como mucho 10 pedidos por segundo. OpenFIGI sin cuenta: 25 pedidos por
minuto, de a 10 CUSIP.
"""

from __future__ import annotations

import csv
import io
import json
import re
import sys
import tempfile
import time
import unicodedata
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "data" / "inversores"
UA = "Rinde hola@rinde.example"

PERIODOS = 5  # trimestres que se leen (se muestran 4 con movimientos)
POSICIONES = 25  # posiciones que se guardan por trimestre (el resto se agrupa)
MOVIMIENTOS = 12  # por tipo y trimestre
DESCUBRIR = 10  # fondos que se suman solos, por monto y por porcentaje en Argentina
MINIMO_ARG = 10e6  # para entrar al ranking: al menos US$ 10 M en Argentina…
MINIMO_PESO = 0.03  # …y al menos el 3 % de su cartera (así quedan afuera los bancos enormes)
UMBRAL = 0.02  # un cambio de menos del 2 % en la cantidad de acciones cuenta como "sin cambios"
# Logos de FMP revisados a ojo el 22/11/2026 que no sirven (una foto, uno vacío): quedan con el monograma.
NO_USAR = {"BVN", "NUVB", "KNX"}


# ───────────────────────── Red ─────────────────────────

_ultimo_sec = 0.0


def pedir(url: str, datos: bytes | None = None, encabezados: dict | None = None, intentos: int = 3) -> bytes:
    global _ultimo_sec
    if "sec.gov" in url:
        espera = 0.12 - (time.time() - _ultimo_sec)
        if espera > 0:
            time.sleep(espera)
        _ultimo_sec = time.time()
    h = {"User-Agent": UA, "Accept-Encoding": "identity", **(encabezados or {})}
    for k in range(intentos):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=datos, headers=h), timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and k < intentos - 1:
                time.sleep(10 * (k + 1))
                continue
            raise
        except urllib.error.URLError:
            if k < intentos - 1:
                time.sleep(3)
                continue
            raise
    raise RuntimeError("sin respuesta")


def leer_json(p: Path, defecto):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else defecto


def escribir_json(p: Path, datos) -> None:
    p.write_text(json.dumps(datos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")


def slug(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"\b(llc|lp|l\.p\.|ltd|limited|inc|s\.a\.|sa|llp|co|corp|p\.j\.s\.c|plc|group)\b", " ", t)
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:40]


def nombre_lindo(texto: str) -> str:
    """'PING CAPITAL MANAGEMENT, INC.' → 'Ping Capital Management'."""
    t = re.sub(r"[,]?\s+(LLC|L\.?P\.?|LTDA\.?|LTD\.?|LIMITED|INC\.?|LLP|S\.A\.?|CO\.?|P\.J\.S\.C|PLC)\b\.?", "", texto, flags=re.I)
    t = re.sub(r"\s*/\s*[A-Z]{2}\s*$", "", t).strip(" ,.")
    return " ".join(p if (len(p) <= 3 and p.isupper() and p not in {"THE", "AND", "ONE"}) else p.capitalize() for p in t.split()) if t.isupper() else t


# ───────────────────────── 1. Descubrir (data set trimestral) ─────────────────────────


def ultimo_dataset() -> str:
    html = pedir("https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets").decode("utf-8", "replace")
    enlaces = re.findall(r'href="([^"]+_form13f\.zip)"', html)
    if not enlaces:
        raise RuntimeError("No encontré el data set de 13F en la página de la SEC")
    return "https://www.sec.gov" + enlaces[0] if enlaces[0].startswith("/") else enlaces[0]


def descubrir(argentinos: dict[str, dict], previo: dict) -> dict:
    url = ultimo_dataset()
    if previo.get("fuente") == url:
        print("Data set sin cambios:", url)
        return previo
    print("Bajando", url)
    with tempfile.TemporaryDirectory() as tmp:
        zpath = Path(tmp) / "13f.zip"
        zpath.write_bytes(pedir(url))
        z = zipfile.ZipFile(zpath)

        def tabla(n):
            with z.open(n) as f:
                yield from csv.DictReader(io.TextIOWrapper(f, encoding="utf-8", errors="replace"), delimiter="\t")

        sub = {r["ACCESSION_NUMBER"]: r for r in tabla("SUBMISSION.tsv") if r.get("SUBMISSIONTYPE") in ("13F-HR", "13F-HR/A")}
        cov = {r["ACCESSION_NUMBER"]: r for r in tabla("COVERPAGE.tsv")}
        resumen = {r["ACCESSION_NUMBER"]: r for r in tabla("SUMMARYPAGE.tsv")}
        # Por fondo, el período más nuevo y, de ese período, la presentación más nueva que no sea un agregado.
        mejor: dict[str, str] = {}
        for acc, s in sub.items():
            c = cov.get(acc, {})
            if c.get("ISAMENDMENT") == "Y" and c.get("AMENDMENTTYPE") == "NEW HOLDINGS":
                continue
            fecha = datetime.strptime(s["PERIODOFREPORT"], "%d-%b-%Y")
            previo_acc = mejor.get(s["CIK"])
            if previo_acc:
                p = sub[previo_acc]
                fp = datetime.strptime(p["PERIODOFREPORT"], "%d-%b-%Y")
                if (fecha, s["FILING_DATE"]) <= (fp, p["FILING_DATE"]):
                    continue
            mejor[s["CIK"]] = acc
        validos = set(mejor.values())
        arg: dict[str, Counter] = defaultdict(Counter)
        for r in tabla("INFOTABLE.tsv"):
            if r["ACCESSION_NUMBER"] not in validos:
                continue
            a = argentinos.get(r["CUSIP"].upper())
            if not a or (r.get("PUTCALL") or "").strip() or (r.get("SSHPRNAMTTYPE") or "SH") != "SH":
                continue
            try:
                arg[r["ACCESSION_NUMBER"]][a["ticker"]] += float(r["VALUE"] or 0)
            except ValueError:
                pass
        z.close()  # en Windows, el zip abierto no deja borrar la carpeta temporal
    filas = []
    for acc, c in arg.items():
        total = float(resumen.get(acc, {}).get("TABLEVALUETOTAL") or 0)
        en_arg = sum(c.values())
        if total <= 0 or en_arg < MINIMO_ARG or en_arg / total < MINIMO_PESO:
            continue
        s = sub[acc]
        filas.append({"cik": int(s["CIK"]), "nombre": nombre_lindo(cov.get(acc, {}).get("FILINGMANAGER_NAME", s["CIK"])), "argentina": en_arg, "peso": en_arg / total})
    por_monto = sorted(filas, key=lambda f: -f["argentina"])[:DESCUBRIR]
    por_peso = sorted(filas, key=lambda f: -f["peso"])[:DESCUBRIR]
    elegidos = {f["cik"]: f for f in por_monto + por_peso}
    print(f"Descubiertos: {len(elegidos)} fondos con foco en Argentina")
    return {"fuente": url, "fondos": list(elegidos.values())}


# ───────────────────────── 2. Informes de cada fondo (EDGAR) ─────────────────────────


def sin_ns(tag: str) -> str:
    return tag.split("}", 1)[-1]


def hijos(e: ET.Element) -> dict[str, ET.Element]:
    return {sin_ns(c.tag): c for c in e}


def ciudad_de(d: dict) -> str | None:
    """La ciudad de la dirección comercial que el fondo informa a la SEC ("NEW YORK" → "Nueva York")."""
    c = ((d.get("addresses") or {}).get("business") or {}).get("city") or ""
    c = re.sub(r"\s+", " ", c).strip().title()
    return {"New York": "Nueva York", "London": "Londres", "Grand Cayman": "Islas Caimán", "George Town": "Islas Caimán", "Camana Bay, Grand Cayman": "Islas Caimán", "Abu Dhabi": "Abu Dabi", "Rio De Janeiro": "Río de Janeiro", "Sao Paulo": "San Pablo", "Geneva": "Ginebra", "Zurich": "Zúrich"}.get(c, c) or None


_ciudades: dict[int, str | None] = {}


def informes(cik: int) -> tuple[str, list[dict]]:
    d = json.loads(pedir(f"https://data.sec.gov/submissions/CIK{cik:010d}.json"))
    _ciudades[cik] = ciudad_de(d)
    r = d["filings"]["recent"]
    salida = [
        {"acc": r["accessionNumber"][i], "form": r["form"][i], "presentado": r["filingDate"][i], "periodo": r["reportDate"][i], "doc": r["primaryDocument"][i]}
        for i in range(len(r["form"]))
        if r["form"][i] in ("13F-HR", "13F-HR/A")
    ]
    return d["name"], salida


def archivos(cik: int, acc: str) -> list[str]:
    idx = json.loads(pedir(f"https://www.sec.gov/Archives/edgar/data/{cik}/{acc.replace('-', '')}/index.json"))
    return [i["name"] for i in idx["directory"]["item"]]


def tipo_enmienda(cik: int, acc: str, nombres: list[str]) -> str:
    """RESTATEMENT (reemplaza todo) o NEW HOLDINGS (agrega posiciones)."""
    doc = next((n for n in nombres if n.lower() == "primary_doc.xml"), None)
    if not doc:
        return "RESTATEMENT"
    xml = pedir(f"https://www.sec.gov/Archives/edgar/data/{cik}/{acc.replace('-', '')}/{doc}").decode("utf-8", "replace")
    m = re.search(r"<(?:\w+:)?amendmentType>\s*([^<]+)<", xml)
    return (m.group(1).strip().upper() if m else "RESTATEMENT")


def tabla_informe(cik: int, acc: str, nombres: list[str]) -> dict[str, dict]:
    """Posiciones del informe, por CUSIP: solo acciones (SH), sin opciones (put/call)."""
    xmls = [n for n in nombres if n.lower().endswith(".xml") and n.lower() != "primary_doc.xml"]
    if not xmls:
        return {}
    raiz = ET.fromstring(pedir(f"https://www.sec.gov/Archives/edgar/data/{cik}/{acc.replace('-', '')}/{xmls[0]}"))
    pos: dict[str, dict] = {}
    for fila in raiz:
        h = hijos(fila)
        if "cusip" not in h:
            continue
        if "putCall" in h and (h["putCall"].text or "").strip():
            continue
        cant = hijos(h["shrsOrPrnAmt"]) if "shrsOrPrnAmt" in h else {}
        if (cant.get("sshPrnamtType").text if "sshPrnamtType" in cant else "SH").strip().upper() != "SH":
            continue
        cusip = (h["cusip"].text or "").strip().upper()
        try:
            valor = float(h["value"].text or 0)
            acciones = float(cant["sshPrnamt"].text or 0) if "sshPrnamt" in cant else 0.0
        except (ValueError, KeyError):
            continue
        p = pos.setdefault(cusip, {"cusip": cusip, "emisor": (h["nameOfIssuer"].text or "").strip(), "valor": 0.0, "acciones": 0.0})
        p["valor"] += valor
        p["acciones"] += acciones
    return pos


def cartera_por_periodo(cik: int, lista: list[dict]) -> list[dict]:
    """Los últimos PERIODOS trimestres, con las enmiendas aplicadas (la más nueva manda)."""
    periodos = sorted({f["periodo"] for f in lista if f["periodo"]}, reverse=True)[:PERIODOS]
    salida = []
    for per in periodos:
        del_periodo = sorted([f for f in lista if f["periodo"] == per], key=lambda f: f["presentado"])
        originales = [f for f in del_periodo if f["form"] == "13F-HR"]
        base = originales[-1] if originales else None
        pos: dict[str, dict] = {}
        usado = None
        if base:
            pos = tabla_informe(cik, base["acc"], archivos(cik, base["acc"]))
            usado = base
        for e in [f for f in del_periodo if f["form"] == "13F-HR/A" and (not base or f["presentado"] >= base["presentado"])]:
            nombres = archivos(cik, e["acc"])
            tipo = tipo_enmienda(cik, e["acc"], nombres)
            nuevas = tabla_informe(cik, e["acc"], nombres)
            if not nuevas:
                continue
            if "NEW" in tipo:
                for c, p in nuevas.items():
                    q = pos.setdefault(c, {**p, "valor": 0.0, "acciones": 0.0})
                    q["valor"] += p["valor"]
                    q["acciones"] += p["acciones"]
            else:
                pos = nuevas
            usado = e
        if pos and usado:
            salida.append({"periodo": per, "presentado": usado["presentado"], "acc": usado["acc"], "posiciones": pos})
    return salida


# ───────────────────────── 3. CUSIP → ticker (OpenFIGI) ─────────────────────────


def traducir(cusips: set[str], cache: dict[str, dict]) -> None:
    # Los códigos que empiezan con una letra son CINS (emisores de afuera de EE.UU.: Chubb, Adecoagro…): OpenFIGI los
    # busca con otro tipo. Los que no se encontraron como CUSIP se reintentan una vez como CINS.
    faltan = sorted(c for c in cusips if c not in cache or (not cache[c].get("ticker") and c[:1].isalpha() and not cache[c].get("cins")))
    if not faltan:
        return
    print(f"OpenFIGI: {len(faltan)} CUSIP nuevos")
    for i in range(0, len(faltan), 10):
        lote = faltan[i : i + 10]
        cuerpo = json.dumps([{"idType": "ID_CINS" if c[:1].isalpha() else "ID_CUSIP", "idValue": c} for c in lote]).encode()
        try:
            r = json.loads(pedir("https://api.openfigi.com/v3/mapping", cuerpo, {"Content-Type": "application/json"}))
        except urllib.error.HTTPError as e:
            print("  OpenFIGI respondió", e.code)
            time.sleep(30)
            continue
        for c, res in zip(lote, r):
            datos = res.get("data") or []
            # Preferimos la cotización de EE.UU.; si no, la primera.
            d = next((x for x in datos if x.get("exchCode") == "US"), datos[0] if datos else None)
            cache[c] = {"ticker": (d or {}).get("ticker"), "nombre": (d or {}).get("name"), **({"cins": True} if c[:1].isalpha() else {})}
        time.sleep(2.6)  # 25 pedidos por minuto sin cuenta


# ───────────────────────── 4. Logos ─────────────────────────


def logos_faltantes(tickers: set[str]) -> list[str]:
    """Baja de FMP el logo de los tickers que no tienen; devuelve los que consiguió."""
    sys.path.insert(0, str(RAIZ / "scripts"))
    from logos import normalizar_manual  # noqa: E402

    hay = {f.stem for f in (RAIZ / "public" / "logos" / "activos").glob("*.png")}
    nuevos = []
    for t in sorted(tickers - hay - NO_USAR):
        if not re.fullmatch(r"[A-Z0-9.\-]{1,10}", t):
            continue
        try:
            datos = pedir(f"https://financialmodelingprep.com/image-stock/{t.replace('.', '-')}.png", encabezados={"User-Agent": "Mozilla/5.0"})
        except Exception:  # noqa: BLE001 (404: FMP no lo tiene; queda el monograma)
            continue
        fuente = RAIZ / "assets" / "logos-fuente" / "activos" / f"{t}.png"
        fuente.parent.mkdir(parents=True, exist_ok=True)
        fuente.write_bytes(datos)
        try:
            normalizar_manual(fuente, None).save(RAIZ / "public" / "logos" / "activos" / f"{t}.png", optimize=True)
            nuevos.append(t)
        except Exception:  # noqa: BLE001
            fuente.unlink(missing_ok=True)
    if nuevos:
        lista = sorted(f.stem for f in (RAIZ / "public" / "logos" / "activos").glob("*.png"))
        ts_path = RAIZ / "src" / "config" / "logos.ts"
        ts = ts_path.read_text(encoding="utf-8")
        nuevo = "export const LOGOS_ACTIVOS = new Set<string>([" + ", ".join(f'"{a}"' for a in lista) + "]);"
        ts = re.sub(r"export const LOGOS_ACTIVOS = new Set<string>\(\[.*?\]\);", lambda _: nuevo, ts, flags=re.S)
        ts_path.write_text(ts, encoding="utf-8", newline="\n")
    print(f"Logos nuevos: {len(nuevos)}")
    return nuevos


# ───────────────────────── 5. Armar ─────────────────────────


def armar(inversor: dict, periodos: list[dict], cusips: dict[str, dict], argentinos: dict[str, dict]) -> dict:
    def fila(p: dict, total: float) -> dict:
        a = argentinos.get(p["cusip"])
        figi = cusips.get(p["cusip"]) or {}
        nombre = a["nombre"] if a else (figi.get("nombre") or p["emisor"])
        return {
            "cusip": p["cusip"],
            # Ticker en EE.UU. (el del 13F); para las argentinas, además el de BYMA (su ficha y su logo).
            "ticker": a["ticker"] if a else figi.get("ticker"),
            "byma": a["byma"] if a else None,
            "nombre": nombre.title() if nombre.isupper() and not a else nombre,
            "valor": round(p["valor"]),
            "peso": p["valor"] / total if total else 0,
            "argentino": bool(a),
        }

    trimestres = []
    for k, per in enumerate(periodos[: PERIODOS - 1]):
        pos = per["posiciones"]
        total = sum(p["valor"] for p in pos.values())
        orden = sorted(pos.values(), key=lambda p: -p["valor"])
        top = orden[:POSICIONES]
        arg = [p for p in orden if p["cusip"] in argentinos]
        resto = orden[POSICIONES:]
        anterior = periodos[k + 1]["posiciones"] if k + 1 < len(periodos) else None
        movimientos: dict[str, list] = {"nueva": [], "aumento": [], "reduccion": [], "salida": []}
        if anterior is not None:
            total_ant = sum(p["valor"] for p in anterior.values())
            for c in set(pos) | set(anterior):
                ahora, antes = pos.get(c), anterior.get(c)
                if ahora and not antes:
                    tipo = "nueva"
                elif antes and not ahora:
                    tipo = "salida"
                else:
                    a0, a1 = antes["acciones"], ahora["acciones"]
                    if a0 <= 0:
                        continue
                    cambio = a1 / a0 - 1
                    tipo = "aumento" if cambio >= UMBRAL else "reduccion" if cambio <= -UMBRAL else None
                    if not tipo:
                        continue
                p = ahora or antes
                movimientos[tipo].append(
                    {
                        **fila(p, total),
                        "pesoAntes": (antes["valor"] / total_ant) if antes and total_ant else 0,
                        "pesoAhora": (ahora["valor"] / total) if ahora and total else 0,
                        # Cuántas acciones más o menos tiene (el peso también se mueve con el precio).
                        "cambioAcciones": (ahora["acciones"] / antes["acciones"] - 1) if ahora and antes and antes["acciones"] > 0 else None,
                    }
                )
            for t, lista in movimientos.items():
                lista.sort(key=lambda m: -max(m["pesoAntes"], m["pesoAhora"]) if t in ("nueva", "salida") else -abs(m["pesoAhora"] - m["pesoAntes"]))
                # Los argentinos van siempre; del resto, los más grandes.
                movimientos[t] = [m for m in lista if m["argentino"]] + [m for m in lista if not m["argentino"]][:MOVIMIENTOS]
                movimientos[t].sort(key=lambda m: -max(m["pesoAntes"], m["pesoAhora"]))
        acc = per["acc"]
        trimestres.append(
            {
                "periodo": per["periodo"],
                "presentado": per["presentado"],
                "url": f"https://www.sec.gov/Archives/edgar/data/{inversor['cik']}/{acc.replace('-', '')}/{acc}-index.htm",
                "total": round(total),
                "cantidad": len(pos),
                "argentina": round(sum(p["valor"] for p in arg)),
                "posiciones": [fila(p, total) for p in top],
                "posicionesArgentinas": [fila(p, total) for p in arg],
                "resto": {"valor": round(sum(p["valor"] for p in resto)), "cantidad": len(resto)},
                "movimientos": movimientos if anterior is not None else None,
            }
        )
    return {**{k: v for k, v in inversor.items() if k != "_nota"}, "trimestres": trimestres}


def main() -> None:
    argentinos = {k: v for k, v in leer_json(DATOS / "argentinos.json", {})["activos"].items()}
    curados = leer_json(DATOS / "lista.json", {})["inversores"]
    descubiertos_path = DATOS / "descubiertos.json"
    descubiertos = leer_json(descubiertos_path, {})
    if "--sin-zip" not in sys.argv:
        descubiertos = descubrir(argentinos, descubiertos)
        escribir_json(descubiertos_path, descubiertos)
    ciks = {c["cik"] for c in curados}
    lista = [dict(c) for c in curados]
    for f in descubiertos.get("fondos", []):
        if f["cik"] not in ciks:
            nombre = nombre_lindo(f["nombre"])
            lista.append({"slug": slug(nombre), "nombre": nombre, "cik": f["cik"], "grupo": "argentina", "automatico": True})
            ciks.add(f["cik"])

    crudos = []
    for inv in lista:
        try:
            nombre_sec, filings = informes(inv["cik"])
            periodos = cartera_por_periodo(inv["cik"], filings)
        except Exception as e:  # noqa: BLE001 (un fondo que falla no frena al resto)
            print("  x", inv["nombre"], e)
            continue
        if not periodos:
            print("  x", inv["nombre"], "sin informes")
            continue
        if not inv.get("ciudad"):
            inv["ciudad"] = _ciudades.get(inv["cik"])
        print(f"  {inv['nombre']}: {len(periodos)} trimestres, último {periodos[0]['periodo']}")
        crudos.append((inv, periodos))

    # Solo se traducen los CUSIP que se van a mostrar: se arma una vez, se traducen los que quedaron y se vuelve a armar.
    cusips = leer_json(DATOS / "cusips.json", {})

    def filas_de(salida: list[dict]):
        for inv in salida:
            for t in inv["trimestres"]:
                yield from t["posiciones"]
                yield from t["posicionesArgentinas"]
                for ms in (t["movimientos"] or {}).values():
                    yield from ms

    borrador = [armar(inv, periodos, cusips, argentinos) for inv, periodos in crudos]
    traducir({f["cusip"] for f in filas_de(borrador) if not f["argentino"]}, cusips)
    escribir_json(DATOS / "cusips.json", dict(sorted(cusips.items())))
    salida = [armar(inv, periodos, cusips, argentinos) for inv, periodos in crudos]
    tickers = {f["ticker"] for f in filas_de(salida) if f["ticker"] and not f["argentino"]}
    if "--sin-logos" not in sys.argv:
        logos_faltantes(tickers)
    escribir_json(
        DATOS / "carteras.json",
        {"_nota": "Generado por scripts/inversores.py: no editar a mano.", "actualizado": datetime.now(timezone.utc).isoformat(timespec="seconds"), "inversores": salida},
    )
    print(f"Listo: {len(salida)} inversores")


if __name__ == "__main__":
    main()
