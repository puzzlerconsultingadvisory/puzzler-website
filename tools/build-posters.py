#!/usr/bin/env python3
"""Produce consistent 1280x720 Pieces in Motion posters (WEB-04 / WEB-05).

For every assets/pieces-in-motion/<project>/source/<image> it writes
assets/pieces-in-motion/<project>/poster.jpg and poster.webp: a centre crop to
16:9 (portrait sources keep the middle of the frame), resized to 1280x720.
Sources are never modified. Requires Pillow (pip install pillow).
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "assets" / "pieces-in-motion"
W, H = 1280, 720

def crop_16x9(im):
    w, h = im.size
    target = W / H
    if w / h > target:
        nw = int(h * target); x = (w - nw) // 2; box = (x, 0, x + nw, h)
    else:
        nh = int(w / target); y = (h - nh) // 2; box = (0, y, w, y + nh)
    return im.crop(box).resize((W, H), Image.LANCZOS)

count = 0
for project in sorted(p for p in ROOT.iterdir() if p.is_dir()):
    src_dir = project / "source"
    sources = [p for p in src_dir.glob("*") if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}] if src_dir.exists() else []
    if not sources:
        continue
    src = sorted(sources)[0]
    im = Image.open(src).convert("RGB")
    poster = crop_16x9(im)
    poster.save(project / "poster.jpg", "JPEG", quality=82, optimize=True, progressive=True)
    poster.save(project / "poster.webp", "WEBP", quality=80, method=6)
    print(f"{project.name}: {src.name} {im.size} -> poster.jpg / poster.webp ({W}x{H})")
    count += 1
print(f"{count} poster(s) written" if count else "no source artwork found under assets/pieces-in-motion/*/source/")
