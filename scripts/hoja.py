"""Hoja de contactos: junta los cuadros de un recorrido en una sola imagen para revisarlos de un vistazo.

uso: python scripts/hoja.py <carpeta> <prefijo> [ancho_miniatura]
ej.: python scripts/hoja.py .shots/narrativa el-problema__375__dark 260
"""
import sys
from pathlib import Path
from PIL import Image

carpeta, prefijo = Path(sys.argv[1]), sys.argv[2]
mini = int(sys.argv[3]) if len(sys.argv) > 3 else 300
cuadros = sorted(p for p in carpeta.glob(f"{prefijo}__*.png"))
if not cuadros:
    sys.exit(f"No hay cuadros para {prefijo}")
imgs = [Image.open(p) for p in cuadros]
escala = mini / imgs[0].width
alto = int(imgs[0].height * escala)
hoja = Image.new("RGB", (mini * len(imgs) + 8 * (len(imgs) - 1), alto), "#777")
for i, im in enumerate(imgs):
    hoja.paste(im.resize((mini, alto)), (i * (mini + 8), 0))
destino = carpeta / "_hojas" / f"{prefijo}.png"
destino.parent.mkdir(exist_ok=True)
hoja.save(destino)
print(destino)
