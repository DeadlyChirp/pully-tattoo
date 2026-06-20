"""Optimize scraped images for the web + make small thumbnails for the curation pass.
   _scrape/pully/*  ->  tools/_opt/*.jpg (<=1280, q82)  +  tools/_thumbs/*.jpg (<=360, q72)
"""
import os, sys
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "_scrape", "pully")
OPT  = os.path.join(ROOT, "tools", "_opt")
THUMB= os.path.join(ROOT, "tools", "_thumbs")
os.makedirs(OPT, exist_ok=True)
os.makedirs(THUMB, exist_ok=True)

EXT = (".jpg", ".jpeg", ".png", ".webp")
files = sorted(f for f in os.listdir(SRC) if f.lower().endswith(EXT))

def save(img, path, maxside, q):
    im = ImageOps.exif_transpose(img).convert("RGB")
    im.thumbnail((maxside, maxside), Image.LANCZOS)
    im.save(path, "JPEG", quality=q, optimize=True, progressive=True)

done = 0
for f in files:
    stem = os.path.splitext(f)[0]
    try:
        with Image.open(os.path.join(SRC, f)) as img:
            save(img, os.path.join(OPT,  stem + ".jpg"), 1280, 82)
            with Image.open(os.path.join(SRC, f)) as img2:
                save(img2, os.path.join(THUMB, stem + ".jpg"), 360, 72)
        done += 1
    except Exception as e:
        print("skip", f, e, file=sys.stderr)

print(f"optimized {done}/{len(files)} images")
opt_mb = sum(os.path.getsize(os.path.join(OPT, x)) for x in os.listdir(OPT)) / 1024 / 1024
th_mb  = sum(os.path.getsize(os.path.join(THUMB, x)) for x in os.listdir(THUMB)) / 1024 / 1024
print(f"_opt: {opt_mb:.1f} MB   _thumbs: {th_mb:.1f} MB")
