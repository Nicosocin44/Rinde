"""Baja los logos de proveedores (bancos, billeteras, exchanges, brokers) y de activos (CEDEARs, acciones, cripto)
una sola vez y los guarda en public/logos/. Así la web no depende de un servicio externo al cargar.

Fuente: el ícono oficial de cada sitio, vía el servicio de íconos de Google (128 px). Se descartan los que
vuelven chicos (< 32 px) o el ícono genérico: en esos casos la web sigue mostrando el monograma.
Genera src/config/logos.ts con la lista de los que existen.

Al final suma los logos manuales de assets/logos-fuente/ (ver scripts/logos_manuales.py), que tienen prioridad.

uso: python scripts/logos.py            (todo)
     python scripts/logos.py medios     (solo un grupo; el resto queda como está)
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
    # Sumados el 19/11/2026: el sitio oficial de cada empresa sale de Wikidata (ticker en NYSE o Nasdaq); los ETF, de su
    # emisora; las argentinas, verificadas a mano con el título de su sitio. GCDI se descartó (el ícono es un cuadrado vacío).
    "BHP": "bhp.com", "BIDU": "baidu.com", "BKNG": "bookingholdings.com", "BMNR": "bitminetech.io", "BMY": "bms.com",
    "BP": "bp.com", "BX": "blackstone.com", "CAR": "avisbudgetgroup.com", "CARC": "carboclor.com.ar", "CCJ": "cameco.com",
    "CDE": "coeur.com", "CEG": "constellation.com", "CIBR": "ftportfolios.com", "CL": "colgatepalmolive.com", "CLS": "celestica.com",
    "COP": "conocophillips.com", "COPX": "globalxetfs.com", "CORN": "teucrium.com", "CRWD": "crowdstrike.com", "CRWV": "coreweave.com",
    "CVS": "cvshealth.com", "DAL": "delta.com", "DELL": "dell.com", "DEO": "diageo.com", "DISN": "disney.com",
    "DOCU": "docusign.com", "DOW": "dow.com", "EFA": "ishares.com", "ERIC": "ericsson.com", "ETHA": "ishares.com",
    "EWY": "ishares.com", "FDX": "fedex.com", "FIPL": "fiplasto.com.ar", "FXI": "ishares.com", "GE": "geaerospace.com",
    "GEV": "gevernova.com", "GFI": "goldfields.co.za", "GILD": "gilead.com", "GPRK": "geopark.com", "GT": "goodyear.com",
    "HAL": "halliburton.com", "HD": "homedepot.com", "HIMS": "forhims.com", "HL": "hecla.com", "HMC": "global.honda",
    "HOOD": "robinhood.com", "HPQ": "hp.com", "HUT": "hut8.com", "HWM": "howmet.com", "IBB": "ishares.com",
    "IBKR": "interactivebrokers.com", "IBM": "ibm.com", "ICLN": "ishares.com", "IEMG": "ishares.com", "IEUR": "ishares.com",
    "IFF": "iff.com", "IJH": "ishares.com", "ILF": "ishares.com", "INTR": "dosanclas.com.ar", "INVJ": "juramento.com.ar",
    "IP": "internationalpaper.com", "IREN": "iren.com", "ITA": "ishares.com", "ITUB": "itau.com.br", "IVE": "ishares.com",
    "IVV": "ishares.com", "IVW": "ishares.com", "JD": "jd.com", "JMIA": "group.jumia.com", "KLAC": "kla.com",
    "KMB": "kimberly-clark.com", "KOFM": "coca-colafemsa.com", "LAC": "lithiumamericas.com", "LAR": "lithium-argentina.com", "LIN": "linde.com",
    "LMT": "lockheedmartin.com", "LRCX": "lamresearch.com", "LVS": "lasvegassands.com", "MDLZ": "mondelezinternational.com", "MDT": "medtronic.com",
    "MO": "altria.com", "MOS": "mosaicco.com", "MP": "mpmaterials.com", "MRK": "merck.com", "MRVL": "marvell.com",
    "MSI": "motorolasolutions.com", "MSTR": "microstrategy.com", "MU": "micron.com", "MUFG": "mufg.jp", "NBIS": "nebius.group",
    "NG": "novagold.com", "NIO": "nio.com", "NOKA": "nokia.com", "NOW": "servicenow.com", "NTES": "163.com",
    "NTRA": "natera.com", "NVO": "novonordisk.com", "NVS": "novartis.com", "NXE": "nexgenenergy.ca", "O": "realtyincome.com",
    "OKLO": "oklo.com", "OXY": "oxy.com", "PAAS": "panamericansilver.com", "PAGS": "pagseguro.uol.com.br", "PANW": "paloaltonetworks.com",
    "PATA": "laanonima.com.ar", "PATH": "uipath.com", "PBI": "pitneybowes.com", "PCAR": "paccar.com", "PINS": "pinterest.com",
    "PM": "pmi.com", "PSQ": "proshares.com", "PSX": "phillips66.com", "QCOM": "qualcomm.com", "RACE": "ferrari.com",
    "RBLX": "roblox.com", "RGTI": "rigetti.com", "RIO": "riotinto.com", "RIOT": "riotplatforms.com", "RKLB": "rocketlabusa.com",
    "ROST": "rossstores.com", "RSP": "invesco.com", "RTX": "rtx.com", "SAN": "santander.com", "SAP": "sap.com",
    "SATL": "satellogic.com", "SBS": "sabesp.com.br", "SBUX": "starbucks.com", "SCCO": "southerncoppercorp.com", "SE": "sea.com",
    "SEMI": "semino.com.ar", "SH": "proshares.com", "SHEL": "shell.com", "SID": "csn.com.br", "SLB": "slb.com",
    "SLV": "ishares.com", "SNAP": "snap.com", "SNDK": "sandisk.com", "SNOW": "snowflake.com", "SONY": "sony.com",
    "SPCE": "virgingalactic.com", "SPCX": "spacex.com", "SPGI": "spglobal.com", "SPXL": "direxion.com", "STLA": "stellantis.com",
    "STNE": "stone.co", "SUZ": "suzano.com.br", "SYY": "sysco.com", "T": "att.com", "TCOM": "trip.com",
    "TEM": "tempus.com", "TGT": "target.com", "TIMB": "tim.com.br", "TM": "global.toyota", "TMUS": "t-mobile.com",
    "TQQQ": "proshares.com", "TRIP": "tripadvisor.com", "TV": "televisa.com", "TXN": "ti.com", "TXR": "ternium.com",
    "UGP": "ultra.com.br", "UL": "unilever.com", "UNP": "up.com", "UPST": "upstart.com", "URA": "globalxetfs.com",
    "VIV": "telefonica.com.br", "VST": "vistracorp.com", "WDC": "westerndigital.com", "WFC": "wellsfargo.com", "XP": "xpinc.com",
    "XPEV": "xpeng.com", "XROX": "xerox.com", "XYZ": "block.xyz", "YELP": "yelp.com", "ZM": "zoom.com",
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

MEDIOS = {
    "infobae": "infobae.com", "lanacion": "lanacion.com.ar", "ambito": "ambito.com", "cronista": "cronista.com",
    "iprofesional": "iprofesional.com", "bloomberglinea": "bloomberglinea.com",
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


def main(grupos: list[str]) -> None:
    """`grupos` limita qué se vuelve a bajar (ej. solo "medios"); los demás se toman de lo que ya está en public/logos/."""
    SALIDA.mkdir(parents=True, exist_ok=True)
    cache: dict[str, Image.Image | None] = {}
    todos = {"proveedores": PROVEEDORES, "activos": ACTIVOS, "medios": MEDIOS}
    hay: dict[str, list[str]] = {g: [] for g in todos}
    for grupo, mapa in todos.items():
        (SALIDA / grupo).mkdir(exist_ok=True)
        if grupos and grupo not in grupos:
            hay[grupo] = [f.stem for f in (SALIDA / grupo).glob("*.png")]
            continue
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
        f"export const LOGOS_MEDIOS = new Set<string>({json.dumps(sorted(hay['medios']))});\n"
    )
    (RAIZ / "src" / "config" / "logos.ts").write_text(ts, encoding="utf-8")


if __name__ == "__main__":
    import sys

    main(sys.argv[1:])
