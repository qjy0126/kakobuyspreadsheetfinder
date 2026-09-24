/* Early PWA boot — register SW before beforeinstallprompt can fire */
(function () {
  window.KakoHub = window.KakoHub || {};
  KakoHub.pwa = KakoHub.pwa || { deferred: null };

  /* Sync-load i18n before body scripts (path absolute) */
  document.write('<script src="/js/i18n.js"><\/script>');

  function ensureHead() {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/manifest.json";
      document.head.appendChild(link);
    }
    const metas = [
      ["theme-color", "#fb2840"],
      ["mobile-web-app-capable", "yes"],
      ["apple-mobile-web-app-capable", "yes"],
      ["apple-mobile-web-app-status-bar-style", "black-translucent"],
      ["apple-mobile-web-app-title", "Kakobuyspreadsheet"],
      ["application-name", "Kakobuyspreadsheet"],
    ];
    metas.forEach(([name, content]) => {
      if (document.querySelector(`meta[name="${name}"]`)) return;
      const el = document.createElement("meta");
      el.name = name;
      el.content = content;
      document.head.appendChild(el);
    });
    if (!document.querySelector('link[rel="apple-touch-icon"][sizes]')) {
      const icon = document.createElement("link");
      icon.rel = "apple-touch-icon";
      icon.sizes = "180x180";
      icon.href = "/img/apple-touch-icon.png";
      document.head.appendChild(icon);
    }
  }

  if (document.head) ensureHead();
  else document.addEventListener("DOMContentLoaded", ensureHead);

  if ("serviceWorker" in navigator) {
    const register = () =>
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    KakoHub.pwa.deferred = e;
    if (typeof KakoHub.refreshPwaUi === "function") KakoHub.refreshPwaUi();
  });

  window.addEventListener("appinstalled", function () {
    KakoHub.pwa.deferred = null;
    try {
      localStorage.setItem("kh-pwa-installed", "1");
    } catch (_) {}
    if (typeof KakoHub.track === "function") KakoHub.track("pwa_installed");
    if (typeof KakoHub.refreshPwaUi === "function") KakoHub.refreshPwaUi();
  });
})();
