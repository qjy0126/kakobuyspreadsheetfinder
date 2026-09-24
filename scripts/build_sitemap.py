#!/usr/bin/env python3
"""Build sitemap.xml from core pages + js/products.js catalog."""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_JS = ROOT / "js" / "products.js"
OUT = ROOT / "sitemap.xml"
ORIGIN = "https://kakobuyspreadsheetfinder.com"

# (path, changefreq, priority)
CORE = [
    ("/", "daily", "1.0"),
    ("/spreadsheet.html", "daily", "0.9"),
    ("/qc-finder.html", "weekly", "0.9"),
    ("/coupons.html", "weekly", "0.8"),
    ("/deals.html", "weekly", "0.8"),
    ("/faq.html", "monthly", "0.7"),
    ("/about.html", "monthly", "0.6"),
    ("/contact.html", "monthly", "0.6"),
    ("/privacy.html", "yearly", "0.3"),
    ("/terms.html", "yearly", "0.3"),
    ("/disclaimer.html", "yearly", "0.3"),
]


def load_catalog() -> dict:
    text = PRODUCTS_JS.read_text(encoding="utf-8")
    m = re.search(r"KakoHub\.catalog\s*=\s*(\{.*\})\s*;?\s*$", text, re.S)
    if not m:
        raise SystemExit("Could not parse KakoHub.catalog from js/products.js")
    return json.loads(m.group(1))


def url_entry(loc: str, lastmod: str, changefreq: str, priority: str | None = None) -> str:
    parts = [
        "  <url>",
        f"    <loc>{escape(loc)}</loc>",
        f"    <lastmod>{lastmod}</lastmod>",
        f"    <changefreq>{changefreq}</changefreq>",
    ]
    if priority:
        parts.append(f"    <priority>{priority}</priority>")
    parts.append("  </url>")
    return "\n".join(parts)


def main() -> None:
    catalog = load_catalog()
    products = catalog.get("products") or []
    categories = catalog.get("categories") or []
    lastmod = date.today().isoformat()

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    for path, freq, pri in CORE:
        lines.append(url_entry(f"{ORIGIN}{path}", lastmod, freq, pri))

    for cat in categories:
        slug = cat.get("slug")
        if not slug:
            continue
        loc = f"{ORIGIN}/{slug}/"
        lines.append(url_entry(loc, lastmod, "weekly", "0.85"))
        lines.append(url_entry(f"{ORIGIN}/pl/{slug}/", lastmod, "weekly", "0.8"))

    # Polish home
    lines.append(url_entry(f"{ORIGIN}/pl.html", lastmod, "weekly", "0.9"))

    seen: set[str] = set()
    for p in products:
        pid = str(p.get("id") or "").strip()
        if not pid or pid in seen:
            continue
        seen.add(pid)
        loc = f"{ORIGIN}/item.html?id={pid}"
        cat = str(p.get("category") or "").strip()
        if cat:
            loc += f"&cat={cat}"
        lines.append(url_entry(loc, lastmod, "weekly", "0.5"))

    lines.append("</urlset>")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(
        f"Wrote {OUT.name}: {len(CORE)} core + {len(categories)} categories "
        f"+ {len(seen)} items = {len(CORE) + len(categories) + len(seen)} URLs"
    )


if __name__ == "__main__":
    main()
