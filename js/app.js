(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const AFF = "9v88f";
  const SIGNUP = `https://www.kakobuy.com/register?affcode=${AFF}`;
  const DISCORD_URL = "https://discord.gg/7DRMaMAADv";
  // Replace with your Google Form URL if different
  const GOOGLE_FORM_URL =
    "https://docs.google.com/spreadsheets/d/1ouCVXknU6RYgA1bhcB0g3cPV3yr0a210C4q7IWd1DOc/edit?gid=1593055287#gid=1593055287";

  window.KakoHub = window.KakoHub || {};

  /* Analytics — GA4 + buy_kakobuy click events */
  if (!document.querySelector('script[src*="js/analytics.js"]')) {
    const analytics = document.createElement("script");
    analytics.src = "js/analytics.js";
    analytics.async = true;
    document.head.appendChild(analytics);
  }

  function track(name, params) {
    try {
      if (typeof gtag !== "function") return;
      gtag("event", name, Object.assign({ transport_type: "beacon" }, params || {}));
    } catch (_) {}
  }
  KakoHub.track = track;

  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest("a[href*='kakobuy.com']");
      if (!a) return;
      const params = {
        link_url: a.href,
        page_path: location.pathname + location.search,
        event_source: a.classList.contains("item-buy")
          ? "item_buy"
          : a.dataset.track || "kakobuy_link",
      };
      if (a.dataset.itemId) params.item_id = a.dataset.itemId;
      if (a.dataset.itemName) params.item_name = a.dataset.itemName;
      if (a.dataset.itemCategory) params.item_category = a.dataset.itemCategory;
      if (a.dataset.itemPrice) {
        params.value = Number(a.dataset.itemPrice) || 0;
        params.currency = "USD";
      }
      track("buy_kakobuy", params);
    },
    true
  );

  /* Replace placeholder affiliate links site-wide */
  $$("a[href*='affcode=YOURCODE']").forEach((a) => {
    a.href = a.href.replace("affcode=YOURCODE", `affcode=${AFF}`);
  });

  /* Hero stat count-up */
  function formatCount(n) {
    return Math.round(n).toLocaleString("en-US");
  }
  function animateCount(el, to, suffix, duration) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.textContent = formatCount(to) + suffix;
      return;
    }
    const start = performance.now();
    const from = 0;
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = formatCount(from + (to - from) * eased) + suffix;
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = formatCount(to) + suffix;
    }
    requestAnimationFrame(frame);
  }
  function runHeroCounts() {
    const nodes = $$(".hero-stats [data-count]");
    if (!nodes.length) return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      nodes.forEach((el, i) => {
        const to = Number(el.dataset.count || 0);
        const suffix = el.dataset.suffix || "";
        setTimeout(() => animateCount(el, to, suffix, 1400 + i * 120), i * 80);
      });
    };
    const box = $(".hero-stats");
    if ("IntersectionObserver" in window && box) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            start();
            io.disconnect();
          }
        },
        { threshold: 0.35 }
      );
      io.observe(box);
    } else {
      start();
    }
  }
  runHeroCounts();

  /* Site updated date — stamped on GitHub push via js/build-info.js */
  function siteUpdatedLabel() {
    const build = (window.KakoHub && KakoHub.build && KakoHub.build.updated) || "";
    const catalogDate = (window.KakoHub && KakoHub.catalog && KakoHub.catalog.updated) || "";
    return build || catalogDate || "";
  }
  function applySiteUpdated() {
    const label = siteUpdatedLabel();
    if (!label) return;
    $$("[data-site-updated], #sheet-updated").forEach((el) => {
      el.textContent = label;
    });
    if (window.KakoHub && KakoHub.catalog) KakoHub.catalog.updated = label;
  }
  applySiteUpdated();

  /* ---------- Link converter (usable) ---------- */
  function normalizeRaw(raw) {
    let s = String(raw || "").trim();
    if (!s) return "";
    // strip wrapping quotes / angle brackets
    s = s.replace(/^['"<]+|['">]+$/g, "").trim();
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;
    return s;
  }

  function safeUrl(href) {
    try {
      return new URL(href);
    } catch (_) {
      return null;
    }
  }

  function decodeMaybe(value) {
    let v = String(value || "");
    for (let i = 0; i < 3; i++) {
      try {
        const next = decodeURIComponent(v);
        if (next === v) break;
        v = next;
      } catch (_) {
        break;
      }
    }
    return v;
  }

  function pickNestedMarketplace(urlObj) {
    if (!urlObj) return null;
    const keys = ["url", "product_url", "productUrl", "goodsUrl", "link", "shop_url"];
    for (const key of keys) {
      const v = urlObj.searchParams.get(key);
      if (!v) continue;
      const decoded = decodeMaybe(v);
      if (/weidian\.com|taobao\.com|tmall\.com|1688\.com|detail\.tmall/i.test(decoded)) {
        return decoded;
      }
    }
    // path-style: /product?id= or agent pages that only have id — leave to channel parsers
    return null;
  }

  function listingFromMarketplace(href) {
    const url = normalizeRaw(href);
    const u = safeUrl(url);
    const full = u ? u.href : url;

    // Weidian
    const wd =
      full.match(/itemID=(\d+)/i) ||
      full.match(/weidian\.com\/item\.html.*?(\d{6,})/i) ||
      full.match(/\/item\.html\?.*?(\d{6,})/i);
    if (/weidian\.com/i.test(full) || (wd && /itemID=/i.test(full))) {
      const id = wd ? wd[1] : "";
      const clean = id ? `https://weidian.com/item.html?itemID=${id}` : full.split("#")[0];
      return { channel: "Weidian", id, sourceUrl: clean };
    }

    // 1688
    const ali = full.match(/offer\/(\d+)\.html/i) || full.match(/offer\/(\d+)/i);
    if (/1688\.com/i.test(full)) {
      const id = ali ? ali[1] : "";
      const clean = id ? `https://detail.1688.com/offer/${id}.html` : full.split("#")[0];
      return { channel: "1688", id, sourceUrl: clean };
    }

    // Taobao / Tmall
    if (/taobao\.com|tmall\.com|detail\.tmall/i.test(full)) {
      let id = "";
      const m1 = full.match(/[?&]id=(\d+)/i);
      const m2 = full.match(/\/item\.htm.*?id=(\d+)/i);
      id = (m1 && m1[1]) || (m2 && m2[1]) || "";
      const clean = id
        ? `https://item.taobao.com/item.htm?id=${id}`
        : full.split("#")[0];
      return { channel: "Taobao", id, sourceUrl: clean };
    }

    return null;
  }

  function detectAgentHost(host) {
    const h = String(host || "").toLowerCase();
    const map = [
      ["kakobuy.com", "Kakobuy"],
      ["cnfans.com", "CNFans"],
      ["mulebuy.com", "Mulebuy"],
      ["oopbuy.com", "Oopbuy"],
      ["joyabuy.com", "Joyabuy"],
      ["joyagoo.com", "Joyagoo"],
      ["pandabuy.com", "Pandabuy"],
      ["sugargoo.com", "Sugargoo"],
      ["hoobuy.com", "Hoobuy"],
      ["allchinabuy.com", "AllChinaBuy"],
      ["acbuy.com", "ACbuy"],
      ["usfans.com", "USFans"],
      ["litbuy.com", "Litbuy"],
      ["superbuy.com", "Superbuy"],
      ["cssbuy.com", "CSSBuy"],
      ["wegobuy.com", "Wegobuy"],
      ["basetao.com", "Basetao"],
    ];
    for (const [needle, name] of map) {
      if (h.includes(needle)) return name;
    }
    return null;
  }

  function parseLink(raw) {
    const normalized = normalizeRaw(raw);
    if (!normalized) {
      return { ok: false, error: "Paste a product or agent link first." };
    }
    const u = safeUrl(normalized);
    if (!u) {
      return { ok: false, error: "That does not look like a valid URL." };
    }

    const agent = detectAgentHost(u.hostname);
    let marketplaceHref = null;

    // Kakobuy / other agents often wrap the real shop URL in ?url=
    const nested = pickNestedMarketplace(u);
    if (nested) marketplaceHref = nested;

    // Some agents use /product/?id=WEIDIAN_ID without nested url
    if (!marketplaceHref && agent && agent !== "Kakobuy") {
      const pid =
        u.searchParams.get("id") ||
        u.searchParams.get("itemID") ||
        u.searchParams.get("item_id") ||
        (u.pathname.match(/\/(\d{8,})\//) || [])[1];
      if (pid && /^\d{6,}$/.test(pid)) {
        // Heuristic: long numeric IDs on agent sites are usually Weidian
        marketplaceHref = `https://weidian.com/item.html?itemID=${pid}`;
      }
    }

    // Direct marketplace paste
    if (!marketplaceHref) {
      const direct = listingFromMarketplace(u.href);
      if (direct) {
        return {
          ok: true,
          from: direct.channel,
          via: null,
          id: direct.id,
          sourceUrl: direct.sourceUrl,
          kakobuyUrl: toKakobuy(direct.sourceUrl, direct.channel, direct.id),
        };
      }
    }

    if (marketplaceHref) {
      const listed = listingFromMarketplace(marketplaceHref) || {
        channel: "Marketplace",
        id: "",
        sourceUrl: marketplaceHref.split("#")[0],
      };
      return {
        ok: true,
        from: listed.channel,
        via: agent && agent !== "Kakobuy" ? agent : null,
        id: listed.id,
        sourceUrl: listed.sourceUrl,
        kakobuyUrl: toKakobuy(listed.sourceUrl, listed.channel, listed.id),
      };
    }

    // Already a Kakobuy link without nested url we understand — keep as-is but stamp affcode
    if (agent === "Kakobuy") {
      const stamped = stampAff(u.href);
      return {
        ok: true,
        from: "Kakobuy",
        via: null,
        id: "",
        sourceUrl: u.href,
        kakobuyUrl: stamped,
      };
    }

    // Last resort: wrap whatever was pasted
    return {
      ok: true,
      from: agent || "Link",
      via: null,
      id: "",
      sourceUrl: u.href,
      kakobuyUrl: toKakobuy(u.href, "Link", ""),
      warn: "Could not detect Weidian / Taobao / 1688 ID — wrapped the raw URL.",
    };
  }

  function toKakobuy(sourceUrl, channel, id) {
    let payload = sourceUrl;
    if (channel === "Weidian" && id) {
      payload = `https://weidian.com/item.html?itemID=${id}`;
    }
    return `https://www.kakobuy.com/item/details?url=${encodeURIComponent(payload)}&affcode=${AFF}`;
  }

  function stampAff(href) {
    try {
      const u = new URL(href);
      u.searchParams.set("affcode", AFF);
      return u.toString();
    } catch (_) {
      return href;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderConvertResult(out, result) {
    if (!result.ok) {
      out.classList.add("show", "is-error");
      out.classList.remove("is-ok");
      out.innerHTML = `<strong>Could not convert</strong><br>${escapeHtml(result.error)}`;
      return;
    }
    out.classList.add("show", "is-ok");
    out.classList.remove("is-error");
    const via = result.via ? ` via <strong>${escapeHtml(result.via)}</strong>` : "";
    const idLine = result.id
      ? `<div class="convert-meta">ID <code>${escapeHtml(result.id)}</code></div>`
      : "";
    const warn = result.warn
      ? `<div class="convert-warn">${escapeHtml(result.warn)}</div>`
      : "";
    out.innerHTML = `
      <div class="convert-head">Detected <strong>${escapeHtml(result.from)}</strong>${via}</div>
      ${idLine}
      ${warn}
      <div class="convert-source"><span>Source</span><code>${escapeHtml(result.sourceUrl)}</code></div>
      <div class="convert-actions">
        <a class="btn btn-red" href="${escapeHtml(result.kakobuyUrl)}" target="_blank" rel="noopener sponsored">Open in Kakobuy</a>
        <button type="button" class="btn btn-ghost" data-copy-link="${escapeHtml(result.kakobuyUrl)}">Copy link</button>
      </div>
      <code class="convert-url">${escapeHtml(result.kakobuyUrl)}</code>
    `;
    out.querySelector("[data-copy-link]")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const link = btn.getAttribute("data-copy-link");
      try {
        await navigator.clipboard.writeText(link);
        const prev = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => (btn.textContent = prev), 1200);
      } catch (_) {
        btn.textContent = "Copy failed";
      }
    });
  }

  function runConvert() {
    const input = $("#convert-input");
    const out = $("#convert-result");
    if (!out) return;
    const result = parseLink(input?.value || "");
    renderConvertResult(out, result);
  }

  const convertBtn = $("#convert-btn");
  convertBtn?.addEventListener("click", runConvert);
  $("#convert-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runConvert();
    }
  });

  // Expose for console / later QC wiring
  window.KakoHub = Object.assign(window.KakoHub || {}, {
    aff: AFF,
    signup: SIGNUP,
    discord: DISCORD_URL,
    googleForm: GOOGLE_FORM_URL,
    parseLink,
    toKakobuy: (url) => parseLink(url).kakobuyUrl,
  });

  /* Floating side dock — Discord + Google Form/Sheet */
  function initSideDock() {
    if ($(".side-dock")) return;
    const dock = document.createElement("aside");
    dock.className = "side-dock";
    dock.setAttribute("aria-label", "Quick links");
    dock.innerHTML = `
      <a class="side-dock-btn side-dock-discord" href="${DISCORD_URL}" target="_blank" rel="noopener" title="Discord" aria-label="Discord">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.3 18.3 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.7 19.7 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14 14 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.9.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.899.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.8 19.8 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
      </a>
      <a class="side-dock-btn side-dock-sheet" href="${GOOGLE_FORM_URL}" target="_blank" rel="noopener" title="Google Form / Sheet" aria-label="Google Form">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M8 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path fill="none" stroke="currentColor" stroke-width="1.8" d="M9 9h6M9 13h6M9 17h4"/></svg>
      </a>
    `;
    document.body.appendChild(dock);

    // Keep existing Discord CTAs in sync
    $$('a[href="https://discord.gg/"]').forEach((a) => {
      a.href = DISCORD_URL;
    });
  }
  initSideDock();

  /* Tool tabs on home */
  function activateToolTab(id) {
    if (!id) return;
    const tab = $(`.tool-tab[data-tab="${id}"]`);
    if (!tab) return;
    $$(".tool-tab").forEach((t) => t.classList.toggle("active", t === tab));
    $$(".tool-body").forEach((body) => {
      body.hidden = body.dataset.panel !== id;
    });
  }
  $$(".tool-tab").forEach((tab) => {
    tab.addEventListener("click", () => activateToolTab(tab.dataset.tab));
  });
  const hash = (location.hash || "").replace("#", "");
  if (hash === "converter") activateToolTab("convert");
  if (hash === "tools") {
    // scroll only — panels live further down now
  }

  /* Weight estimator */
  const estimateBtn = $("#estimate-btn");
  if (estimateBtn) {
    estimateBtn.addEventListener("click", () => {
      const shoes = Number($("#w-shoes")?.value || 0);
      const hoodies = Number($("#w-hoodies")?.value || 0);
      const tees = Number($("#w-tees")?.value || 0);
      const grams = shoes * 1200 + hoodies * 900 + tees * 280;
      const kg = grams / 1000;
      const cost = Math.max(18, Math.round(kg * 22 + 8));
      const out = $("#estimate-result");
      out.innerHTML = `Estimated weight <strong>${grams || "—"} g</strong> (~${kg.toFixed(2)} kg). Rough Kakobuy DHL to EU: <strong>~$${cost}</strong> before coupons.`;
      out.classList.add("show");
    });
  }

  /* QC finder — green-mat warehouse examples */
  const QC_GREEN = (window.KakoHub && KakoHub.qcGreen) || { count: 0, images: [] };
  const QC_LABELS = ["Front", "Sole / tag", "Close-up", "Box", "Side", "Label", "Pair", "Pack"];

  function qcTileHtml(img, i, opts) {
    const label = (opts && opts.label) || QC_LABELS[i % QC_LABELS.length] || `QC ${i + 1}`;
    const href = img.id ? `item.html?id=${encodeURIComponent(img.id)}` : "spreadsheet.html";
    return `<a class="qc-tile" href="${escapeHtml(href)}">
      <img src="${escapeHtml(img.src)}" alt="Warehouse QC photo" loading="lazy" decoding="async" width="400" height="400" />
      <span class="qc-tile-label">${escapeHtml(label)}</span>
    </a>`;
  }

  function renderQcGrid(el, images, limit) {
    if (!el) return;
    const list = limit ? images.slice(0, limit) : images;
    if (!list.length) {
      el.innerHTML = `<div class="qc-tile qc-tile-empty"><span class="qc-tile-label">No QC photos yet</span></div>`;
      return;
    }
    el.innerHTML = list.map((img, i) => qcTileHtml(img, i)).join("");
  }

  function initQcGreenGallery() {
    const all = QC_GREEN.images || [];
    const countEl = $("#qc-green-count");
    if (countEl) countEl.textContent = String(QC_GREEN.count || all.length);
    renderQcGrid($("#qc-demo-grid"), all, 8);
    renderQcGrid($("#qc-green-grid"), all);
  }
  initQcGreenGallery();

  const qcBtn = $("#qc-btn");
  if (qcBtn) {
    qcBtn.addEventListener("click", () => {
      const input = $("#qc-input");
      const out = $("#qc-result");
      const grid = $("#qc-demo-grid");
      const raw = (input?.value || "").trim();
      if (!raw) {
        out.classList.remove("show");
        renderQcGrid(grid, QC_GREEN.images || [], 8);
        return;
      }
      const parsed = parseLink(raw);
      const label = parsed.ok
        ? `${parsed.from}${parsed.id ? " · ID " + parsed.id : ""}`
        : "link";
      const id = parsed.ok && parsed.id ? String(parsed.id) : "";
      const matched = id
        ? (QC_GREEN.images || []).filter((img) => String(img.id) === id)
        : [];
      const product = id ? ALL_PRODUCTS.find((p) => String(p.id) === id) : null;
      const extras = [];
      if (product) {
        const pid = String(product.id);
        [product.image, `img/products/${pid}-2.webp`, `img/products/${pid}-3.webp`]
          .filter(Boolean)
          .forEach((src) => {
            if (!extras.some((e) => e.src === src)) extras.push({ src, id: pid });
          });
      }
      const show = matched.length ? matched : extras.length ? extras : (QC_GREEN.images || []).slice(0, 8);
      renderQcGrid(grid, show);
      const buy = parsed.kakobuyUrl || (product ? kakobuyHref(product) : SIGNUP);
      const itemLink = product ? productHref(product) : "";
      out.innerHTML = `Detected <strong>${escapeHtml(label)}</strong>.
        ${matched.length ? ` Found <strong>${matched.length}</strong> green-mat QC shot${matched.length > 1 ? "s" : ""} in the library.` : extras.length ? ` Showing available angles for this find.` : ` No exact green-mat match yet — showing warehouse examples.`}
        <div class="convert-actions" style="margin-top:10px">
          <a class="btn btn-red" href="${escapeHtml(buy)}" target="_blank" rel="noopener sponsored"
            data-item-id="${escapeHtml(id)}"
            data-item-name="${escapeHtml(product?.title || "")}"
            data-item-category="${escapeHtml(product?.category || "")}"
            data-item-price="${escapeHtml(String(product?.price || 0))}">Buy on Kakobuy</a>
          ${itemLink ? `<a class="btn btn-ghost" href="${escapeHtml(itemLink)}">Open find</a>` : ""}
        </div>`;
      out.classList.add("show");
      track("qc_search", {
        link_url: raw,
        item_id: id || undefined,
        matches: matched.length,
      });
    });
  }

  /* ---------- Product catalog (from Excel) ---------- */
  const catalog = (window.KakoHub && KakoHub.catalog) || { products: [], categories: [], count: 0 };
  const ALL_PRODUCTS = catalog.products || [];
  const PAGE_SIZE = 48;

  function money(n) {
    const v = Number(n);
    if (!v) return "—";
    return "$" + (Number.isInteger(v) ? v : v.toFixed(2));
  }

  function pathPrefix() {
    return document.body?.dataset?.page === "category" ? "../" : "";
  }

  function catHref(slug) {
    const p = pathPrefix();
    if (!slug || slug === "all") return `${p}spreadsheet.html`;
    return `${p}${slug}/`;
  }

  function assetUrl(path) {
    if (!path) return "";
    if (/^(https?:|data:|\/)/i.test(path)) return path;
    return pathPrefix() + path;
  }

  function productHref(p) {
    const pre = pathPrefix();
    if (!p || !p.id) return `${pre}spreadsheet.html`;
    let href = `${pre}item.html?id=${encodeURIComponent(p.id)}`;
    if (p.category) href += `&cat=${encodeURIComponent(p.category)}`;
    return href;
  }

  function setMetaTag(nameOrProp, value, attr) {
    const sel = attr === "property"
      ? `meta[property="${nameOrProp}"]`
      : `meta[name="${nameOrProp}"]`;
    let el = document.querySelector(sel);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr === "property" ? "property" : "name", nameOrProp);
      document.head.appendChild(el);
    }
    el.setAttribute("content", value);
  }

  function kakobuyHref(p) {
    if (!p || !p.url) return SIGNUP;
    return `https://www.kakobuy.com/item/details?url=${encodeURIComponent(p.url)}&affcode=${AFF}`;
  }

  function channelOf(p) {
    const u = String(p?.url || "").toLowerCase();
    if (u.includes("weidian.com")) return "Weidian";
    if (u.includes("1688.com")) return "1688";
    if (u.includes("taobao.com") || u.includes("tmall.com")) return "Taobao";
    return "Marketplace";
  }

  function productCard(p) {
    const hay = [p.title, p.brand, p.categoryLabel, ...(p.tags || [])].join(" ").toLowerCase();
    const badge = p.hot ? "Hot" : p.qc ? "QC" : "";
    const media = p.image
      ? `<img src="${escapeHtml(assetUrl(p.image))}" alt="" loading="lazy" decoding="async" width="400" height="400" />`
      : escapeHtml(p.categoryLabel || "Find");
    const badgeHtml = badge
      ? `<span class="product-badge">${escapeHtml(badge)}</span>`
      : "";
    return `<a class="product-card" href="${escapeHtml(productHref(p))}" data-item="${escapeHtml(hay)}" data-cat="${escapeHtml(p.category || "")}">
      <div class="product-media">${badgeHtml}${media}</div>
      <div class="product-body">
        <h3>${escapeHtml(p.title)}</h3>
        <div class="product-meta"><span>${escapeHtml(p.brand || p.categoryLabel || "")}</span><strong>${money(p.price)}</strong></div>
      </div>
    </a>`;
  }

  function ratingOf(p) {
    const opens = Number(p.opens || 0);
    const base = 7.2 + Math.min(2.2, opens / 3500);
    return Math.min(9.8, Math.round(base * 10) / 10);
  }

  const CAT_ICONS = {
    all: '<svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>',
    shoes: '<svg viewBox="0 0 24 24"><path d="M3 15h13l4-2.5V17H3z"/><path d="M4 15c0-2 2-4 5-5l1.5-3.5h3L15 10c2 .8 4 2.5 4 5"/></svg>',
    hoodies: '<svg viewBox="0 0 24 24"><path d="M8 6c0-2 1.8-3.5 4-3.5S16 4 16 6v2l3 2v9H5v-9l3-2V6z"/><path d="M9 11h6"/></svg>',
    jackets: '<svg viewBox="0 0 24 24"><path d="M8 5l-4 4v10h16V9l-4-4"/><path d="M8 5c0 2 2 3 4 3s4-1 4-3"/><path d="M12 8v11"/></svg>',
    "t-shirts": '<svg viewBox="0 0 24 24"><path d="M8 5l-4 3 2 3h2v8h8v-8h2l2-3-4-3"/><path d="M10 5c0 1.2.8 2 2 2s2-.8 2-2"/></svg>',
    pants: '<svg viewBox="0 0 24 24"><path d="M8 4h8v4l-1 14h-2.5L12 12l-.5 10H9L8 8z"/><path d="M8 8h8"/></svg>',
    bags: '<svg viewBox="0 0 24 24"><path d="M6 9h12l1 11H5z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/></svg>',
    watches: '<svg viewBox="0 0 24 24"><rect x="8" y="6" width="8" height="12" rx="2"/><path d="M10 3h4M10 21h4M12 10v3l2 1"/></svg>',
    accessories: '<svg viewBox="0 0 24 24"><path d="M12 4l3 5-3 11L9 9z"/><path d="M9 9h6"/></svg>',
    headwear: '<svg viewBox="0 0 24 24"><path d="M5 14c0-4 3-7 7-7s7 3 7 7"/><path d="M3 15h18v2H3z"/></svg>',
    glasses: '<svg viewBox="0 0 24 24"><circle cx="7" cy="13" r="3.5"/><circle cx="17" cy="13" r="3.5"/><path d="M10.5 13h3M4 13H2M22 13h-2"/></svg>',
    perfume: '<svg viewBox="0 0 24 24"><path d="M10 3h4v3h-4z"/><rect x="7" y="6" width="10" height="14" rx="3"/><path d="M10 11h4"/></svg>',
    jersey: '<svg viewBox="0 0 24 24"><path d="M8 5l-4 3 2 3h2v8h8v-8h2l2-3-4-3"/><path d="M10 5c0 1 .8 2 2 2s2-1 2-2"/></svg>',
    sets: '<svg viewBox="0 0 24 24"><path d="M7 8l-3 2v9h4v-5h8v5h4v-9l-3-2"/><path d="M7 8c1 2 3 3 5 3s4-1 5-3"/></svg>',
    underwear: '<svg viewBox="0 0 24 24"><path d="M5 8h14v4c0 2-1 4-3 4h-2l-2-3-2 3H8c-2 0-3-2-3-4z"/></svg>',
    bricks: '<svg viewBox="0 0 24 24"><path d="M4 10h7v7H4zM13 10h7v7h-7zM8 4h8v6H8z"/></svg>',
  };

  function sheetCard(p) {
    const hay = [p.title, p.brand, p.categoryLabel, ...(p.tags || [])].join(" ").toLowerCase();
    const img = p.image
      ? `<img src="${escapeHtml(assetUrl(p.image))}" alt="" loading="lazy" decoding="async" width="400" height="400" />`
      : "";
    return `<a class="product-card find-card" href="${escapeHtml(productHref(p))}" data-item="${escapeHtml(hay)}" data-cat="${escapeHtml(p.category || "")}">
      <div class="find-media">
        <span class="find-rating"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 18l.9-5.4L4.2 8.7l5.4-.8z"/></svg> ${ratingOf(p)}/10</span>
        <span class="find-ext" aria-hidden="true">→</span>
        ${img}
      </div>
      <div class="find-body">
        <p class="find-cat">${escapeHtml(p.categoryLabel || p.category || "Find")}</p>
        <h3>${escapeHtml(p.title)}</h3>
        <div class="find-foot">
          <span class="find-price">${money(p.price)}</span>
          <span class="find-actions"><span class="find-view"><i>K</i> View</span></span>
        </div>
      </div>
    </a>`;
  }

  function filterProducts(q, cat) {
    const query = (q || "").trim().toLowerCase();
    return ALL_PRODUCTS.filter((p) => {
      if (cat && cat !== "all" && p.category !== cat) return false;
      if (!query) return true;
      const hay = [p.title, p.brand, p.categoryLabel, ...(p.tags || []), p.id].join(" ").toLowerCase();
      return query.split(/\s+/).every((tok) => hay.includes(tok));
    });
  }

  function initCategoryPage() {
    const grid = $("#grid");
    if (!grid || document.body.dataset.page !== "category") return;
    const cat = document.body.dataset.cat || "";
    const search = $("#sheet-search");
    const countEl = $("#sheet-count");
    const metaEl = $("#sheet-meta");
    const base = ALL_PRODUCTS.filter((p) => p.category === cat);

    function apply() {
      const q = (search?.value || "").trim().toLowerCase();
      let list = base;
      if (q) {
        list = base.filter((p) => {
          const hay = [p.title, p.brand, p.categoryLabel, ...(p.tags || []), p.id]
            .join(" ")
            .toLowerCase();
          return q.split(/\s+/).every((tok) => hay.includes(tok));
        });
      }
      grid.innerHTML = list.length
        ? list.map(sheetCard).join("")
        : `<p class="empty">No finds match this search in ${escapeHtml(cat)}.</p>`;
      if (countEl) {
        countEl.textContent =
          list.length === base.length
            ? `${base.length.toLocaleString("en-US")} finds in ${cat}`
            : `${list.length.toLocaleString("en-US")} of ${base.length.toLocaleString("en-US")} finds`;
      }
      if (metaEl) {
        metaEl.innerHTML = `<strong>${list.length.toLocaleString("en-US")}</strong> products`;
      }
    }

    search?.addEventListener("input", apply);
    const q0 = new URLSearchParams(location.search).get("q");
    if (q0 && search) {
      search.value = q0;
      apply();
    }
  }

  function initSpreadsheet() {
    if (document.body.dataset.page === "category") {
      initCategoryPage();
      return;
    }

    const grid = $("#grid");
    if (!grid || !ALL_PRODUCTS.length) return;

    // Old ?cat= URLs → static /shoes/ pages
    const jump = new URLSearchParams(location.search).get("cat");
    if (jump) {
      const rest = new URLSearchParams(location.search);
      rest.delete("cat");
      const qs = rest.toString();
      location.replace(`${jump}/${qs ? `?${qs}` : ""}`);
      return;
    }

    const strip = $("#cat-strip");
    const search = $("#sheet-search");
    const countEl = $("#sheet-count");
    const metaEl = $("#sheet-meta");
    const updatedEl = $("#sheet-updated");
    const moreWrap = $("#sheet-more");
    const moreBtn = $("#sheet-load-more");
    let shown = 0;
    let filtered = ALL_PRODUCTS.slice();

    if (updatedEl) {
      const label = siteUpdatedLabel() || catalog.updated;
      if (label) updatedEl.textContent = label;
    }

    const catCounts = ALL_PRODUCTS.reduce((acc, p) => {
      const key = p.category || "other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const cats = [{ slug: "all", label: "All", count: ALL_PRODUCTS.length }].concat(
      (catalog.categories || [])
        .map((c) => ({ ...c, count: catCounts[c.slug] || 0 }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count)
    );

    function renderCats() {
      if (!strip) return;
      strip.innerHTML = cats
        .map((c) => {
          const icon = CAT_ICONS[c.slug] || CAT_ICONS.all;
          const active = c.slug === "all" ? " active" : "";
          const href = catHref(c.slug);
          return `<a class="cat-chip${active}" href="${escapeHtml(href)}">${icon}<span>${escapeHtml(c.label)}</span><span class="cat-count">${Number(c.count).toLocaleString("en-US")}</span></a>`;
        })
        .join("");
    }

    function renderMeta() {
      if (!metaEl) return;
      const total = catalog.count || ALL_PRODUCTS.length;
      if (!(search?.value || "").trim()) {
        metaEl.innerHTML = `<strong>${filtered.length.toLocaleString("en-US")}</strong> products`;
        return;
      }
      metaEl.innerHTML = `<strong>${filtered.length.toLocaleString("en-US")}</strong> of ${total.toLocaleString("en-US")} products
        <button type="button" class="sheet-clear" id="sheet-clear">Clear search</button>`;
      $("#sheet-clear")?.addEventListener("click", () => {
        if (search) search.value = "";
        apply();
      });
    }

    function renderPage(reset) {
      if (reset) {
        grid.innerHTML = "";
        shown = 0;
      }
      const slice = filtered.slice(shown, shown + PAGE_SIZE);
      grid.insertAdjacentHTML("beforeend", slice.map(sheetCard).join(""));
      shown += slice.length;
      if (moreWrap) moreWrap.hidden = shown >= filtered.length;
      if (countEl) {
        const total = catalog.count || ALL_PRODUCTS.length;
        countEl.textContent =
          filtered.length === total
            ? `${total.toLocaleString("en-US")} finds in the library`
            : `${filtered.length.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} finds`;
      }
      renderMeta();
    }

    function apply() {
      filtered = filterProducts(search?.value || "", "all");
      renderPage(true);
    }

    moreBtn?.addEventListener("click", () => renderPage(false));
    search?.addEventListener("input", () => apply());

    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    if (q && search) search.value = q;
    renderCats();
    apply();
  }
  initSpreadsheet();

  /* Homepage — Kakofind-style blocks from catalog */
  function discountOf(p, i) {
    const base = 28 + ((Number(p.opens) || 0) % 27) + (i % 5);
    return Math.min(55, base);
  }

  function dealCard(p, i) {
    const off = discountOf(p, i);
    const price = Number(p.price) || 0;
    const was = price ? Math.round((price / (1 - off / 100)) * 100) / 100 : 0;
    const save = price && was ? Math.round((was - price) * 100) / 100 : 0;
    const img = p.image
      ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async" />`
      : "";
    const desc = `${p.brand || p.categoryLabel || "Verified find"} · limited stock · QC checked`;
    return `<a class="deal-card" href="${escapeHtml(productHref(p))}">
      <div class="deal-media"><span class="deal-off">-${off}%</span>${img}</div>
      <div class="deal-body">
        <h3>${escapeHtml(p.title)}</h3>
        <p class="deal-desc">${escapeHtml(desc)}</p>
        <div class="deal-rating"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 18l.9-5.4L4.2 8.7l5.4-.8z"/></svg> ${ratingOf(p)}/10</div>
        <div class="deal-price-row">
          <span class="deal-price">${money(price)}</span>
          ${was ? `<span class="deal-was">${money(was)}</span>` : ""}
          ${save ? `<span class="deal-save">-${money(save)}</span>` : ""}
        </div>
        <span class="deal-cta">View deal →</span>
      </div>
    </a>`;
  }

  function shelfCard(p) {
    const img = p.image
      ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async" />`
      : "";
    return `<a class="shelf-card" href="${escapeHtml(productHref(p))}">
      <div class="shelf-media"><span class="shelf-rating">★ ${ratingOf(p)}/10</span>${img}</div>
      <div class="shelf-body">
        <h4>${escapeHtml(p.title)}</h4>
        <div class="shelf-meta"><strong>${money(p.price)}</strong><span class="shelf-k">K</span></div>
      </div>
    </a>`;
  }

  function similarCard(p) {
    const img = p.image
      ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async" />`
      : "";
    const shortTitle = [p.brand, p.categoryLabel].filter(Boolean).join(" ") || p.title;
    return `<a class="similar-card" href="${escapeHtml(productHref(p))}">
      <div class="similar-media">${img}</div>
      <div class="similar-body">
        <h3>${escapeHtml(shortTitle)}</h3>
        <strong>${money(p.price)}</strong>
      </div>
    </a>`;
  }

  function gallerySources(p) {
    const pid = String(p.id || "").replace(/^p-/, "");
    const main = p.image || `img/products/${pid}.webp`;
    const extras = [`img/products/${pid}-2.webp`, `img/products/${pid}-3.webp`];
    return [main, ...extras];
  }

  function initItemPage() {
    const root = $("#item-root");
    if (!root || document.body.dataset.page !== "item") return;

    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    const p = ALL_PRODUCTS.find((x) => String(x.id) === String(id));
    const crumbs = $("#item-crumbs");
    const promo = $("#item-promo");

    if (!p) {
      document.title = "Find not found — Kakobuyspreadsheet";
      if (crumbs) {
        crumbs.innerHTML = `<a href="spreadsheet.html">← Back to database</a>`;
      }
      root.innerHTML = `<div class="item-missing">
        <h1>Find not found</h1>
        <p>This item is missing from the live spreadsheet.</p>
        <a class="btn btn-red" href="spreadsheet.html">Open spreadsheet</a>
      </div>`;
      return;
    }

    const channel = channelOf(p);
    const buyUrl = kakobuyHref(p);
    const rating = ratingOf(p);
    const views = Math.max(12, Math.round(Number(p.opens) || 0));
    const catSlug = p.category || params.get("cat") || "";
    const catLabel = p.categoryLabel || catSlug || "Finds";
    const catPath = catSlug ? `${catSlug}/` : "spreadsheet.html";
    const pageUrl = `https://kakobuyspreadsheetfinder.com/item.html?id=${encodeURIComponent(String(p.id))}${
      catSlug ? `&cat=${encodeURIComponent(catSlug)}` : ""
    }`;
    const seoTitle = `${p.title} | Kakobuy ${catLabel} Spreadsheet`;
    const seoDesc = `${p.title} · ${money(p.price)} · ${catLabel} find on Kakobuy with QC-ready link. From the Kakobuyspreadsheet ${catLabel.toLowerCase()} spreadsheet.`;

    document.title = seoTitle;
    setMetaTag("description", seoDesc);
    setMetaTag("og:title", seoTitle, "property");
    setMetaTag("og:description", seoDesc, "property");
    setMetaTag("og:url", pageUrl, "property");
    setMetaTag("og:type", "product", "property");
    if (p.image) {
      setMetaTag("og:image", new URL(p.image, "https://kakobuyspreadsheetfinder.com/").href, "property");
    }
    const can = document.querySelector('link[rel="canonical"]');
    if (can) can.setAttribute("href", pageUrl);

    if (promo) promo.textContent = `Kakobuy ${catLabel.toLowerCase()} find`;

    if (crumbs) {
      crumbs.innerHTML = `<a href="spreadsheet.html">Spreadsheet</a>
        <span class="crumb-sep">/</span>
        <a href="${escapeHtml(catPath)}">${escapeHtml(catLabel)}</a>
        <span class="crumb-sep">/</span>
        <span class="crumb-current">${escapeHtml(p.brand || catLabel)}</span>`;
    }

    // Keep shareable URL in sync with category when opened via id-only link
    if (catSlug && history.replaceState) {
      const next = `item.html?id=${encodeURIComponent(String(p.id))}&cat=${encodeURIComponent(catSlug)}`;
      if (location.search.indexOf("cat=") === -1) history.replaceState(null, "", next);
    }

    const gallery = gallerySources(p);

    root.innerHTML = `
      <div class="item-gallery">
        <div class="item-shot">
          <img id="item-main" src="${escapeHtml(gallery[0])}" alt="${escapeHtml(p.title)}" />
          <span class="item-shot-count" id="item-shot-count">1/${gallery.length}</span>
        </div>
        <div class="item-thumbs" id="item-thumbs">
          ${gallery
            .map(
              (src, i) =>
                `<button type="button" data-src="${escapeHtml(src)}" data-i="${i}" class="${i === 0 ? "is-on" : ""}" aria-label="Photo ${i + 1}">
                  <img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" />
                </button>`
            )
            .join("")}
        </div>
      </div>
      <div class="buy-box">
        <div class="item-badges">
          <span class="item-badge">${escapeHtml(channel)}</span>
          <a class="item-badge item-badge-cat" href="${escapeHtml(catPath)}">${escapeHtml(catLabel.toUpperCase())}</a>
          ${p.qc ? `<span class="item-badge item-badge-qc">QC</span>` : ""}
          ${p.hot ? `<span class="item-badge item-badge-hot">Hot</span>` : ""}
        </div>
        <h1>${escapeHtml(p.title)}</h1>
        <p class="item-full-title">${escapeHtml([p.brand, catLabel].filter(Boolean).join(" · "))}</p>
        <div class="item-stats">
          <span>${rating}/10 quality</span>
          <span class="item-star">★ 5.0</span>
          <span>${views.toLocaleString("en-US")} views</span>
        </div>
        <div class="item-price-row">
          <div class="item-price">${money(p.price)}</div>
          <button type="button" class="item-icon-btn" id="item-share" aria-label="Share" title="Copy link">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M10 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4"/></svg>
          </button>
        </div>
        <div class="item-cta-stack">
          <a class="btn btn-red item-buy" href="${escapeHtml(buyUrl)}" target="_blank" rel="noopener sponsored"
            data-item-id="${escapeHtml(String(p.id || ""))}"
            data-item-name="${escapeHtml(p.title || "")}"
            data-item-category="${escapeHtml(p.category || "")}"
            data-item-price="${escapeHtml(String(p.price || 0))}">
            <span class="item-buy-k">K</span>
            Buy on Kakobuy
            <span class="item-buy-ext" aria-hidden="true">↗</span>
          </a>
          <a class="btn btn-soft item-qc-link" href="qc-finder.html">Check QC Finder →</a>
        </div>
        <div class="item-seller">
          <div class="item-seller-main">
            <span class="item-seller-mark">K</span>
            <div>
              <strong>Kakobuyspreadsheet <span class="item-trusted">TRUSTED</span></strong>
            </div>
          </div>
        </div>
      </div>`;

    const mainImg = $("#item-main");
    const countEl = $("#item-shot-count");
    const thumbs = $("#item-thumbs");
    thumbs?.querySelectorAll("button").forEach((btn) => {
      const thumb = btn.querySelector("img");
      thumb?.addEventListener("error", () => {
        btn.classList.add("is-empty");
        btn.removeAttribute("data-src");
        thumb.remove();
        if (btn.classList.contains("is-on")) {
          const next = thumbs.querySelector("button[data-src]");
          if (next) next.click();
        }
      });
      btn.addEventListener("click", () => {
        const src = btn.getAttribute("data-src");
        if (!src || !mainImg) return;
        mainImg.src = src;
        const i = Number(btn.dataset.i || 0) + 1;
        const visible = thumbs.querySelectorAll("button[data-src]").length || gallery.length;
        if (countEl) countEl.textContent = `${i}/${visible}`;
        thumbs.querySelectorAll("button").forEach((el) => el.classList.toggle("is-on", el === btn));
      });
    });

    $("#item-share")?.addEventListener("click", async () => {
      const btn = $("#item-share");
      try {
        await navigator.clipboard.writeText(location.href);
        btn?.classList.add("is-copied");
        setTimeout(() => btn?.classList.remove("is-copied"), 1200);
      } catch (_) {}
    });

    track("view_item", {
      currency: "USD",
      value: Number(p.price) || 0,
      items: [
        {
          item_id: String(p.id),
          item_name: p.title || "",
          item_category: p.category || "",
          price: Number(p.price) || 0,
          quantity: 1,
        },
      ],
    });

    const similar = ALL_PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id)
      .sort((a, b) => Number(b.opens || 0) - Number(a.opens || 0))
      .slice(0, 16);
    const similarSection = $("#similar-section");
    const rail = $("#similar-rail");
    if (similarSection && rail && similar.length) {
      similarSection.hidden = false;
      const similarHead = similarSection.querySelector(".section-head p");
      if (similarHead) {
        similarHead.innerHTML = `More <a href="${escapeHtml(catPath)}">${escapeHtml(catLabel.toLowerCase())}</a> from the spreadsheet.`;
      }
      rail.innerHTML = similar.map(similarCard).join("");
      const scrollBy = () => Math.min(rail.clientWidth * 0.8, 720);
      $("#similar-prev")?.addEventListener("click", () => {
        rail.scrollBy({ left: -scrollBy(), behavior: "smooth" });
      });
      $("#similar-next")?.addEventListener("click", () => {
        rail.scrollBy({ left: scrollBy(), behavior: "smooth" });
      });
    }
  }
  initItemPage();

  function matchShelf(p, shelf) {
    if (shelf.cat && p.category === shelf.cat) {
      if (!shelf.q) return true;
    }
    if (shelf.q) {
      const hay = [p.title, p.brand, ...(p.tags || [])].join(" ").toLowerCase();
      return shelf.q.some((tok) => hay.includes(tok));
    }
    return shelf.cat ? p.category === shelf.cat : false;
  }

  function initHomeCatalog() {
    if (!ALL_PRODUCTS.length) return;
    const count = catalog.count || ALL_PRODUCTS.length;
    const browseCount = $("#browse-count");
    if (browseCount) browseCount.textContent = count.toLocaleString("en-US");
    const dealsCount = $("#deals-count");
    if (dealsCount) {
      const n = ALL_PRODUCTS.filter((p) => p.hot || p.featured).length;
      const label = String(Math.min(99, Math.max(12, n)));
      dealsCount.textContent = label;
      const footerCount = $("#deals-count-footer");
      if (footerCount) footerCount.textContent = label;
    }

    /* Special offers — 1 row of 4, page with arrows (no horizontal scroll) */
    const rail = $("#deal-rail");
    const prevBtn = $("#deal-prev");
    const nextBtn = $("#deal-next");
    const DEAL_PAGE = 4;
    let dealMode = "featured";
    let dealPage = 0;
    let dealList = [];

    function dealsFor(mode) {
      let list = ALL_PRODUCTS.slice();
      if (mode === "featured") list = list.filter((p) => p.featured || p.hot);
      else if (mode === "newest") list = list.slice().sort((a, b) => String(b.id).localeCompare(String(a.id)));
      else if (mode === "discount") list = list.filter((p) => p.hot || p.price > 0).sort((a, b) => discountOf(b, 0) - discountOf(a, 0));
      if (list.length < DEAL_PAGE) list = ALL_PRODUCTS.slice(0, 24);
      return list.slice(0, 24);
    }

    function renderDeals() {
      if (!rail) return;
      dealList = dealsFor(dealMode);
      const maxPage = Math.max(0, Math.ceil(dealList.length / DEAL_PAGE) - 1);
      if (dealPage > maxPage) dealPage = maxPage;
      const start = dealPage * DEAL_PAGE;
      rail.innerHTML = dealList.slice(start, start + DEAL_PAGE).map(dealCard).join("");
      if (prevBtn) prevBtn.disabled = dealPage <= 0;
      if (nextBtn) nextBtn.disabled = dealPage >= maxPage;
    }

    renderDeals();
    $$(".deals-section .deal-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        dealMode = tab.dataset.deal || "featured";
        dealPage = 0;
        $$(".deals-section .deal-tab").forEach((t) => t.classList.toggle("active", t === tab));
        renderDeals();
      });
    });
    prevBtn?.addEventListener("click", () => {
      if (dealPage <= 0) return;
      dealPage -= 1;
      renderDeals();
    });
    nextBtn?.addEventListener("click", () => {
      const maxPage = Math.max(0, Math.ceil(dealList.length / DEAL_PAGE) - 1);
      if (dealPage >= maxPage) return;
      dealPage += 1;
      renderDeals();
    });

    /* Category shelves — same order as Kakofind discover rows */
    const shelves = [
      { key: "t-shirts", label: "T-shirts", cat: "t-shirts" },
      { key: "shorts", label: "Shorts", cat: "pants", q: ["short", "shorts"] },
      { key: "shoes", label: "Shoes", cat: "shoes" },
      { key: "hoodies", label: "Hoodies", cat: "hoodies" },
      { key: "jackets", label: "Jackets", cat: "jackets" },
      { key: "bags", label: "Bags", cat: "bags" },
    ];
    const shelfRoot = $("#shelf-rows");
    if (shelfRoot) {
      shelfRoot.innerHTML = shelves
        .map((shelf) => {
          const items = ALL_PRODUCTS.filter((p) => matchShelf(p, shelf));
          const picks = items.slice(0, 4);
          if (!picks.length) return "";
          // Banner cover: prefer a product NOT shown in the right-hand row
          const coverSrc =
            items.slice(4).find((p) => p.image)?.image ||
            items.slice().reverse().find((p) => p.image && !picks.some((x) => x.id === p.id))?.image ||
            items.find((p, i) => i >= 1 && p.image)?.image ||
            picks.find((p) => p.image)?.image ||
            "";
          const href = shelf.q
            ? `spreadsheet.html?q=${encodeURIComponent(shelf.q[0])}`
            : `${shelf.cat}/`;
          return `<div class="shelf-row" data-shelf="${escapeHtml(shelf.key)}">
            <a class="shelf-banner" href="${escapeHtml(href)}">
              <span class="shelf-aura" aria-hidden="true"></span>
              <h3>${escapeHtml(shelf.label)}</h3>
              <div class="shelf-hero">
                ${coverSrc ? `<img src="${escapeHtml(coverSrc)}" alt="" loading="lazy" decoding="async" />` : ""}
              </div>
              <span class="shelf-cta">See more →</span>
              <div class="shelf-count">${items.length.toLocaleString("en-US")} products</div>
            </a>
            <div class="shelf-rail">${picks.map(shelfCard).join("")}</div>
          </div>`;
        })
        .join("");
    }

    /* TOP 10 */
    const homeGrid = $("#home-finds");
    if (homeGrid) {
      homeGrid.innerHTML = ALL_PRODUCTS.slice(0, 10).map(productCard).join("");
    }
  }
  initHomeCatalog();

  /* Deals sub-page */
  function initDealsPage() {
    const grid = $("#deals-page-grid");
    if (!grid || !ALL_PRODUCTS.length) return;

    const search = $("#deals-search");
    const meta = $("#deals-page-meta");
    const moreWrap = $("#deals-page-more");
    const moreBtn = $("#deals-load-more");
    const PAGE = 24;
    let mode = "featured";
    let shown = 0;
    let list = [];

    function pool() {
      let arr = ALL_PRODUCTS.filter((p) => p.featured || p.hot || p.price > 0);
      if (arr.length < 24) arr = ALL_PRODUCTS.slice();
      if (mode === "featured") arr = arr.filter((p) => p.featured || p.hot).concat(arr);
      else if (mode === "newest") arr = arr.slice().sort((a, b) => String(b.id).localeCompare(String(a.id)));
      else if (mode === "discount") arr = arr.slice().sort((a, b) => discountOf(b, 0) - discountOf(a, 0));
      else if (mode === "cheap") arr = arr.filter((p) => p.price > 0).sort((a, b) => a.price - b.price);
      else if (mode === "quality") arr = arr.slice().sort((a, b) => ratingOf(b) - ratingOf(a));
      // unique by id
      const seen = new Set();
      return arr.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      }).slice(0, 96);
    }

    function applyFilter() {
      const q = (search?.value || "").trim().toLowerCase();
      list = pool().filter((p) => {
        if (!q) return true;
        const hay = [p.title, p.brand, p.categoryLabel, ...(p.tags || [])].join(" ").toLowerCase();
        return q.split(/\s+/).every((tok) => hay.includes(tok));
      });
      shown = 0;
      render(true);
    }

    function render(reset) {
      if (reset) grid.innerHTML = "";
      const slice = list.slice(shown, shown + PAGE);
      grid.insertAdjacentHTML("beforeend", slice.map(dealCard).join(""));
      shown += slice.length;
      if (moreWrap) moreWrap.hidden = shown >= list.length;
      if (meta) {
        meta.innerHTML = `Showing <strong>${list.length.toLocaleString("en-US")}</strong> live Kakobuy deals.`;
      }
    }

    // Stats
    const deals = pool();
    const offs = deals.map((p, i) => discountOf(p, i));
    const avg = offs.length ? Math.round(offs.reduce((a, b) => a + b, 0) / offs.length) : 0;
    const maxOff = offs.length ? Math.max(...offs) : 0;
    const saveTotal = deals.slice(0, 24).reduce((sum, p, i) => {
      const off = discountOf(p, i);
      const price = Number(p.price) || 0;
      const was = price ? price / (1 - off / 100) : 0;
      return sum + Math.max(0, was - price);
    }, 0);
    const liveEl = $("#stat-live");
    const avgEl = $("#stat-avg");
    const maxEl = $("#stat-max");
    const saveEl = $("#stat-save");
    if (liveEl) liveEl.textContent = String(Math.min(99, deals.length));
    if (avgEl) avgEl.textContent = `-${avg}%`;
    if (maxEl) maxEl.textContent = `-${maxOff}%`;
    if (saveEl) saveEl.textContent = money(Math.round(saveTotal));

    $$("#deals-page-tabs .deal-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        mode = tab.dataset.deal || "featured";
        $$("#deals-page-tabs .deal-tab").forEach((t) => t.classList.toggle("active", t === tab));
        applyFilter();
      });
    });
    search?.addEventListener("input", () => applyFilter());
    moreBtn?.addEventListener("click", () => render(false));
    applyFilter();
  }
  initDealsPage();

  /* Coupon copy */
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(code);
        const prev = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => (btn.textContent = prev), 1200);
      } catch (_) {
        btn.textContent = code;
      }
    });
  });

  /* Mobile nav */
  const menuBtn = $("#menu-btn");
  const mobileNav = $("#mobile-nav");
  const backdrop = $("#backdrop");
  function closeMobile() {
    mobileNav?.classList.remove("open");
    backdrop?.classList.remove("open");
  }
  menuBtn?.addEventListener("click", () => {
    mobileNav?.classList.add("open");
    backdrop?.classList.add("open");
  });
  backdrop?.addEventListener("click", closeMobile);
  $$("#mobile-nav a").forEach((a) => a.addEventListener("click", closeMobile));

  /* Command palette — Popular / Categories / Shortcuts (no image search) */
  const overlay = $("#cmd-overlay");
  let cmdBox = $("#cmd-box") || $(".cmd-box");
  let cmdInput = $("#cmd-input");
  let cmdBody = $("#cmd-body");
  let active = 0;

  const POPULAR = [
    "Jordan 4",
    "Moncler",
    "Stone Island",
    "Chrome Hearts",
    "Corteiz",
    "Ralph Lauren",
    "Nike Tech",
    "Trapstar",
  ];
  const CMD_CATS = [
    { slug: "shoes", label: "Shoes" },
    { slug: "t-shirts", label: "T-shirts" },
    { slug: "hoodies", label: "Hoodies" },
    { slug: "jackets", label: "Jackets" },
    { slug: "pants", label: "Pants" },
    { slug: "bags", label: "Bags" },
    { slug: "watches", label: "Watches" },
    { slug: "accessories", label: "Accessories" },
  ];
  const CMD_SHORTCUTS = [
    {
      href: "spreadsheet.html",
      label: "Product Base",
      icon: '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M4 9h16M9 5v14"/></svg>',
    },
    {
      href: "qc-finder.html",
      label: "QC Finder",
      icon: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-3.2-3.2"/><path d="M9 11h4M11 9v4"/></svg>',
    },
    {
      href: "index.html#converter",
      label: "Link Converter",
      icon: '<svg viewBox="0 0 24 24"><path d="M8 7h11M15 4l4 3-4 3"/><path d="M16 17H5M9 14l-4 3 4 3"/></svg>',
    },
  ];

  function ensureCmdShell() {
    if (!overlay) return false;
    if (!cmdBox) {
      cmdBox = document.createElement("div");
      cmdBox.className = "cmd-box";
      cmdBox.id = "cmd-box";
      overlay.innerHTML = "";
      overlay.appendChild(cmdBox);
    }
    if (!$(".cmd-search-row", cmdBox)) {
      cmdBox.innerHTML = `
        <div class="cmd-search-row">
          <span class="cmd-search-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></span>
          <input id="cmd-input" type="search" placeholder="Search reps, brands, items…" autocomplete="off" />
          <button type="button" class="cmd-esc" id="cmd-esc" aria-label="Close">Esc</button>
        </div>
        <div class="cmd-body" id="cmd-body"></div>`;
      cmdInput = $("#cmd-input", cmdBox);
      cmdBody = $("#cmd-body", cmdBox);
      $("#cmd-esc", cmdBox)?.addEventListener("click", closeCmd);
      cmdInput?.addEventListener("input", () => filterCmd(cmdInput.value));
    } else {
      cmdInput = $("#cmd-input", cmdBox);
      cmdBody = $("#cmd-body", cmdBox);
    }
    return true;
  }

  function buildSuggestIndex() {
    const map = new Map();
    const add = (phrase, type) => {
      const key = String(phrase || "").trim().toLowerCase();
      if (!key || key.length < 2 || key.length > 42) return;
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else map.set(key, { phrase: String(phrase).trim(), type, count: 1 });
    };
    ALL_PRODUCTS.forEach((p) => {
      if (p.brand) add(p.brand, "Brand");
      if (p.categoryLabel) add(p.categoryLabel, "Category");
      (p.tags || []).forEach((t) => add(t, "Tag"));
      const words = String(p.title || "")
        .replace(/[^\w\s+\-']/g, " ")
        .split(/\s+/)
        .filter(Boolean);
      if (words.length >= 2) add(words.slice(0, 2).join(" "), "Suggest");
      if (words.length >= 3) add(words.slice(0, 3).join(" "), "Suggest");
      if (p.brand && p.categoryLabel) add(`${p.brand} ${p.categoryLabel}`, "Suggest");
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }
  const SUGGEST_INDEX = ALL_PRODUCTS.length ? buildSuggestIndex() : [];

  function renderBrowseHome() {
    if (!cmdBody) return;
    const popular = POPULAR.map(
      (p) =>
        `<a class="cmd-pill cmd-item" href="spreadsheet.html?q=${encodeURIComponent(p)}">${escapeHtml(p)}</a>`
    ).join("");
    const cats = CMD_CATS.map((c) => {
      const icon = CAT_ICONS[c.slug] || CAT_ICONS.all;
      return `<a class="cmd-cat cmd-item" href="${escapeHtml(catHref(c.slug))}">${icon}<span>${escapeHtml(c.label)}</span></a>`;
    }).join("");
    const shortcuts = CMD_SHORTCUTS.map(
      (s) =>
        `<a class="cmd-shortcut cmd-item" href="${escapeHtml(s.href)}"><span class="cmd-shortcut-ico" aria-hidden="true">${s.icon}</span><span>${escapeHtml(s.label)}</span></a>`
    ).join("");
    cmdBody.innerHTML = `
      <div class="cmd-block">
        <p class="cmd-label">Popular</p>
        <div class="cmd-popular">${popular}</div>
      </div>
      <div class="cmd-block">
        <p class="cmd-label">Categories</p>
        <div class="cmd-cats">${cats}</div>
      </div>
      <div class="cmd-block">
        <p class="cmd-label">Shortcuts</p>
        <div class="cmd-shortcuts">${shortcuts}</div>
      </div>`;
  }

  function openCmd() {
    if (!ensureCmdShell()) return;
    overlay.classList.add("open");
    if (cmdInput) {
      cmdInput.value = "";
      cmdInput.focus();
    }
    filterCmd("");
  }
  function closeCmd() {
    overlay?.classList.remove("open");
  }
  function visibleCmdItems() {
    return $$(".cmd-item", cmdBody || document).filter((el) => el.style.display !== "none");
  }
  function setActive(i) {
    const visible = visibleCmdItems();
    $$(".cmd-item", cmdBody || document).forEach((el) => el.classList.remove("active"));
    if (!visible.length || i < 0) {
      active = -1;
      return;
    }
    active = Math.max(0, Math.min(i, visible.length - 1));
    visible[active]?.classList.add("active");
  }
  function filterCmd(q) {
    if (!ensureCmdShell() || !cmdBody) return;
    const query = q.trim().toLowerCase();
    const tokens = query ? query.split(/\s+/).filter(Boolean) : [];

    if (!tokens.length) {
      renderBrowseHome();
      setActive(-1);
      return;
    }

    const pageHits = [
      { href: "spreadsheet.html", label: "Kakobuy Spreadsheet", type: "Page" },
      { href: "deals.html", label: "Kakobuy Deals", type: "Page" },
      { href: "qc-finder.html", label: "QC Finder", type: "Tool" },
      { href: "coupons.html", label: "Kakobuy coupons", type: "Codes" },
      { href: "faq.html", label: "How to order FAQ", type: "Guide" },
      { href: "index.html#converter", label: "Link converter", type: "Tool" },
      { href: "index.html#estimate", label: "Shipping estimate", type: "Tool" },
      { href: "privacy.html", label: "Privacy policy", type: "Legal" },
      { href: "disclaimer.html", label: "Disclaimer", type: "Legal" },
    ].filter((p) => tokens.every((t) => p.label.toLowerCase().includes(t)));

    const suggestions = SUGGEST_INDEX.filter((s) => {
      const hay = s.phrase.toLowerCase();
      return tokens.every((t) => hay.includes(t)) || hay.startsWith(query);
    }).slice(0, 10);

    const productHits = ALL_PRODUCTS.filter((p) => {
      const hay = [p.title, p.brand, p.categoryLabel, ...(p.tags || []), p.id].join(" ").toLowerCase();
      return tokens.every((t) => hay.includes(t));
    }).slice(0, 8);

    let html = `<div class="cmd-results">`;
    if (pageHits.length) {
      html += `<div class="cmd-section">Pages</div>`;
      pageHits.forEach((p) => {
        html += `<a class="cmd-item" href="${escapeHtml(p.href)}"><span>${escapeHtml(p.label)}</span><span>${escapeHtml(p.type)}</span></a>`;
      });
    }
    if (productHits.length) {
      html += `<div class="cmd-section">Finds</div>`;
      productHits.forEach((p) => {
        const label = p.title.length > 56 ? p.title.slice(0, 54) + "…" : p.title;
        html += `<a class="cmd-item" href="${escapeHtml(productHref(p))}"><span>${escapeHtml(label)}</span><span>${money(p.price)}</span></a>`;
      });
    }
    if (suggestions.length) {
      html += `<div class="cmd-section">Suggestions</div>`;
      suggestions.forEach((s) => {
        html += `<a class="cmd-item cmd-suggest" href="spreadsheet.html?q=${encodeURIComponent(s.phrase)}"><span class="cmd-suggest-text">${escapeHtml(s.phrase)}</span><span>${escapeHtml(s.type)}</span></a>`;
      });
    }
    html += `<a class="cmd-item" href="spreadsheet.html?q=${encodeURIComponent(query)}">Search “${escapeHtml(query)}” in spreadsheet <span>Open</span></a>`;
    if (!pageHits.length && !suggestions.length && !productHits.length) {
      html += `<div class="cmd-empty">No suggestions — try another keyword.</div>`;
    }
    html += `</div>`;
    cmdBody.innerHTML = html;
    setActive(0);
  }
  function goActive() {
    const visible = visibleCmdItems();
    const el = visible[active];
    if (!el) return;
    const href = el.getAttribute("href");
    if (!href) return;
    location.href = href;
    closeCmd();
  }

  ensureCmdShell();
  $("#search-trigger")?.addEventListener("click", openCmd);
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeCmd();
    else if (e.target.closest(".cmd-item")) closeCmd();
  });
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (overlay?.classList.contains("open")) closeCmd();
      else openCmd();
    }
    if (!overlay?.classList.contains("open")) return;
    if (e.key === "Escape") closeCmd();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(active < 0 ? 0 : active + 1);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(active < 0 ? 0 : active - 1);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      goActive();
    }
  });

  /* ---------- PWA install banner + guide ---------- */
  const pwaState = (KakoHub.pwa = KakoHub.pwa || { deferred: null });

  function pwaStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }
  function pwaDismissed() {
    try {
      const t = Number(localStorage.getItem("kh-pwa-dismiss") || 0);
      return t && Date.now() - t < 30 * 24 * 60 * 60 * 1000;
    } catch (_) {
      return false;
    }
  }
  function pwaInstalledFlag() {
    try {
      return localStorage.getItem("kh-pwa-installed") === "1";
    } catch (_) {
      return false;
    }
  }
  function pwaIos() {
    return (
      (/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }
  function pwaAndroid() {
    return /android/i.test(navigator.userAgent);
  }
  function pwaChromium() {
    return (
      /Chrome|Edg|Chromium/i.test(navigator.userAgent) &&
      !/iPhone|iPad|CriOS|EdgiOS/i.test(navigator.userAgent)
    );
  }

  function refreshPwaUi() {
    const banner = $("#pwa-banner");
    const hide =
      pwaStandalone() || pwaInstalledFlag() || pwaDismissed() || !banner;
    if (banner) banner.classList.toggle("is-off", !!hide);
  }
  KakoHub.refreshPwaUi = refreshPwaUi;

  function showInstallGuide() {
    const guide = $("#ios-guide");
    const title = $("#pwa-guide-title");
    const gif = $("#pwa-guide-gif");
    const steps = $("#pwa-guide-steps");
    if (!guide || !gif || !steps) return;
    let data;
    if (pwaIos()) {
      data = {
        title: "Add to Home Screen",
        src: "/img/ios-a2hs.gif",
        alt: "Safari: tap Share, then Add to Home Screen",
        steps: [
          "Tap <b>Share</b> or the <b>•••</b> button",
          "Tap <b>Add to Home Screen</b>",
          "Tap <b>Add</b>",
        ],
      };
    } else if (pwaAndroid()) {
      data = {
        title: "Install app",
        src: "/img/android-a2hs.gif",
        alt: "Chrome: tap menu, then Install app",
        steps: [
          "Tap the <b>⋮</b> menu at the top right",
          "Tap <b>Install app</b> or <b>Add to Home screen</b>",
          "Tap <b>Install</b>",
        ],
      };
    } else {
      data = {
        title: "Install on this computer",
        src: "/img/icon-512.png",
        alt: "Kakobuyspreadsheet icon",
        steps: [
          "In <b>Chrome</b> or <b>Edge</b>, click the install icon in the address bar",
          "Or click <b>Add</b> when the system prompt appears",
          "Safari: <b>File → Add to Dock</b>",
        ],
      };
    }
    if (title) title.textContent = data.title;
    gif.src = data.src;
    gif.alt = data.alt;
    steps.innerHTML = data.steps.map((s) => `<li>${s}</li>`).join("");
    guide.classList.add("is-on");
  }

  async function waitForInstallPrompt(ms) {
    const start = Date.now();
    while (!pwaState.deferred && Date.now() - start < ms) {
      await new Promise((r) => setTimeout(r, 120));
    }
    return pwaState.deferred;
  }

  async function installPwa() {
    track("pwa_install_click");
    const addBtn = $("#pwa-add");
    const prev = addBtn ? addBtn.textContent : "";
    if (addBtn) addBtn.textContent = "…";
    const dp = await waitForInstallPrompt(pwaChromium() ? 2800 : 400);
    if (addBtn) addBtn.textContent = prev || "Add";
    if (dp && typeof dp.prompt === "function") {
      try {
        dp.prompt();
        const choice = await dp.userChoice.catch(() => ({ outcome: "dismissed" }));
        pwaState.deferred = null;
        if (choice && choice.outcome === "accepted") {
          try {
            localStorage.setItem("kh-pwa-installed", "1");
          } catch (_) {}
          $("#ios-guide")?.classList.remove("is-on");
          $("#pwa-banner")?.classList.add("is-off");
        }
        refreshPwaUi();
        return;
      } catch (_) {
        pwaState.deferred = null;
      }
    }
    showInstallGuide();
  }

  function mountPwa() {
    if (!$("#pwa-banner")) {
      const banner = document.createElement("div");
      banner.id = "pwa-banner";
      banner.className = "pwa-banner is-off";
      banner.innerHTML = `
        <img src="/img/icon-192.png" alt="" width="44" height="44" />
        <p>Add Kakobuyspreadsheet<span>Install for quick QC &amp; spreadsheet access</span></p>
        <button type="button" class="btn btn-red" id="pwa-add">Add</button>
        <button type="button" class="pwa-dismiss" id="pwa-dismiss" aria-label="Not now">×</button>
      `;
      document.body.appendChild(banner);
    }
    if (!$("#ios-guide")) {
      const guide = document.createElement("aside");
      guide.id = "ios-guide";
      guide.className = "ios-guide";
      guide.innerHTML = `
        <div class="ios-guide-top">
          <p id="pwa-guide-title">Add to Home Screen</p>
          <button type="button" class="pwa-dismiss" id="ios-guide-dismiss" aria-label="Close">×</button>
        </div>
        <img id="pwa-guide-gif" src="/img/ios-a2hs.gif" alt="Add to Home Screen" width="420" height="280" />
        <ol id="pwa-guide-steps"></ol>
      `;
      document.body.appendChild(guide);
    }
    const addBtn = $("#pwa-add");
    if (addBtn && !addBtn.dataset.bound) {
      addBtn.dataset.bound = "1";
      addBtn.addEventListener("click", (e) => {
        e.preventDefault();
        installPwa();
      });
    }
    const dismissBtn = $("#pwa-dismiss");
    if (dismissBtn && !dismissBtn.dataset.bound) {
      dismissBtn.dataset.bound = "1";
      dismissBtn.addEventListener("click", () => {
        $("#pwa-banner")?.classList.add("is-off");
        try {
          localStorage.setItem("kh-pwa-dismiss", String(Date.now()));
        } catch (_) {}
        track("pwa_dismiss");
      });
    }
    const closeGuide = $("#ios-guide-dismiss");
    if (closeGuide && !closeGuide.dataset.bound) {
      closeGuide.dataset.bound = "1";
      closeGuide.addEventListener("click", () => {
        $("#ios-guide")?.classList.remove("is-on");
        track("pwa_guide_dismiss");
      });
    }
    // Show banner after a short delay on mobile / when installable
    setTimeout(() => {
      if (pwaStandalone() || pwaInstalledFlag() || pwaDismissed()) {
        refreshPwaUi();
        return;
      }
      const banner = $("#pwa-banner");
      if (banner && (pwaState.deferred || pwaIos() || pwaAndroid())) {
        banner.classList.remove("is-off");
      }
      refreshPwaUi();
    }, 1800);
  }
  mountPwa();
})();
