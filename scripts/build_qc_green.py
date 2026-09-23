#!/usr/bin/env python3
"""Scan img/products for warehouse green-mat QC shots (-2/-3) → js/qc-green.js"""
from pathlib import Path
from PIL import Image
import json, statistics

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "img" / "products"
OUT = ROOT / "js" / "qc-green.js"

files = sorted(list(PRODUCTS.glob("*-2.webp")) + list(PRODUCTS.glob("*-3.webp")))
green = []
for f in files:
    try:
        im = Image.open(f).convert("RGB").resize((32, 32))
        px = list(im.getdata())
        edges = [
            px[y * 32 + x]
            for y in range(32)
            for x in range(32)
            if x < 3 or x > 28 or y < 3 or y > 28
        ]
        var = statistics.pvariance(p[1] for p in px)
        hits = sum(
            1
            for r, g, b in edges
            if 90 <= g <= 220 and g > r + 25 and g > b + 20 and (g - r) + (g - b) > 50
        )
        ratio = hits / len(edges)
        dark = sum(1 for r, g, b in edges if r + g + b < 80) / len(edges)
        if ratio >= 0.35 and var >= 300:
            green.append(
                {
                    "src": f"img/products/{f.name}",
                    "id": f.stem.split("-")[0],
                    "ratio": round(ratio, 3),
                    "dark": round(dark, 3),
                    "var": int(var),
                }
            )
    except Exception:
        pass

green.sort(key=lambda x: (-(x["dark"] > 0.02), -x["ratio"], -x["var"]))
payload = {
    "count": len(green),
    "images": [{"src": g["src"], "id": g["id"]} for g in green],
}
OUT.write_text(
    "window.KakoHub=window.KakoHub||{};KakoHub.qcGreen="
    + json.dumps(payload, separators=(",", ":"))
    + ";\n"
)
print(f"Wrote {len(green)} green QC images → {OUT.relative_to(ROOT)}")
