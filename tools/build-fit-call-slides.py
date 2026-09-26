#!/usr/bin/env python3
"""Builds the web copies of the "5 Things to Know About a Fit Call" slides.

Sources, in order of preference, from ../website-assets/fit-call-slides/ (not deployed):
  slide-1.png … slide-5.png   (also .jpg/.jpeg/.webp)  — the founder's full-size originals
  contact-sheet.webp          — the five-panel sheet supplied on 2026-09-26; panels are cut
                                from it only when a full-size original is missing (354×628 each,
                                below web quality: a visible placeholder until the originals land)

Output: ../assets/fit-call/slide-N.webp (max 1080 px wide, quality 82, 9:16).
Run from anywhere: python3 tools/build-fit-call-slides.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'website-assets' / 'fit-call-slides'
OUT = ROOT / 'assets' / 'fit-call'
SHEET = SRC / 'contact-sheet.webp'
# Contact-sheet geometry (2000×675): five 354×628 panels, 46 px apart, 23 px margins.
PANEL_W, PANEL_H, PANEL_X0, PANEL_STEP, PANEL_Y0 = 354, 628, 23, 400, 23
MAX_W = 1080

OUT.mkdir(parents=True, exist_ok=True)
sheet = Image.open(SHEET).convert('RGB') if SHEET.exists() else None
for n in range(1, 6):
    original = next((p for ext in ('png', 'jpg', 'jpeg', 'webp') for p in [SRC / f'slide-{n}.{ext}'] if p.exists()), None)
    if original:
        im = Image.open(original).convert('RGB')
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        source = original.name
    elif sheet:
        x = PANEL_X0 + (n - 1) * PANEL_STEP
        im = sheet.crop((x, PANEL_Y0, x + PANEL_W, PANEL_Y0 + PANEL_H))
        source = f'contact-sheet.webp panel {n} (placeholder resolution)'
    else:
        raise SystemExit(f'no source for slide {n}: add slide-{n}.png to {SRC}')
    dest = OUT / f'slide-{n}.webp'
    im.save(dest, 'WEBP', quality=82, method=6)
    print(f'{dest.relative_to(ROOT)}  {im.width}x{im.height}  {dest.stat().st_size:,} B  <- {source}')
