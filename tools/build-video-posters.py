#!/usr/bin/env python3
"""Write a 1280x720 WebP poster next to the Making the Pieces Fit poster JPG.

The JPG stays as the Open Graph image (LinkedIn does not accept WebP); the
WebP is what the <video poster> attribute references. Requires Pillow.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
for name in ["making-the-pieces-fit-poster.jpg"]:
    jpg = ROOT / name
    im = Image.open(jpg).convert("RGB").resize((1280, 720), Image.LANCZOS)
    out = jpg.with_suffix(".webp")
    im.save(out, "WEBP", quality=80, method=6)
    print(f"{jpg.name} -> {out.name} (1280x720, {out.stat().st_size} bytes)")
