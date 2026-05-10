/**
 * Configuració del frontend (sense build step).
 *
 * Jetty (backend/pom.xml): port 8080, contextPath `/backend-1.0-SNAPSHOT`.
 *
 * IMPORTANT: obrir les pàgines HTML amb file:// sovint impedeix fetch cap a http://localhost
 * (CORS / context segur). Usa Live Server, o `npx serve frontend`, o el plugin del teu IDE.
 *
 * Pots forçar la URL del WAR (descomenta i ajusta):
 *   window.__PONPAPER_API_BASE__ = "http://localhost:8080/backend-1.0-SNAPSHOT";
 */
(function () {
  if (typeof window === "undefined" || window.__PONPAPER_API_BASE__) {
    return;
  }
  var h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") {
    var protocol = window.location.protocol === "https:" ? "https:" : "http:";
    window.__PONPAPER_API_BASE__ = protocol + "//" + h + ":8080/backend-1.0-SNAPSHOT";
  }
})();
