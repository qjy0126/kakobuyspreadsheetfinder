#!/usr/bin/env python3
"""Generate static category pages: /shoes/, /hoodies/, … (sister-site style)."""
from __future__ import annotations

import json
import re
import shutil
from collections import defaultdict
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_JS = ROOT / "js" / "products.js"
ORIGIN = "https://kakobuyspreadsheetfinder.com"
TODAY = date.today().isoformat()
TODAY_LABEL = date.today().strftime("%d %b %Y").lstrip("0")

# slug → (label, title template, h1 template, desc template, keyword hints)
CAT_META: dict[str, dict[str, str]] = {
    "shoes": {
        "label": "Shoes",
        "title": "Kakobuy Shoes Spreadsheet 2026 — Replica Sneakers Item Finder",
        "h1": "Kakobuy shoes spreadsheet — {n} finds",
        "desc": "{n} Kakobuy shoes with USD prices, QC photos and agent links. Free sneakers spreadsheet — Jordan, slides, Shox.",
        "kw": "kakobuy shoes, kakobuy sneakers, replica shoes spreadsheet",
    },
    "hoodies": {
        "label": "Hoodies",
        "title": "Kakobuy Hoodies Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy hoodies spreadsheet — {n} finds",
        "desc": "{n} Kakobuy hoodies with USD prices, QC photos and agent links. Free hoodie spreadsheet — tech fleece, zip-ups.",
        "kw": "kakobuy hoodies, replica hoodie spreadsheet",
    },
    "jackets": {
        "label": "Jackets",
        "title": "Kakobuy Jackets Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy jackets spreadsheet — {n} finds",
        "desc": "{n} Kakobuy jackets with USD prices, QC photos and agent links. Free outerwear spreadsheet — puffers, windbreakers.",
        "kw": "kakobuy jackets, replica jacket spreadsheet",
    },
    "t-shirts": {
        "label": "T-shirts",
        "title": "Kakobuy T-shirts Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy t-shirts spreadsheet — {n} finds",
        "desc": "{n} Kakobuy t-shirts with USD prices, QC photos and agent links. Free tee spreadsheet — polos, graphics.",
        "kw": "kakobuy t-shirts, replica tee spreadsheet",
    },
    "pants": {
        "label": "Pants",
        "title": "Kakobuy Pants Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy pants spreadsheet — {n} finds",
        "desc": "{n} Kakobuy pants with USD prices, QC photos and agent links. Free bottoms spreadsheet — cargos, shorts.",
        "kw": "kakobuy pants, replica pants spreadsheet",
    },
    "bags": {
        "label": "Bags",
        "title": "Kakobuy Bags Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy bags spreadsheet — {n} finds",
        "desc": "{n} Kakobuy bags with USD prices, QC photos and agent links. Free bag spreadsheet — crossbody, backpacks.",
        "kw": "kakobuy bags, replica bag spreadsheet",
    },
    "accessories": {
        "label": "Accessories",
        "title": "Kakobuy Accessories Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy accessories spreadsheet — {n} finds",
        "desc": "{n} Kakobuy accessories with USD prices, QC photos and agent links. Free accessories spreadsheet — belts, wallets.",
        "kw": "kakobuy accessories, replica accessories spreadsheet",
    },
    "headwear": {
        "label": "Headwear",
        "title": "Kakobuy Headwear Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy headwear spreadsheet — {n} finds",
        "desc": "{n} Kakobuy caps and beanies with USD prices, QC photos and agent links. Free headwear spreadsheet.",
        "kw": "kakobuy caps, replica hat spreadsheet",
    },
    "watches": {
        "label": "Watches",
        "title": "Kakobuy Watches Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy watches spreadsheet — {n} finds",
        "desc": "{n} Kakobuy watches with USD prices, QC photos and agent links. Free watch spreadsheet.",
        "kw": "kakobuy watches, replica watch spreadsheet",
    },
    "glasses": {
        "label": "Glasses",
        "title": "Kakobuy Glasses Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy glasses spreadsheet — {n} finds",
        "desc": "{n} Kakobuy sunglasses with USD prices, QC photos and agent links. Free glasses spreadsheet.",
        "kw": "kakobuy glasses, replica sunglasses spreadsheet",
    },
    "jersey": {
        "label": "Jerseys",
        "title": "Kakobuy Jerseys Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy jerseys spreadsheet — {n} finds",
        "desc": "{n} Kakobuy jerseys with USD prices, QC photos and agent links. Free jersey spreadsheet — sports kits.",
        "kw": "kakobuy jersey, replica jersey spreadsheet",
    },
    "underwear": {
        "label": "Underwear",
        "title": "Kakobuy Underwear Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy underwear spreadsheet — {n} finds",
        "desc": "{n} Kakobuy underwear finds with USD prices, QC photos and agent links.",
        "kw": "kakobuy underwear, replica underwear spreadsheet",
    },
    "perfume": {
        "label": "Perfume",
        "title": "Kakobuy Perfume Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy perfume spreadsheet — {n} finds",
        "desc": "{n} Kakobuy fragrances with USD prices and agent links. Free perfume spreadsheet.",
        "kw": "kakobuy perfume, replica fragrance spreadsheet",
    },
    "sets": {
        "label": "Sets",
        "title": "Kakobuy Sets Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy sets spreadsheet — {n} finds",
        "desc": "{n} Kakobuy matching sets with USD prices, QC photos and agent links.",
        "kw": "kakobuy sets, replica tracksuit spreadsheet",
    },
    "bricks": {
        "label": "Bricks",
        "title": "Kakobuy Bricks Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy bricks spreadsheet — {n} finds",
        "desc": "{n} Kakobuy brick and toy finds with USD prices and agent links.",
        "kw": "kakobuy bricks, replica lego spreadsheet",
    },
    "other": {
        "label": "Other",
        "title": "Kakobuy Other Finds Spreadsheet 2026 — Item Finder",
        "h1": "More Kakobuy finds — {n} items",
        "desc": "{n} extra Kakobuy finds with USD prices, QC photos and agent links.",
        "kw": "kakobuy spreadsheet, kakobuy finds",
    },
}

RESERVED = {
    "about",
    "contact",
    "css",
    "img",
    "js",
    "item",
    "scripts",
    "articles",
    "deals",
    "coupons",
    "faq",
    "privacy",
    "terms",
    "disclaimer",
    "qc-finder",
    "spreadsheet",
}


def load_catalog() -> dict:
    text = PRODUCTS_JS.read_text(encoding="utf-8")
    m = re.search(r"KakoHub\.catalog\s*=\s*(\{.*\})\s*;?\s*$", text, re.S)
    if not m:
        raise SystemExit("Could not parse KakoHub.catalog")
    return json.loads(m.group(1))


def cat_info(slug: str, n: int) -> dict:
    raw = CAT_META.get(slug) or {
        "label": slug.replace("-", " ").title(),
        "title": f"Kakobuy {slug.replace('-', ' ').title()} Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy {label} spreadsheet — {n} finds",
        "desc": "{n} Kakobuy {label} finds with USD prices, QC photos and agent links.",
        "kw": f"kakobuy {slug}, kakobuy spreadsheet",
    }
    label = raw["label"]
    return {
        "slug": slug,
        "label": label,
        "title": raw["title"].format(n=n, label=label),
        "h1": raw["h1"].format(n=f"{n:,}", label=label.lower()),
        "desc": raw["desc"].format(n=f"{n:,}", label=label.lower()),
        "kw": raw["kw"],
    }


def money(n) -> str:
    try:
        v = float(n)
    except (TypeError, ValueError):
        return "—"
    if not v:
        return "—"
    return f"${int(v)}" if v == int(v) else f"${v:.2f}"


def rating_of(p: dict) -> str:
    opens = float(p.get("opens") or 0)
    base = 7.2 + min(2.2, opens / 3500)
    return f"{min(9.8, round(base * 10) / 10):.1f}"


def card_html(p: dict, cat_slug: str) -> str:
    pid = str(p.get("id") or "")
    title = escape(str(p.get("title") or "Find"))
    brand = escape(str(p.get("brand") or p.get("categoryLabel") or ""))
    price = money(p.get("price"))
    img = str(p.get("image") or "")
    if img and not img.startswith(("http://", "https://", "/")):
        img = f"../{img}"
    img_html = (
        f'<img src="{escape(img)}" alt="" loading="lazy" decoding="async" width="400" height="400" />'
        if img
        else ""
    )
    hay = escape(
        " ".join(
            filter(
                None,
                [
                    str(p.get("title") or ""),
                    str(p.get("brand") or ""),
                    str(p.get("categoryLabel") or ""),
                    *([str(t) for t in (p.get("tags") or [])]),
                ],
            )
        ).lower()
    )
    href = f"../item.html?id={escape(pid)}&amp;cat={escape(cat_slug)}"
    label = escape(str(p.get("categoryLabel") or cat_slug))
    return f"""<a class="product-card find-card" href="{href}" data-item="{hay}" data-cat="{escape(cat_slug)}">
      <div class="find-media">
        <span class="find-rating"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 18l.9-5.4L4.2 8.7l5.4-.8z"/></svg> {rating_of(p)}/10</span>
        <span class="find-ext" aria-hidden="true">→</span>
        {img_html}
      </div>
      <div class="find-body">
        <p class="find-cat">{label}</p>
        <h3>{title}</h3>
        <div class="find-foot">
          <span class="find-price">{price}</span>
          <span class="find-actions"><span class="find-view"><i>K</i> View</span></span>
        </div>
      </div>
    </a>"""


def cat_chip_links(current: str, counts: dict[str, int], slugs: list[str]) -> str:
    chips = [
        f'<a class="cat-chip" href="../spreadsheet.html"><span>All</span></a>',
    ]
    for slug in slugs:
        info = cat_info(slug, counts.get(slug, 0))
        active = " active" if slug == current else ""
        n = counts.get(slug, 0)
        chips.append(
            f'<a class="cat-chip{active}" href="../{escape(slug)}/">'
            f"<span>{escape(info['label'])}</span>"
            f'<span class="cat-count">{n:,}</span></a>'
        )
    return "\n          ".join(chips)


def category_page(slug: str, items: list[dict], all_slugs: list[str], counts: dict[str, int]) -> str:
    n = len(items)
    info = cat_info(slug, n)
    url = f"{ORIGIN}/{slug}/"
    cards = "".join(card_html(p, slug) for p in items)
    schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": info["title"],
        "url": url,
        "description": info["desc"],
        "isPartOf": {"@id": f"{ORIGIN}/#website"},
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": n,
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": i,
                    "url": f"{ORIGIN}/item.html?id={p['id']}&cat={slug}",
                    "name": p.get("title") or "",
                }
                for i, p in enumerate(items[:40], 1)
            ],
        },
    }
    chips = cat_chip_links(slug, counts, all_slugs)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="theme-color" content="#fb2840" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(info["title"])}</title>
  <meta name="description" content="{escape(info["desc"])}" />
  <meta name="keywords" content="{escape(info["kw"])}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="{url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Kakobuyspreadsheet" />
  <meta property="og:title" content="{escape(info["title"])}" />
  <meta property="og:description" content="{escape(info["desc"])}" />
  <meta property="og:url" content="{url}" />
  <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
  <link rel="icon" type="image/png" href="../img/favicon.png" />
  <link rel="apple-touch-icon" href="../img/apple-touch-icon.png" sizes="180x180" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Kakobuyspreadsheet" />
  <script src="../js/pwa-boot.js"></script>
  <link rel="stylesheet" href="../css/style.css" />
</head>
<body data-page="category" data-cat="{escape(slug)}">
  <div class="promo"><div class="wrap">Kakobuy {escape(info["label"])} Spreadsheet · <a href="../coupons.html">coupons</a></div></div>
  <header class="site-header">
    <div class="wrap header-row">
      <a class="brand" href="../index.html"><span class="brand-mark">K</span><span class="brand-name">Kakobuy<span>spreadsheet</span></span></a>
      <nav class="nav-tools">
        <a class="active" href="../spreadsheet.html">Spreadsheet</a>
        <a href="../qc-finder.html">QC Finder</a>
        <a href="../index.html#converter">Converter</a>
        <a href="../coupons.html">Coupons</a>
        <a href="../faq.html">FAQ</a>
      </nav>
      <div class="header-actions">
        <button type="button" class="search-trigger" id="search-trigger" aria-label="Search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <span>Search reps, brands, items…</span>
        </button>
        <button type="button" class="menu-btn" id="menu-btn" aria-label="Menu"><span></span></button>
      </div>
    </div>
  </header>
  <div class="backdrop" id="backdrop"></div>
  <nav class="mobile-nav" id="mobile-nav">
    <a href="../spreadsheet.html">Spreadsheet</a>
    <a href="../qc-finder.html">QC Finder</a>
    <a href="../coupons.html">Coupons</a>
    <a href="../faq.html">FAQ</a>
  </nav>

  <main>
    <section class="page-hero">
      <div class="wrap">
        <div class="crumbs"><a href="../index.html">Home</a> / <a href="../spreadsheet.html">Spreadsheet</a> / <span>{escape(info["label"])}</span></div>
        <div class="updated"><i></i> Updated: <span data-site-updated>{TODAY_LABEL}</span></div>
        <h1 id="sheet-h1">{escape(info["h1"])}</h1>
        <p class="lede" id="sheet-lede">{escape(info["desc"])}</p>
        <div class="finder-shell">
          <label class="field-label" for="sheet-search">Search {escape(info["label"].lower())}</label>
          <input class="field" id="sheet-search" type="search" placeholder="Brand, model, keyword…" />
          <p class="tool-note"><span id="sheet-count">{n:,} finds in {escape(info["label"].lower())}</span> · No signup.</p>
        </div>
      </div>
    </section>

    <section class="section tight">
      <div class="wrap">
        <div class="cat-strip cat-strip-row" id="cat-strip">
          {chips}
        </div>
        <div class="sheet-meta" id="sheet-meta"><strong>{n:,}</strong> products</div>
        <div class="product-grid sheet-grid" id="grid">{cards}</div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="wrap legal">© Kakobuyspreadsheet 2026 · <a href="../about.html">About</a> · <a href="../contact.html">Contact</a> · <a href="../privacy.html">Privacy</a> · <a href="../terms.html">Terms</a> · <a href="../sitemap.xml">Sitemap</a></div>
  </footer>
  <div class="cmd-overlay" id="cmd-overlay" role="dialog" aria-label="Search"><div class="cmd-box" id="cmd-box"></div></div>
  <script src="../js/build-info.js"></script>
  <script src="../js/products.js"></script>
  <script src="../js/app.js"></script>
</body>
</html>
"""


def main() -> None:
    catalog = load_catalog()
    products = catalog.get("products") or []
    by_cat: dict[str, list] = defaultdict(list)
    for p in products:
        slug = str(p.get("category") or "other")
        if slug in RESERVED:
            continue
        by_cat[slug].append(p)

    for slug, items in by_cat.items():
        items.sort(key=lambda x: (-float(x.get("opens") or 0), str(x.get("title") or "")))

    # Prefer catalog order for chip strip, then any extras
    ordered = []
    for c in catalog.get("categories") or []:
        s = c.get("slug")
        if s and s in by_cat and s not in ordered:
            ordered.append(s)
    for s in sorted(by_cat.keys()):
        if s not in ordered:
            ordered.append(s)

    counts = {s: len(by_cat[s]) for s in ordered}

    for slug in ordered:
        folder = ROOT / slug
        if folder.exists():
            shutil.rmtree(folder)
        folder.mkdir(parents=True, exist_ok=True)
        html = category_page(slug, by_cat[slug], ordered, counts)
        (folder / "index.html").write_text(html, encoding="utf-8")
        print(f"  /{slug}/  {counts[slug]} items")

    print(f"category pages: {len(ordered)}  ({TODAY})")


if __name__ == "__main__":
    main()
