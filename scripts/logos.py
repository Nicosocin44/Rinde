"""Baja los logos de proveedores (bancos, billeteras, exchanges, brokers) y de activos (CEDEARs, acciones, cripto)
una sola vez y los guarda en public/logos/. Así la web no depende de un servicio externo al cargar.

Fuente: el ícono oficial de cada sitio, vía el servicio de íconos de Google (128 px). Se descartan los que
vuelven chicos (< 32 px) o el ícono genérico: en esos casos la web sigue mostrando el monograma.
Genera src/config/logos.ts con la lista de los que existen.

Al final suma los logos manuales de assets/logos-fuente/ (ver scripts/logos_manuales.py), que tienen prioridad.

uso: python scripts/logos.py
"""
import io
import json
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

PROVEEDORES = {
    "bna": "bna.com.ar", "galicia": "galicia.ar", "bbva": "bbva.com.ar", "santander": "santander.com.ar",
    "bapro": "bancoprovincia.com.ar", "macro": "macro.com.ar", "icbc": "icbc.com.ar", "ciudad": "bancociudad.com.ar",
    "patagonia": "bancopatagonia.com.ar", "credicoop": "bancocredicoop.coop", "bica": "bancobica.com.ar", "cmf": "cmfb.com.ar",
    "comafi": "comafi.com.ar", "comercio": "bancodecomercio.com.ar", "formosa": "bancoformosa.com.ar", "bancor": "bancor.com.ar",
    "chubut": "bancochubut.com.ar", "delsol": "bancodelsol.com", "julio": "bancojulio.com.ar", "mariva": "mariva.com.ar",
    "masventas": "bancomasventas.com.ar", "meridian": "bancomeridian.com", "btf": "bancotdf.com.ar", "voii": "bancovoii.com.ar",
    "bibank": "bibank.com.ar", "creditoregional": "creditoregional.com.ar", "reba": "reba.com.ar", "piano": "bancopiano.com.ar",
    "brubank": "brubank.com", "supervielle": "supervielle.com.ar", "columbia": "bancocolumbia.com.ar", "carrefour": "bancocarrefour.com.ar",
    "hipotecario": "hipotecario.com.ar",
    "pluscambio": "pluscambio.com.ar", "plazacambio": "plazacambio.com.ar", "triacambio": "triacambio.com.ar", "bytelime": "bytelime.com",
    "mercadopago": "mercadopago.com.ar", "uala": "uala.com.ar", "naranjax": "naranjax.com", "personalpay": "personalpay.com.ar",
    "prex": "prexcard.com.ar", "montemar": "montemar.com.ar", "cresium": "cresium.com", "astropay": "astropay.com",
    "takenos": "takenos.com", "wallbit": "wallbit.io", "airtm": "airtm.com", "vitawallet": "vitawallet.io",
    "belo": "belo.app", "lemoncash": "lemon.me", "ripio": "ripio.com", "ripioexchange": "ripio.com", "buenbit": "buenbit.com",
    "fiwind": "fiwind.io", "letsbit": "letsbit.io", "satoshitango": "satoshitango.com", "decrypto": "decrypto.la",
    "tiendacrypto": "tiendacrypto.com", "universalcoins": "universalcoins.net", "cocoscrypto": "cocos.capital", "cryptomkt": "cryptomkt.com",
    "bitsoalpha": "bitso.com", "binance": "binance.com", "bybit": "bybit.com", "mexc": "mexc.com", "nexo": "nexo.com",
    "xapo": "xapobank.com", "banexcoin": "banexcoin.com", "kriptonmarket": "kriptonmarket.com", "trubit": "trubit.com",
    "eldoradop2p": "eldorado.io", "binancep2p": "binance.com", "okexp2p": "okx.com", "bybitp2p": "bybit.com", "kucoinp2p": "kucoin.com",
    "bitgetp2p": "bitget.com", "bingxp2p": "bingx.com", "huobip2p": "htx.com", "mexcp2p": "mexc.com", "weexp2p": "weex.com",
    "lemoncashp2p": "lemon.me", "paydecep2p": "paydece.io",
    "cocos": "cocos.capital", "balanz": "balanz.com", "iol": "invertironline.com", "ppi": "portfoliopersonal.com",
    "allaria": "allaria.com.ar", "adcap": "adcap.com.ar", "byma": "byma.com.ar",
}

ACTIVOS = {
    # CEDEARs
    "AAPL": "apple.com", "MSFT": "microsoft.com", "GOOGL": "google.com", "AMZN": "amazon.com", "NVDA": "nvidia.com",
    "META": "meta.com", "TSLA": "tesla.com", "NFLX": "netflix.com", "AMD": "amd.com", "INTC": "intel.com",
    "AVGO": "broadcom.com", "TSM": "tsmc.com", "ARM": "arm.com", "ORCL": "oracle.com", "CRM": "salesforce.com",
    "ADBE": "adobe.com", "PLTR": "palantir.com", "UBER": "uber.com", "SHOP": "shopify.com", "SPOT": "spotify.com",
    "DIS": "disney.com", "MELI": "mercadolibre.com.ar", "GLOB": "globant.com", "KO": "coca-cola.com", "PEP": "pepsico.com",
    "MCD": "mcdonalds.com", "WMT": "walmart.com", "COST": "costco.com", "PG": "pg.com", "NKE": "nike.com",
    "BABA": "alibaba.com", "JPM": "jpmorganchase.com", "V": "visa.com", "MA": "mastercard.com", "BRKB": "berkshirehathaway.com",
    "GS": "goldmansachs.com", "C": "citigroup.com", "PYPL": "paypal.com", "COIN": "coinbase.com", "JNJ": "jnj.com",
    "PFE": "pfizer.com", "LLY": "lilly.com", "ABBV": "abbvie.com", "XOM": "exxonmobil.com", "CVX": "chevron.com",
    "VIST": "vistaenergy.com", "PBR": "petrobras.com.br", "VALE": "vale.com", "GOLD": "barrick.com",
    "SPY": "ssga.com", "DIA": "ssga.com", "XLE": "ssga.com", "QQQ": "invesco.com", "IWM": "ishares.com", "EEM": "ishares.com",
    "EWZ": "ishares.com", "IBIT": "ishares.com", "GLD": "spdrgoldshares.com", "BA": "boeing.com", "CAT": "caterpillar.com",
    # Acciones argentinas
    "ALUA": "aluar.com.ar", "BBAR": "bbva.com.ar", "BMA": "macro.com.ar", "BYMA": "byma.com.ar", "CEPU": "centralpuerto.com",
    "CRES": "cresud.com.ar", "CVH": "cablevisionholding.com", "EDN": "edenor.com", "GGAL": "galicia.ar", "IRSA": "irsa.com.ar",
    "LOMA": "lomanegra.com", "METR": "metrogas.com.ar", "PAMP": "pampaenergia.com", "SUPV": "supervielle.com.ar",
    "TECO2": "telecom.com.ar", "TGNO4": "tgn.com.ar", "TGSU2": "tgs.com.ar", "TRAN": "transener.com.ar", "TXAR": "ternium.com.ar",
    "VALO": "grupovalores.com.ar", "YPFD": "ypf.com", "AGRO": "agrometal.com", "AUSO": "autopistasdelsol.com.ar",
    "BHIP": "hipotecario.com.ar", "BOLT": "boldt.com.ar", "BPAT": "bancopatagonia.com.ar", "CAPX": "capex.com.ar",
    "CECO2": "centralcostanera.com.ar", "CGPA2": "camuzzigas.com", "CTIO": "consultatio.com.ar", "DGCU2": "ecogas.com.ar",
    "ECOG": "ecogas.com.ar", "FERR": "ferrum.com", "GBAN": "naturgy.com.ar", "GCLA": "grupoclarin.com", "HARG": "holcim.com.ar",
    "LEDE": "ledesma.com.ar", "LONG": "longvie.com", "MIRG": "mirgor.com.ar", "MOLA": "molinosagro.com.ar",  # MOLI: el ícono de molinos.com.ar sale pixelado; queda el monograma
    "MORI": "morixe.com.ar", "RICH": "richmondlab.com", "RIGO": "rigolleau.com.ar", "SAMI": "sanmiguelglobal.com",
    # Cripto
    "BTC": "bitcoin.org", "ETH": "ethereum.org", "USDT": "tether.to", "USDC": "circle.com",
}

# Logos manuales (bajados de Wikimedia Commons con scripts/logos_manuales.py, revisados a ojo). Tienen prioridad
# sobre el ícono automático. Si el logo es ancho (marca + texto), se recorta solo el símbolo:
# (izquierda, arriba, derecha, abajo) en fracciones del logo ya sin márgenes.
RECORTE = {
    "proveedores/macro": (0, 0, 0.33, 1), "activos/BMA": (0, 0, 0.33, 1),
    "proveedores/bapro": (0, 0, 0.16, 1), "proveedores/ciudad": (0, 0, 0.13, 1), "proveedores/icbc": (0.63, 0, 1, 1),
    "activos/LOMA": (0, 0, 0.36, 1), "activos/MOLI": (0, 0, 1, 0.46), "activos/MORI": (0, 0, 1, 0.42),
    "activos/AMD": (0.79, 0, 1, 1), "activos/BA": (0, 0, 0.17, 1), "activos/COME": (0, 0, 0.42, 1),
}

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "logos"
FUENTE_MANUAL = RAIZ / "assets" / "logos-fuente"


def normalizar_manual(origen: Path, recorte: tuple[float, float, float, float] | None) -> Image.Image:
    """Saca los márgenes, recorta el símbolo si hace falta y lo centra en un cuadrado blanco de 96 px."""
    im = Image.open(origen).convert("RGBA")
    fondo = Image.new("RGBA", im.size, "white")
    plano = Image.alpha_composite(fondo, im).convert("RGB")
    caja = ImageOps.invert(plano).getbbox()  # lo que no es blanco
    if caja:
        im = im.crop(caja)
    if recorte:
        l, t, r, b = recorte
        im = im.crop((int(im.width * l), int(im.height * t), int(im.width * r), int(im.height * b)))
        caja = ImageOps.invert(Image.alpha_composite(Image.new("RGBA", im.size, "white"), im).convert("RGB")).getbbox()
        if caja:
            im = im.crop(caja)
    lado = 96
    im.thumbnail((lado - 12, lado - 12), Image.LANCZOS)
    salida = Image.new("RGBA", (lado, lado), "white")
    salida.paste(im, ((lado - im.width) // 2, (lado - im.height) // 2), im)
    return salida


def _probar(url: str) -> Image.Image | None:
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=20) as r:
            im = Image.open(io.BytesIO(r.read()))
            if getattr(im, "ico", None):  # .ico con varios tamaños: el más grande
                im.size = max(im.ico.sizes())
            im.load()
    except Exception:  # noqa: BLE001
        return None
    return im.convert("RGBA") if min(im.size) >= 32 else None


def bajar(dominio: str) -> Image.Image | None:
    """Primero el servicio de íconos de Google (con y sin www); si falla o es chico, el de DuckDuckGo."""
    variantes = [dominio, f"www.{dominio}"]
    urls = [f"https://www.google.com/s2/favicons?domain={v}&sz=128" for v in variantes] + [f"https://icons.duckduckgo.com/ip3/{dominio}.ico"]
    for url in urls:
        im = _probar(url)
        if im is not None:
            return im
    print("  x", dominio)
    return None


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    cache: dict[str, Image.Image | None] = {}
    hay: dict[str, list[str]] = {"proveedores": [], "activos": []}
    for grupo, mapa in (("proveedores", PROVEEDORES), ("activos", ACTIVOS)):
        (SALIDA / grupo).mkdir(exist_ok=True)
        for clave, dominio in mapa.items():
            if dominio not in cache:
                cache[dominio] = bajar(dominio)
            im = cache[dominio]
            if im is None:
                continue
            im.resize((64, 64), Image.LANCZOS).save(SALIDA / grupo / f"{clave}.png", optimize=True)
            hay[grupo].append(clave)
        print(grupo, len(hay[grupo]), "de", len(mapa))
        manuales = sorted((FUENTE_MANUAL / grupo).glob("*.png")) if (FUENTE_MANUAL / grupo).exists() else []
        for origen in manuales:
            clave = origen.stem
            normalizar_manual(origen, RECORTE.get(f"{grupo}/{clave}")).save(SALIDA / grupo / f"{clave}.png", optimize=True)
            if clave not in hay[grupo]:
                hay[grupo].append(clave)
        print(grupo, "con manuales:", len(hay[grupo]))
    ts = (
        "/**\n * Logos disponibles en public/logos/ (generado por scripts/logos.py; no editar a mano).\n"
        " * Si un id no está acá, se muestra el monograma.\n */\n"
        f"export const LOGOS_PROVEEDORES = new Set<string>({json.dumps(sorted(hay['proveedores']))});\n"
        f"export const LOGOS_ACTIVOS = new Set<string>({json.dumps(sorted(hay['activos']))});\n"
    )
    (RAIZ / "src" / "config" / "logos.ts").write_text(ts, encoding="utf-8")


if __name__ == "__main__":
    main()
