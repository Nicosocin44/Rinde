"""Paso 3 de los logos (punto 19 de la lista): completa los que faltan y deja los originales en assets/logos-fuente/,
de donde scripts/logos.py los normaliza (tienen prioridad sobre el ícono automático).

- Activos: el logo por ticker de Financial Modeling Prep (financialmodelingprep.com/image-stock/{ticker}.png, sin
  cuenta; si no lo tiene responde 404). CEDEARs con su ticker de EE.UU.; acciones argentinas con su ADR o con .BA.
  Solo para los que no tienen logo: los que ya están se revisaron a ojo y quedan.
- Proveedores (bancos, billeteras, exchanges): el ícono grande del sitio (apple-touch-icon o el ícono más grande que
  declara la página), si mide 64 px o más.
- Último recurso, si no hubo nada: icon.horse (el mejor ícono de un dominio). Puede devolver un ícono genérico: los
  nuevos se revisan a ojo con scripts/hoja.py.
- Medios: scripts/medios.json (los que más aparecen en las noticias de los activos) se suman a scripts/logos.py.

uso: python scripts/logos_extra.py
"""
import io
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
FUENTE = RAIZ / "assets" / "logos-fuente"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}


def get(url: str, timeout: int = 20) -> bytes | None:
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
            return r.read() if r.status == 200 else None
    except Exception:  # noqa: BLE001
        return None


def imagen(datos: bytes | None, minimo: int) -> Image.Image | None:
    if not datos:
        return None
    try:
        im = Image.open(io.BytesIO(datos))
        if getattr(im, "ico", None):
            im.size = max(im.ico.sizes())
        im.load()
    except Exception:  # noqa: BLE001
        return None
    return im.convert("RGBA") if min(im.size) >= minimo else None


def con_logo() -> dict[str, set[str]]:
    ts = (RAIZ / "src" / "config" / "logos.ts").read_text(encoding="utf-8")
    return {m.group(1): set(json.loads(m.group(2))) for m in re.finditer(r"export const LOGOS_(\w+) = new Set<string>\((\[.*?\])\)", ts, re.S)}


def mapa_ts(archivo: str, nombre: str) -> dict[str, str]:
    src = (RAIZ / archivo).read_text(encoding="utf-8")
    bloque = re.search(rf"export const {nombre}[^=]*= \{{(.*?)\}};", src, re.S).group(1)
    return dict(re.findall(r"\"?([A-Z0-9.]+)\"?: \"([A-Z0-9.\-]+)\"", bloque))


def base(simbolos: set[str]) -> list[str]:
    """Sin las especies en dólares o cable (AAPLD, AAPLC, BMA.D, BA.C) de otro que también está."""
    return sorted(s for s in simbolos if not (s.endswith(".D") or s.endswith(".C") or ((s.endswith("D") or s.endswith("C")) and s[:-1] in simbolos)))


# CEDEARs cuyo ticker en BYMA no es el de EE.UU. (y no está en data/ar/sec.ts).
# (".C" no va acá: BA.C, B.C son las especies cable de Boeing y Barrick, no otras empresas.)
OTRO_TICKER = {"BBV": "BBVA", "TXR": "TX", "NOKA": "NOK", "KOFM": "KOF", "DISN": "DIS", "PKS": "PKX", "BNG": "BG"}


# Acciones del panel general que no están en Financial Modeling Prep: su sitio.
DOMINIO_ACCION = {
    "A3": "a3mercados.com.ar", "CADO": "carloscasado.com.ar", "CARC": "carboclor.com.ar", "CELU": "celulosaargentina.com.ar",
    "DOME": "domec.com.ar", "FIPL": "fiplasto.com.ar", "GCDI": "gcdi.com.ar", "GRIM": "grimoldi.com", "HAVA": "havanna.com.ar",
    "OEST": "autopistadeloeste.com.ar", "ROSE": "rosenbusch.com", "SEMI": "semino.com.ar", "INVJ": "juramento.com.ar",
}
# Revisados a ojo el 19/11/2026: icon.horse trajo un logo que no es de la empresa (Fiplasto: Mastodon; Rosenbusch:
# WordPress) o uno que no pudimos confirmar. Quedan con el monograma.
NO_USAR = {"CADO", "OEST", "FIPL", "ROSE", "GCDI", "INVJ", "SEMI", "CARC"}


def es_generico(im: Image.Image) -> bool:
    """El ícono que icon.horse inventa cuando no encuentra nada: un cuadrado gris con una letra (casi sin color)."""
    rgb = im.convert("RGB").resize((32, 32))
    sin_color = sum(1 for r, g, b in rgb.getdata() if max(r, g, b) - min(r, g, b) < 12)
    return sin_color / (32 * 32) > 0.95


def icon_horse(dominio: str) -> Image.Image | None:
    im = imagen(get(f"https://icon.horse/icon/{dominio}"), 64)
    return None if im is None or es_generico(im) else im


def candidatos_cedear(ticker: str, eeuu: dict[str, str]) -> list[str]:
    """El ticker de EE.UU.; las brasileñas (ABEV3, PETR4…) cotizan en San Pablo (.SA)."""
    lista = [eeuu.get(ticker) or OTRO_TICKER.get(ticker) or ticker]
    if re.fullmatch(r"[A-Z]{4}\d{1,2}", ticker):
        lista.append(f"{ticker}.SA")
    return lista


def activos(hay: set[str]) -> None:
    eeuu = mapa_ts("data/ar/sec.ts", "TICKER_EEUU_DE_CEDEAR")
    adr = mapa_ts("data/ar/sec.ts", "ADR_DE_ACCION")
    cedears = base({c["symbol"] for c in json.loads(get("https://data912.com/live/arg_cedears") or b"[]")})
    acciones = base({c["symbol"] for c in json.loads(get("https://data912.com/live/arg_stocks") or b"[]")})
    destino = FUENTE / "activos"
    destino.mkdir(parents=True, exist_ok=True)
    nuevos, sin = 0, []
    for ticker, candidatos in [(t, candidatos_cedear(t, eeuu)) for t in cedears] + [(t, ([adr[t]] if t in adr else []) + [f"{t}.BA"]) for t in acciones]:
        if ticker in hay or (destino / f"{ticker}.png").exists():
            continue
        for c in candidatos:
            im = imagen(get(f"https://financialmodelingprep.com/image-stock/{urllib.parse.quote(c)}.png"), 32)
            if im:
                im.save(destino / f"{ticker}.png")
                nuevos += 1
                break
        else:
            im = icon_horse(DOMINIO_ACCION[ticker]) if ticker in DOMINIO_ACCION and ticker not in NO_USAR else None
            if im:
                im.save(destino / f"{ticker}.png")
                nuevos += 1
            else:
                sin.append(ticker)
    print(f"activos: {nuevos} logos nuevos; sin logo: {len(sin)} ({', '.join(sin[:40])}{'…' if len(sin) > 40 else ''})")


def iconos_del_sitio(sitio: str) -> list[str]:
    """Los íconos que declara la página, del más grande al más chico, y los lugares de siempre."""
    html = (get(sitio) or b"").decode("utf-8", "replace")
    links = []
    for tag in re.findall(r"<link[^>]+>", html, re.I):
        rel = re.search(r'rel=["\']([^"\']+)', tag, re.I)
        href = re.search(r'href=["\']([^"\']+)', tag, re.I)
        if not rel or not href or "icon" not in rel.group(1).lower():
            continue
        tam = re.search(r'sizes=["\'](\d+)x', tag, re.I)
        links.append((int(tam.group(1)) if tam else (180 if "apple" in rel.group(1).lower() else 16), urllib.parse.urljoin(sitio, href.group(1))))
    return [u for _, u in sorted(links, reverse=True)] + [urllib.parse.urljoin(sitio, "/apple-touch-icon.png"), urllib.parse.urljoin(sitio, "/apple-touch-icon-precomposed.png")]


# Proveedores que no tienen dominio en scripts/logos.py.
DOMINIOS_EXTRA = {"andina": "bancoandina.com.ar", "dino": "bancodino.com.ar", "saldo": "saldo.com.ar", "sbs": "gruposbs.com", "eluter": "eluter.com", "peanut": "peanut.com.ar", "vibrant": "vibrant.com.ar", "pluscrypto": "pluscrypto.com.ar"}


def proveedores(hay: set[str]) -> None:
    src = (RAIZ / "data" / "ar" / "proveedores.ts").read_text(encoding="utf-8")
    ids = set(re.findall(r'id: "([a-z0-9]+)"', src))
    logos_py = (RAIZ / "scripts" / "logos.py").read_text(encoding="utf-8")
    dominios = {**dict(re.findall(r'"([a-z0-9]+)": "([a-z0-9.\-]+\.[a-z]{2,})"', logos_py.split("ACTIVOS = {")[0])), **DOMINIOS_EXTRA}
    sitios = {i: f"https://www.{dominios[i]}" for i in ids if i in dominios}
    destino = FUENTE / "proveedores"
    destino.mkdir(parents=True, exist_ok=True)
    nuevos, sin = 0, []
    for pid, sitio in sorted(sitios.items()):
        if pid in hay or (destino / f"{pid}.png").exists():
            continue
        for url in iconos_del_sitio(sitio):
            im = imagen(get(url), 64)
            if im:
                im.save(destino / f"{pid}.png")
                nuevos += 1
                break
        else:
            im = icon_horse(urllib.parse.urlparse(sitio).hostname.removeprefix("www."))
            if im:
                im.save(destino / f"{pid}.png")
                nuevos += 1
            else:
                sin.append(pid)
    print(f"proveedores: {nuevos} logos nuevos; sin logo: {', '.join(sin)}")


if __name__ == "__main__":
    hay = con_logo()
    activos(hay["ACTIVOS"])
    proveedores(hay["PROVEEDORES"])
