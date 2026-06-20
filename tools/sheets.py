"""Build labeled contact sheets (12 thumbs each) for the vision curation pass.
   tools/_thumbs/*  ->  tools/_sheets/sheet_XXX.jpg  + tools/_sheets/index.json
"""
import os, json
from PIL import Image, ImageDraw, ImageFont

ROOT  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THUMB = os.path.join(ROOT, "tools", "_thumbs")
OUT   = os.path.join(ROOT, "tools", "_sheets")
os.makedirs(OUT, exist_ok=True)

COLS, ROWS = 4, 3
CELL, PAD, LABEL = 300, 12, 40
PERSHEET = COLS * ROWS
SW = COLS * CELL + (COLS + 1) * PAD
SH = ROWS * (CELL + LABEL) + (ROWS + 1) * PAD

try:
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 26)
except Exception:
    font = ImageFont.load_default()

stems = sorted(os.path.splitext(f)[0] for f in os.listdir(THUMB) if f.lower().endswith(".jpg"))
sheets = [stems[i:i + PERSHEET] for i in range(0, len(stems), PERSHEET)]
index = []

for s, chunk in enumerate(sheets):
    sheet = Image.new("RGB", (SW, SH), (245, 242, 236))
    d = ImageDraw.Draw(sheet)
    for i, stem in enumerate(chunk):
        r, c = divmod(i, COLS)
        x = PAD + c * (CELL + PAD)
        y = PAD + r * (CELL + LABEL + PAD)
        try:
            with Image.open(os.path.join(THUMB, stem + ".jpg")) as im:
                im = im.convert("RGB")
                im.thumbnail((CELL, CELL), Image.LANCZOS)
                ox = x + (CELL - im.width) // 2
                oy = y + LABEL + (CELL - im.height) // 2
                sheet.paste(im, (ox, oy))
        except Exception as e:
            d.text((x + 8, y + LABEL + 8), "err", fill=(200, 54, 42), font=font)
        # number label (1-based within sheet)
        d.rectangle([x, y, x + CELL, y + LABEL], fill=(20, 16, 9))
        d.text((x + 10, y + 7), f"#{i + 1}", fill=(247, 243, 236), font=font)
    name = f"sheet_{s:03d}.jpg"
    sheet.save(os.path.join(OUT, name), "JPEG", quality=85)
    index.append({"sheet": name, "stems": chunk})

with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
    json.dump(index, f)

print(f"{len(stems)} thumbs -> {len(sheets)} sheets in tools/_sheets/")
