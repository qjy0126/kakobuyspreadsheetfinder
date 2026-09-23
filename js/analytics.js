/* Kakobuyspreadsheet — GA4 (same property as kakobuyspreadsheet.me) */
(function () {
  var MEASUREMENT_ID = "G-J7XGTCP578";
  window.KakoHub = window.KakoHub || {};
  window.KakoHub.analyticsId = MEASUREMENT_ID;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;
  gtag("js", new Date());
  gtag("config", MEASUREMENT_ID);

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
  document.head.appendChild(s);
})();
