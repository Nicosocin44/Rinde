"""Paso 1 de los logos manuales: busca en Wikimedia Commons el archivo de logo de cada marca que el ícono
automático (scripts/logos.py) no pudo resolver y baja el original a assets/logos-fuente/.

El paso 2 (scripts/logos.py) los normaliza a PNG de 64 px en public/logos/ y los suma a la lista.
Cada logo se revisa a ojo antes de quedar: si el candidato no es el logo correcto, se fija el archivo
exacto en ARCHIVO_FIJO.

uso: python scripts/logos_manuales.py
"""
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

UA = {"User-Agent": "RindeLogos/1.0 (script de logos del proyecto)"}
API = "https://commons.wikimedia.org/w/api.php"

BUSCAR = {
    "proveedores": {
        "macro": "Banco Macro logo", "icbc": "ICBC logo", "bapro": "Banco Provincia de Buenos Aires logo",
        "ciudad": "Banco Ciudad de Buenos Aires logo", "credicoop": "Banco Credicoop logo", "carrefour": "Carrefour logo",
        "prex": "Prex logo", "personalpay": "Personal Pay logo", "cmf": "Banco CMF logo", "piano": "Banco Piano logo",
        "julio": "Banco Julio logo", "masventas": "Banco Masventas logo", "meridian": "Banco Meridian logo",
        "bibank": "Bibank logo", "andina": "Banco Andina logo", "dino": "Banco Dino logo", "allaria": "Allaria logo",
        "adcap": "Adcap logo", "sbs": "Grupo SBS logo", "cryptomkt": "CryptoMarket logo", "banexcoin": "Banexcoin logo",
        "saldo": "Saldo.com.ar logo", "plazacambio": "Plaza Cambio logo", "triacambio": "Tria Cambio logo",
        "bytelime": "Bytelime logo", "peanut": "Peanut app logo", "vibrant": "Vibrant app logo", "eluter": "Eluter logo",
        "pluscrypto": "Plus Crypto logo", "tesoro": "Escudo de la Argentina",
    },
    "activos": {
        "AMD": "AMD logo", "BA": "Boeing logo", "BMA": "Banco Macro logo", "BRKB": "Berkshire Hathaway logo",
        "COST": "Costco logo", "TSM": "TSMC logo", "XOM": "ExxonMobil logo", "YPFD": "YPF logo",
        "SPY": "SPDR logo", "DIA": "SPDR logo", "XLE": "SPDR logo", "LOMA": "Loma Negra logo",
        "AUSO": "Autopistas del Sol logo", "CTIO": "Consultatio logo", "MORI": "Morixe logo",
        "CADO": "Carlos Casado logo", "CARC": "Carboclor logo", "CELU": "Celulosa Argentina logo",
        "COME": "Sociedad Comercial del Plata logo", "DOME": "Domec logo", "GAMI": "Boldt Gaming logo",
        "INVJ": "Inversora Juramento logo", "MOLI": "Molinos Río de la Plata logo", "OEST": "Autopistas del Oeste logo",
        "PATA": "Importadora Patagonia logo", "SEMI": "Molinos Juan Semino logo",
    },
}

# Archivo exacto de Commons cuando la búsqueda no trae el correcto (se completa después de revisar).
ARCHIVO_FIJO: dict[str, str] = {
    "activos/AMD": "File:AMD Logo.svg",
        "activos/TSM": "File:TSMC wordmark.svg",
    "activos/XOM": "File:ExxonMobil Logo.svg",
    "proveedores/tesoro": "File:Coat of arms of Argentina.svg",
    "proveedores/prex": "File:Prex Uruguay.png",
}

# Candidatos que la búsqueda trajo pero son de otra empresa: no se usan.
DESCARTAR = {
    "proveedores/andina", "proveedores/cryptomkt",  # la búsqueda trajo otra empresa
    "proveedores/carrefour",  # es Carrefour Mobile, no el banco
    "activos/BRKB", "activos/SPY", "activos/DIA", "activos/XLE",  # solo texto chico: a 28 px no se lee
}

RAIZ = Path(__file__).resolve().parent.parent
FUENTE = RAIZ / "assets" / "logos-fuente"


def pedir(url: str) -> bytes:
    """GET con pausa entre pedidos y reintentos si Wikimedia responde 429 (demasiados pedidos)."""
    for intento in range(5):
        time.sleep(1.5)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(10 * (intento + 1))
    raise RuntimeError(f"Wikimedia sigue limitando: {url}")


def api(params: dict) -> dict:
    return json.loads(pedir(API + "?" + urllib.parse.urlencode({**params, "format": "json"})))


def candidato(termino: str) -> str | None:
    d = api({"action": "query", "list": "search", "srsearch": termino, "srnamespace": 6, "srlimit": 15})
    titulos = [r["title"] for r in d.get("query", {}).get("search", [])]
    palabras = [p.lower() for p in termino.replace(" logo", "").split() if len(p) > 2]
    def puntaje(t: str) -> int:
        tl = t.lower()
        return (3 if "logo" in tl else 0) + (2 if tl.endswith(".svg") else 0) + sum(1 for p in palabras if p in tl)
    titulos.sort(key=puntaje, reverse=True)
    return titulos[0] if titulos and puntaje(titulos[0]) >= 3 + len(palabras) // 2 else None


def bajar(titulo: str, destino: Path) -> bool:
    # Se baja la versión PNG que renderiza Wikimedia (256 px de ancho): sirve igual para SVG y PNG.
    d = api({"action": "query", "titles": titulo, "prop": "imageinfo", "iiprop": "url", "iiurlwidth": 256})
    pagina = next(iter(d["query"]["pages"].values()))
    info = pagina.get("imageinfo")
    url = info[0].get("thumburl") if info else None
    if not url or "thumb.wikimedia.org" not in url:  # imágenes más chicas que 256 px: no sirven
        return False
    try:
        (destino.with_suffix(".png")).write_bytes(pedir(url))
    except Exception as e:  # noqa: BLE001
        print("  error", destino.name, e)
        return False
    return True


def main() -> None:
    archivo = FUENTE / "elegidos.json"
    elegidos: dict[str, str] = json.loads(archivo.read_text(encoding="utf-8")) if archivo.exists() else {}
    for grupo, mapa in BUSCAR.items():
        (FUENTE / grupo).mkdir(parents=True, exist_ok=True)
        for clave, termino in mapa.items():
            if f"{grupo}/{clave}" in DESCARTAR:
                for viejo in (FUENTE / grupo).glob(f"{clave}.*"):
                    viejo.unlink()
                elegidos.pop(f"{grupo}/{clave}", None)
                continue
            if f"{grupo}/{clave}" not in ARCHIVO_FIJO and any((FUENTE / grupo).glob(f"{clave}.*")):
                continue  # ya bajado en una corrida anterior
            titulo = ARCHIVO_FIJO.get(f"{grupo}/{clave}") or candidato(termino)
            if not titulo:
                print("  sin candidato:", grupo, clave)
                continue
            for viejo in (FUENTE / grupo).glob(f"{clave}.*"):
                viejo.unlink()
            if bajar(titulo, FUENTE / grupo / clave):
                elegidos[f"{grupo}/{clave}"] = titulo
                print("  ok", grupo, clave, "←", titulo)
    (FUENTE / "elegidos.json").write_text(json.dumps(elegidos, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
