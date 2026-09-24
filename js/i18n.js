/* Kakobuyspreadsheet — EN/PL strings + USD/PLN currency */
(function () {
  window.KakoHub = window.KakoHub || {};

  const CAT_SLUGS = [
    "shoes", "hoodies", "jackets", "t-shirts", "pants", "bags", "accessories",
    "headwear", "watches", "glasses", "jersey", "underwear", "perfume", "sets",
    "bricks", "other",
  ];

  const RATES = {
    USD: { rate: 1, symbol: "$", code: "USD" },
    PLN: { rate: 3.95, symbol: "zł", code: "PLN" },
  };

  const STRINGS = {
    en: {
      nav_spreadsheet: "Spreadsheet",
      nav_qc: "QC Finder",
      nav_converter: "Converter",
      nav_estimate: "Estimate",
      nav_deals: "Deals",
      nav_coupons: "Coupons",
      nav_faq: "FAQ",
      search_placeholder: "Search reps, brands, items…",
      search_aria: "Search",
      add_desktop: "Add to desktop",
      language: "Language",
      currency: "Currency",
      lang_en: "English",
      lang_pl: "Polski",
      open_database: "Open the database",
      join_discord: "Join Discord",
      kakobuy_signup: "Kakobuy sign-up",
      indexed_finds: "Indexed finds",
      discord_users: "Discord users",
      see_all_deals: "See all deals",
      hot_deals: "Hot deals",
      special_offers: "Special Offers",
      special_offers_lede: "Hand-picked items at reduced prices, available for a short time only and in limited quantities.",
      verified_deals: "Verified deals",
      verified_body: "These are verified items on a short sale window. Stock is limited and build quality is strong — hurry up and grab them!",
      featured: "Featured",
      newest: "Newest",
      biggest_discounts: "Biggest discounts",
      browse_categories: "Browse categories",
      browse_categories_lede: "From sneakers to perfumes — jump straight into the Kakobuyspreadsheet shelf you care about.",
      all: "All",
      buy_kakobuy: "Buy on Kakobuy",
      view: "View",
      similar: "Similar products",
      similar_lede: "Same category — more finds you can open on-site.",
      back_spreadsheet: "back to spreadsheet",
      promo_coupon: "Code FINDS20 — 20% off shipping",
      finds: "finds",
      products: "products",
      clear_search: "Clear search",
      load_more: "Load more finds",
      fx_note: "Display rates are approximate.",
    },
    pl: {
      nav_spreadsheet: "Spreadsheet",
      nav_qc: "QC Finder",
      nav_converter: "Konwerter",
      nav_estimate: "Wycena",
      nav_deals: "Promocje",
      nav_coupons: "Kupony",
      nav_faq: "FAQ",
      search_placeholder: "Szukaj marek, rzeczy…",
      search_aria: "Szukaj",
      add_desktop: "Dodaj na pulpit",
      language: "Język",
      currency: "Waluta",
      lang_en: "English",
      lang_pl: "Polski",
      open_database: "Otwórz bazę",
      join_discord: "Dołącz do Discord",
      kakobuy_signup: "Załóż konto Kakobuy",
      indexed_finds: "Zindeksowane znaleziska",
      discord_users: "Użytkownicy Discord",
      see_all_deals: "Zobacz wszystkie oferty",
      hot_deals: "Gorące oferty",
      special_offers: "Oferty specjalne",
      special_offers_lede: "Wybrane rzeczy w obniżonych cenach — tylko przez krótki czas i w ograniczonej ilości.",
      verified_deals: "Zweryfikowane oferty",
      verified_body: "To sprawdzone pozycje w krótkim oknie wyprzedaży. Stanów jest mało — łap, póki są!",
      featured: "Wyróżnione",
      newest: "Najnowsze",
      biggest_discounts: "Największe zniżki",
      browse_categories: "Przeglądaj kategorie",
      browse_categories_lede: "Od butów po perfumy — skocz prosto na półkę Kakobuyspreadsheet.",
      all: "Wszystkie",
      buy_kakobuy: "Kup na Kakobuy",
      view: "Zobacz",
      similar: "Podobne produkty",
      similar_lede: "Ta sama kategoria — więcej znalezisk na stronie.",
      back_spreadsheet: "wróć do spreadsheet",
      promo_coupon: "Kod FINDS20 — 20% taniej za shipping",
      finds: "znalezisk",
      products: "produktów",
      clear_search: "Wyczyść wyszukiwanie",
      load_more: "Załaduj więcej",
      fx_note: "Kursy wyświetlania są orientacyjne.",
    },
  };

  const CAT_LABELS = {
    en: {
      shoes: "Shoes", hoodies: "Hoodies", jackets: "Jackets", "t-shirts": "T-shirts",
      pants: "Pants", bags: "Bags", accessories: "Accessories", headwear: "Headwear",
      watches: "Watches", glasses: "Glasses", jersey: "Jerseys", underwear: "Underwear",
      perfume: "Perfume", sets: "Sets", bricks: "Bricks", other: "Other",
    },
    pl: {
      shoes: "Buty", hoodies: "Bluzy", jackets: "Kurtki", "t-shirts": "Koszulki",
      pants: "Spodnie", bags: "Torby", accessories: "Akcesoria", headwear: "Czapki",
      watches: "Zegarki", glasses: "Okulary", jersey: "Jersey", underwear: "Bielizna",
      perfume: "Perfumy", sets: "Komplety", bricks: "Klocki", other: "Inne",
    },
  };

  function detectLang() {
    const path = location.pathname || "";
    if (path === "/pl.html" || path === "/pl" || path.startsWith("/pl/")) return "pl";
    const body = document.body && document.body.getAttribute("data-lang");
    if (body === "pl" || body === "en") return body;
    const htmlLang = (document.documentElement.getAttribute("lang") || "").slice(0, 2).toLowerCase();
    if (htmlLang === "pl" || htmlLang === "en") return htmlLang;
    return "en";
  }

  function readCurrency() {
    try {
      const c = localStorage.getItem("kh-currency");
      if (c && RATES[c]) return c;
    } catch (_) {}
    return "USD";
  }

  let lang = "en";
  let currency = "USD";

  function init() {
    lang = detectLang();
    currency = readCurrency();
  }

  function t(key, vars) {
    const pack = STRINGS[lang] || STRINGS.en;
    let s = pack[key] || STRINGS.en[key] || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = s.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
      });
    }
    return s;
  }

  function catLabel(slug) {
    return (CAT_LABELS[lang] || CAT_LABELS.en)[slug] || slug;
  }

  function money(usd) {
    const n = Number(usd) || 0;
    const info = RATES[currency] || RATES.USD;
    const v = n * info.rate;
    if (currency === "PLN") {
      const rounded = Math.round(v * 100) / 100;
      return (
        rounded.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
        " " +
        info.symbol
      );
    }
    if (!n) return "—";
    return info.symbol + (Number.isInteger(v) ? String(v) : v.toFixed(2));
  }

  function setCurrency(code) {
    if (!RATES[code]) return;
    currency = code;
    try {
      localStorage.setItem("kh-currency", code);
    } catch (_) {}
    refreshPrices();
    updateChip();
    document.dispatchEvent(new CustomEvent("kh:currency", { detail: { currency } }));
  }

  function refreshPrices() {
    document.querySelectorAll("[data-usd]").forEach((el) => {
      const usd = el.getAttribute("data-usd");
      el.textContent = money(usd);
    });
  }

  function langHref(code) {
    let path = location.pathname || "/";
    // Normalize
    if (path.endsWith("/index.html")) path = path.slice(0, -10) || "/";
    if (path.endsWith(".html") && !path.endsWith("pl.html")) {
      // tool pages stay language-shared for now; home/cats switch
    }
    if (path === "/" || path === "/index.html" || path === "/pl.html" || path === "/pl") {
      return code === "en" ? "/" : "/pl.html";
    }
    // /pl/shoes/ or /shoes/
    const stripped = path.replace(/^\/pl(?=\/)/, "") || "/";
    const cat = stripped.match(/^\/([a-z0-9-]+)\/?$/);
    if (cat && CAT_SLUGS.indexOf(cat[1]) !== -1) {
      return (code === "en" ? "" : "/pl") + "/" + cat[1] + "/";
    }
    // item pages — stay on same URL, only UI currency matters
    if (path.includes("item")) {
      return code === "en" ? path + location.search : path + location.search;
    }
    return code === "en" ? "/" : "/pl.html";
  }

  function updateChip() {
    const chip = document.getElementById("prefs-chip") || document.querySelector(".chip[data-prefs]");
    if (!chip) return;
    const langLabel = lang === "pl" ? "PL" : "EN";
    chip.innerHTML = `${langLabel} · <strong>${currency}</strong> · Kakobuy`;
  }

  function applyStaticI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) el.setAttribute("placeholder", t(key));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      if (key) el.setAttribute("aria-label", t(key));
    });
    const headerInstall = document.getElementById("pwa-header-install");
    if (headerInstall && !headerInstall.classList.contains("is-off")) {
      headerInstall.textContent = t("add_desktop");
    }
  }

  init();

  KakoHub.i18n = {
    get lang() {
      return lang;
    },
    get currency() {
      return currency;
    },
    CAT_SLUGS,
    RATES,
    STRINGS,
    CAT_LABELS,
    t,
    catLabel,
    money,
    setCurrency,
    refreshPrices,
    langHref,
    updateChip,
    applyStaticI18n,
    detectLang,
  };
  KakoHub.t = t;
  KakoHub.money = money;
})();
