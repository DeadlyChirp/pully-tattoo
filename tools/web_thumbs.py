"""Make grid thumbnails: assets/img/*.jpg -> assets/img/thumb/*.jpg (<=640, q72)."""
import os, glob
from PIL import Image, ImageOps
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "img")
TH = os.path.join(IMG, "thumb")
os.makedirs(TH, exist_ok=True)
n = 0
for fp in glob.glob(os.path.join(IMG, "*.jpg")):
    out = os.path.join(TH, os.path.basename(fp))
    try:
        with Image.open(fp) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            im.thumbnail((640, 640), Image.LANCZOS)
            im.save(out, "JPEG", quality=72, optimize=True, progressive=True)
        n += 1
    except Exception as e:
        print("skip", fp, e)
mb = sum(os.path.getsize(os.path.join(TH, x)) for x in os.listdir(TH)) / 1024 / 1024
print(f"{n} thumbs -> assets/img/thumb  ({mb:.1f} MB)")
