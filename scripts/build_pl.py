#!/usr/bin/env python3
"""Generate Polish landing + category pages: /pl.html and /pl/{slug}/."""
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

CAT_META_PL: dict[str, dict[str, str]] = {
    "shoes": {
        "label": "Buty",
        "title": "Kakobuy Buty Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet butów — {n} znalezisk",
        "desc": "{n} butów Kakobuy z cenami, zdjęciami QC i linkami do agenta. Darmowa lista sneakersów.",
        "kw": "kakobuy buty, kakobuy sneakers, spreadsheet butów",
    },
    "hoodies": {
        "label": "Bluzy",
        "title": "Kakobuy Bluzy Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet bluz — {n} znalezisk",
        "desc": "{n} bluz Kakobuy z cenami, zdjęciami QC i linkami. Darmowa lista hoodies.",
        "kw": "kakobuy bluzy, hoodie spreadsheet",
    },
    "jackets": {
        "label": "Kurtki",
        "title": "Kakobuy Kurtki Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet kurtek — {n} znalezisk",
        "desc": "{n} kurtek Kakobuy z cenami, zdjęciami QC i linkami.",
        "kw": "kakobuy kurtki, jacket spreadsheet",
    },
    "t-shirts": {
        "label": "Koszulki",
        "title": "Kakobuy Koszulki Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet koszulek — {n} znalezisk",
        "desc": "{n} koszulek Kakobuy z cenami, zdjęciami QC i linkami.",
        "kw": "kakobuy koszulki, t-shirt spreadsheet",
    },
    "pants": {
        "label": "Spodnie",
        "title": "Kakobuy Spodnie Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet spodni — {n} znalezisk",
        "desc": "{n} spodni Kakobuy z cenami, zdjęciami QC i linkami.",
        "kw": "kakobuy spodnie, pants spreadsheet",
    },
    "bags": {
        "label": "Torby",
        "title": "Kakobuy Torby Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet toreb — {n} znalezisk",
        "desc": "{n} toreb Kakobuy z cenami, zdjęciami QC i linkami.",
        "kw": "kakobuy torby, bags spreadsheet",
    },
    "accessories": {
        "label": "Akcesoria",
        "title": "Kakobuy Akcesoria Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet akcesoriów — {n} znalezisk",
        "desc": "{n} akcesoriów Kakobuy z cenami, zdjęciami QC i linkami.",
        "kw": "kakobuy akcesoria, accessories spreadsheet",
    },
    "headwear": {
        "label": "Czapki",
        "title": "Kakobuy Czapki Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet czapek — {n} znalezisk",
        "desc": "{n} czapek Kakobuy z cenami, zdjęciami QC i linkami.",
        "kw": "kakobuy czapki, headwear spreadsheet",
    },
    "watches": {
        "label": "Zegarki",
        "title": "Kakobuy Zegarki Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet zegarków — {n} znalezisk",
        "desc": "{n} zegarków Kakobuy z cenami, zdjęciami QC i linkami.",
        "kw": "kakobuy zegarki, watches spreadsheet",
    },
    "glasses": {
        "label": "Okulary",
        "title": "Kakobuy Okulary Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet okularów — {n} znalezisk",
        "desc": "{n} okularów Kakobuy z cenami, zdjęciami QC i linkami.",
        "kw": "kakobuy okulary, glasses spreadsheet",
    },
    "jersey": {
        "label": "Jersey",
        "title": "Kakobuy Jersey Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet jersey — {n} znalezisk",
        "desc": "{n} koszulek piłkarskich Kakobuy z cenami, zdjęciami QC i linkami.",
        "kw": "kakobuy jersey, football jersey spreadsheet",
    },
    "underwear": {
        "label": "Bielizna",
        "title": "Kakobuy Bielizna Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet bielizny — {n} znalezisk",
        "desc": "{n} sztuk bielizny Kakobuy z cenami i linkami.",
        "kw": "kakobuy bielizna, underwear spreadsheet",
    },
    "perfume": {
        "label": "Perfumy",
        "title": "Kakobuy Perfumy Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet perfum — {n} znalezisk",
        "desc": "{n} perfum Kakobuy z cenami i linkami.",
        "kw": "kakobuy perfumy, perfume spreadsheet",
    },
    "sets": {
        "label": "Komplety",
        "title": "Kakobuy Komplety Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet kompletów — {n} znalezisk",
        "desc": "{n} kompletów Kakobuy z cenami, zdjęciami QC i linkami.",
        "kw": "kakobuy komplety, sets spreadsheet",
    },
    "bricks": {
        "label": "Klocki",
        "title": "Kakobuy Klocki Spreadsheet 2026 — Item Finder",
        "h1": "Kakobuy spreadsheet klocków — {n} znalezisk",
        "desc": "{n} klocków i zabawek Kakobuy z cenami i linkami.",
        "kw": "kakobuy klocki, bricks spreadsheet",
    },
    "other": {
        "label": "Inne",
        "title": "Kakobuy Inne znaleziska Spreadsheet 2026",
        "h1": "Więcej znalezisk Kakobuy — {n} pozycji",
        "desc": "{n} dodatkowych znalezisk Kakobuy z cenami, zdjęciami QC i linkami.",
        "kw": "kakobuy spreadsheet, kakobuy znaleziska",
    },
}

RESERVED = {
    "about", "contact", "css", "img", "js", "item", "scripts", "articles",
    "deals", "coupons", "faq", "privacy", "terms", "disclaimer", "qc-finder",
    "spreadsheet", "pl",
}


def load_catalog() -> dict:
    text = PRODUCTS_JS.read_text(encoding="utf-8")
    m = re.search(r"KakoHub\.catalog\s*=\s*(\{.*\})\s*;?\s*$", text, re.S)
    if not m:
        raise SystemExit("Could not parse catalog")
    return json.loads(m.group(1))


def cat_info(slug: str, n: int) -> dict:
    raw = CAT_META_PL.get(slug) or {
        "label": slug,
        "title": f"Kakobuy {slug} Spreadsheet 2026",
        "h1": "Kakobuy {label} — {n} znalezisk",
        "desc": "{n} znalezisk Kakobuy w tej kategorii.",
        "kw": f"kakobuy {slug}",
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
    usd = float(p.get("price") or 0)
    price = money(usd)
    price_attr = f"{usd:g}" if usd else "0"
    img = str(p.get("image") or "")
    if img and not img.startswith(("http://", "https://", "/")):
        img = f"../../{img}"
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
    href = f"../../item.html?id={escape(pid)}&amp;cat={escape(cat_slug)}"
    label = escape(cat_info(cat_slug, 0)["label"])
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
          <span class="find-price" data-usd="{price_attr}">{price}</span>
          <span class="find-actions"><span class="find-view"><i>K</i> Zobacz</span></span>
        </div>
      </div>
    </a>"""


def cat_chip_links(current: str, counts: dict[str, int], slugs: list[str]) -> str:
    chips = ['<a class="cat-chip" href="../../spreadsheet.html"><span>Wszystkie</span></a>']
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
    url = f"{ORIGIN}/pl/{slug}/"
    en_url = f"{ORIGIN}/{slug}/"
    cards = "".join(card_html(p, slug) for p in items)
    schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": info["title"],
        "url": url,
        "description": info["desc"],
        "inLanguage": "pl",
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
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="theme-color" content="#fb2840" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(info["title"])}</title>
  <meta name="description" content="{escape(info["desc"])}" />
  <meta name="keywords" content="{escape(info["kw"])}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="{url}" />
  <link rel="alternate" hreflang="en" href="{en_url}" />
  <link rel="alternate" hreflang="pl" href="{url}" />
  <link rel="alternate" hreflang="x-default" href="{en_url}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="pl_PL" />
  <meta property="og:site_name" content="Kakobuyspreadsheet" />
  <meta property="og:title" content="{escape(info["title"])}" />
  <meta property="og:description" content="{escape(info["desc"])}" />
  <meta property="og:url" content="{url}" />
  <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
  <link rel="icon" type="image/png" href="../../img/favicon.png" />
  <link rel="apple-touch-icon" href="../../img/apple-touch-icon.png" sizes="180x180" />
  <link rel="manifest" href="/manifest.json" />
  <script src="../../js/pwa-boot.js"></script>
  <link rel="stylesheet" href="../../css/style.css" />
</head>
<body data-page="category" data-lang="pl" data-cat="{escape(slug)}">
  <div class="promo"><div class="wrap">Kakobuy {escape(info["label"])} Spreadsheet · <a href="../../coupons.html">kupony</a></div></div>
  <header class="site-header">
    <div class="wrap header-row">
      <a class="brand" href="../../pl.html"><span class="brand-mark">K</span><span class="brand-name">Kakobuy<span>spreadsheet</span></span></a>
      <nav class="nav-tools">
        <a class="active" href="../../spreadsheet.html">Spreadsheet</a>
        <a href="../../qc-finder.html">QC Finder</a>
        <a href="../../pl.html#converter">Konwerter</a>
        <a href="../../coupons.html">Kupony</a>
        <a href="../../faq.html">FAQ</a>
      </nav>
      <div class="header-actions">
        <button type="button" class="search-trigger" id="search-trigger" aria-label="Szukaj">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <span>Szukaj marek, rzeczy…</span>
        </button>
        <span class="chip" id="prefs-chip" data-prefs="1" role="button" tabindex="0">PL · <strong>USD</strong> · Kakobuy</span>
        <button type="button" class="menu-btn" id="menu-btn" aria-label="Menu"><span></span></button>
      </div>
    </div>
  </header>
  <div class="backdrop" id="backdrop"></div>
  <nav class="mobile-nav" id="mobile-nav">
    <a href="../../spreadsheet.html">Spreadsheet</a>
    <a href="../../qc-finder.html">QC Finder</a>
    <a href="../../coupons.html">Kupony</a>
    <a href="../../faq.html">FAQ</a>
  </nav>
  <main>
    <section class="page-hero">
      <div class="wrap">
        <div class="crumbs"><a href="../../pl.html">Strona główna</a> / <a href="../../spreadsheet.html">Spreadsheet</a> / <span>{escape(info["label"])}</span></div>
        <div class="updated"><i></i> Aktualizacja: <span data-site-updated>{TODAY_LABEL}</span></div>
        <h1 id="sheet-h1">{escape(info["h1"])}</h1>
        <p class="lede" id="sheet-lede">{escape(info["desc"])}</p>
        <div class="finder-shell">
          <label class="field-label" for="sheet-search">Szukaj w {escape(info["label"].lower())}</label>
          <input class="field" id="sheet-search" type="search" placeholder="Marka, model, słowo kluczowe…" />
          <p class="tool-note"><span id="sheet-count">{n:,} znalezisk w {escape(info["label"].lower())}</span> · Bez rejestracji.</p>
        </div>
      </div>
    </section>
    <section class="section tight">
      <div class="wrap">
        <div class="cat-strip cat-strip-row" id="cat-strip">
          {chips}
        </div>
        <div class="sheet-meta" id="sheet-meta"><strong>{n:,}</strong> produktów</div>
        <div class="product-grid sheet-grid" id="grid">{cards}</div>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="wrap legal">© Kakobuyspreadsheet 2026 · <a href="../../about.html">About</a> · <a href="../../contact.html">Contact</a> · <a href="../../privacy.html">Privacy</a> · <a href="../../sitemap.xml">Sitemap</a></div>
  </footer>
  <div class="cmd-overlay" id="cmd-overlay" role="dialog" aria-label="Szukaj"><div class="cmd-box" id="cmd-box"></div></div>
  <script src="../../js/build-info.js"></script>
  <script src="../../js/products.js"></script>
  <script src="../../js/app.js"></script>
</body>
</html>
"""


def write_home(catalog: dict) -> None:
    count = catalog.get("count") or len(catalog.get("products") or [])
    html = f"""<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kakobuy Item Finder PL: Spreadsheet i QC Finder 2026</title>
  <meta name="description" content="Darmowy hub Kakobuy po polsku: spreadsheet, QC Finder, konwerter linków i kupony. {count}+ zweryfikowanych znalezisk." />
  <meta name="robots" content="index, follow" />
  <meta name="theme-color" content="#fb2840" />
  <link rel="canonical" href="{ORIGIN}/pl.html" />
  <link rel="alternate" hreflang="en" href="{ORIGIN}/" />
  <link rel="alternate" hreflang="pl" href="{ORIGIN}/pl.html" />
  <link rel="alternate" hreflang="x-default" href="{ORIGIN}/" />
  <meta property="og:title" content="Kakobuy Item Finder PL — Spreadsheet i QC Finder" />
  <meta property="og:description" content="Darmowy hub Kakobuy: spreadsheet, QC Finder i kupony. {count}+ znalezisk." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="{ORIGIN}/pl.html" />
  <meta property="og:locale" content="pl_PL" />
  <link rel="icon" type="image/png" href="img/favicon.png" />
  <link rel="apple-touch-icon" href="img/apple-touch-icon.png" sizes="180x180" />
  <link rel="manifest" href="/manifest.json" />
  <script src="js/pwa-boot.js"></script>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body data-page="home" data-lang="pl">
  <div class="promo">
    <div class="wrap">
      <span class="promo-pill">Deal</span>
      Kod <strong>FINDS20</strong> — 20% taniej za shipping · <a href="coupons.html">Kupony Kakobuy</a>
    </div>
  </div>
  <header class="site-header">
    <div class="wrap header-row">
      <a class="brand" href="pl.html">
        <span class="brand-mark">K</span>
        <span class="brand-name">Kakobuy<span>spreadsheet</span></span>
      </a>
      <nav class="nav-tools" aria-label="Narzędzia">
        <a href="spreadsheet.html">Spreadsheet</a>
        <a href="qc-finder.html">QC Finder</a>
        <a href="pl.html#converter">Konwerter</a>
        <a href="pl.html#estimate">Wycena</a>
        <a href="deals.html">Promocje</a>
        <a href="coupons.html">Kupony</a>
        <a href="faq.html">FAQ</a>
      </nav>
      <div class="header-actions">
        <button type="button" class="search-trigger" id="search-trigger" aria-label="Szukaj">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <span>Szukaj marek, rzeczy…</span>
        </button>
        <span class="chip" id="prefs-chip" data-prefs="1" role="button" tabindex="0">PL · <strong>USD</strong> · Kakobuy</span>
        <button type="button" class="btn btn-ghost pwa-header-btn" id="pwa-header-install">Dodaj na pulpit</button>
        <button type="button" class="menu-btn" id="menu-btn" aria-label="Menu"><span></span></button>
      </div>
    </div>
  </header>
  <div class="backdrop" id="backdrop"></div>
  <nav class="mobile-nav" id="mobile-nav">
    <a href="spreadsheet.html">Spreadsheet</a>
    <a href="qc-finder.html">QC Finder</a>
    <a href="deals.html">Promocje</a>
    <a href="coupons.html">Kupony</a>
    <a href="faq.html">FAQ</a>
  </nav>
  <main>
    <section class="hero">
      <div class="wrap hero-grid">
        <div class="hero-copy">
          <p class="hero-brand">KAKOBUY<span>SPREADSHEET</span></p>
          <h1>Kakobuy Item Finder, Spreadsheet i QC Finder</h1>
          <p class="lede">Darmowy hub Kakobuy: żywy spreadsheet, magazynowe QC, konwerter linków i kupony — dodaj do zakładek na każdy haul.</p>
          <div class="hero-actions">
            <a class="btn btn-red" href="spreadsheet.html">Otwórz bazę</a>
            <a class="btn btn-ghost" href="https://discord.gg/7DRMaMAADv" target="_blank" rel="noopener">Dołącz do Discord</a>
            <a class="btn btn-gold" href="https://www.kakobuy.com/register?affcode=9v88f" target="_blank" rel="noopener sponsored">Załóż konto Kakobuy</a>
          </div>
          <div class="hero-stats">
            <div>
              <strong data-count="{count}" data-suffix="+">0</strong>
              <span>Zindeksowane znaleziska</span>
            </div>
            <div>
              <strong data-count="7200" data-suffix="+">0</strong>
              <span>Użytkownicy Discord</span>
            </div>
          </div>
        </div>
        <div class="hero-stage" aria-hidden="true">
          <div class="hero-glow"></div>
          <img class="hero-mascot" src="img/mascot.png" alt="" width="220" height="556" />
        </div>
      </div>
    </section>
    <div class="wrap deals-jump">
      <a class="deals-pill" href="deals.html">Zobacz wszystkie oferty →</a>
    </div>
    <section class="section tight" id="categories">
      <div class="wrap">
        <div class="cats-head">
          <div>
            <span class="eyebrow-pill">⚡ Sklep reps</span>
            <h2>Przeglądaj <em>kategorie</em></h2>
            <p>Od butów po perfumy — skocz prosto na półkę Kakobuyspreadsheet.</p>
          </div>
        </div>
        <div class="cat-icon-grid" id="cat-icon-grid">
          <a class="cat-tile active" href="spreadsheet.html"><span>Wszystkie</span></a>
          <a class="cat-tile" href="pl/shoes/"><span>Buty</span></a>
          <a class="cat-tile" href="pl/hoodies/"><span>Bluzy</span></a>
          <a class="cat-tile" href="pl/jackets/"><span>Kurtki</span></a>
          <a class="cat-tile" href="pl/t-shirts/"><span>Koszulki</span></a>
          <a class="cat-tile" href="pl/pants/"><span>Spodnie</span></a>
          <a class="cat-tile" href="pl/bags/"><span>Torby</span></a>
          <a class="cat-tile" href="pl/accessories/"><span>Akcesoria</span></a>
          <a class="cat-tile" href="pl/watches/"><span>Zegarki</span></a>
          <a class="cat-tile" href="pl/jersey/"><span>Jersey</span></a>
        </div>
      </div>
    </section>
    <section class="section" id="converter">
      <div class="wrap">
        <div class="section-head">
          <div>
            <h2>Konwerter linków</h2>
            <p>Wklej Weidian / 1688 / Taobao — otrzymaj link Kakobuy z kodem partnerskim.</p>
          </div>
        </div>
        <p><a class="btn btn-red" href="index.html#converter">Otwórz konwerter na stronie EN</a></p>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="wrap legal">© Kakobuyspreadsheet 2026 · <a href="about.html">About</a> · <a href="contact.html">Contact</a> · <a href="privacy.html">Privacy</a> · <a href="sitemap.xml">Sitemap</a> · <a href="/">English</a></div>
  </footer>
  <div class="cmd-overlay" id="cmd-overlay" role="dialog" aria-label="Szukaj"><div class="cmd-box" id="cmd-box"></div></div>
  <script src="js/build-info.js"></script>
  <script src="js/products.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
"""
    (ROOT / "pl.html").write_text(html, encoding="utf-8")
    print("wrote pl.html")


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

    ordered = []
    for c in catalog.get("categories") or []:
        s = c.get("slug")
        if s and s in by_cat and s not in ordered:
            ordered.append(s)
    for s in sorted(by_cat.keys()):
        if s not in ordered:
            ordered.append(s)
    counts = {s: len(by_cat[s]) for s in ordered}

    write_home(catalog)

    pl_root = ROOT / "pl"
    if pl_root.exists():
        shutil.rmtree(pl_root)
    pl_root.mkdir(parents=True, exist_ok=True)

    for slug in ordered:
        folder = pl_root / slug
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "index.html").write_text(
            category_page(slug, by_cat[slug], ordered, counts), encoding="utf-8"
        )
        print(f"  /pl/{slug}/  {counts[slug]} items")

    print(f"pl category pages: {len(ordered)}  ({TODAY})")


if __name__ == "__main__":
    main()
