// Sessio global: mostra l'usuari connectat a totes les pagines i sincronitza entre pestanyes.
(() => {
  const API_BASE_KEY = "ponpaperApiBase";
  const LANG_KEY = "ponpaperLang";
  const USERNAME_KEY = "username";
  const USER_ROLE_KEY = "userRole";
  const USER_ID_KEY = "userId";
  const LEGACY_USER_KEY = "usuariConnectat";
  const LAST_PAGE_KEY = "lastVisitedPage";
  const AUTH_ITEM_ATTR = "data-auth-item";
  const DEFAULT_LANG = "ca";

  const TRANSLATIONS = {
    ca: {
      "lang.ca": "Català",
      "lang.es": "Castellano",
      "lang.en": "English",
      "home.title": "Inici | Botiga Online",
      "orders.title": "Les meves comandes | PONPAPERConnect",
      "admin.title": "Admin | PONPAPERConnect",
      "login.title": "Inicia sessió | PONPAPERConnect",
      "private.title": "Àrea privada | Botiga Online",
      "budget.title": "Pressupost - PONPAPERConnect",
      "nav.home": "Inici",
      "nav.products": "Productes",
      "nav.catalog": "Catàleg",
      "nav.orders": "Comandes",
      "nav.myOrders": "Les meves comandes",
      "nav.budget": "Pressupost",
      "nav.contact": "Contacte",
      "nav.login": "Accedeix / Registra't",
      "nav.admin": "Admin",
      "cart.title": "Carret de compra",
      "cart.total": "Total",
      "cart.close": "Tanca",
      "cart.checkout": "Finalitza la compra",
      "checkout.subtotal": "Subtotal",
      "checkout.vat": "IVA 21%",
      "checkout.total": "Total final",
      "contact.title": "Contacta amb nosaltres",
      "contact.phoneLabel": "Tel:",
      "contact.emailLabel": "Correu:",
      "contact.form.name": "Nom",
      "contact.form.email": "Correu electrònic",
      "contact.form.message": "Missatge",
      "contact.send": "Enviar",
      "contact.sentSimulated": "Missatge enviat (simulat).",
      "budget.requestTitle": "Sol·licitud de pressupost",
      "admin.panelTitle": "Panell d'administracio",
      "admin.panelSubtitle": "Gestiona productes i comandes des d'un unic lloc.",
      "admin.tabProducts": "Gestio de productes",
      "admin.tabOrders": "Gestio de comandes",
      "admin.productsHelp": "Canvia l'estoc de qualsevol producte i desa els canvis.",
      "admin.ordersHelp": "Revisa les comandes i actualitza el seu estat.",
      "admin.colProduct": "Producte",
      "admin.colPrice": "Preu",
      "admin.colCurrentStock": "Estoc actual",
      "admin.colNewStock": "Nou estoc",
      "admin.colAction": "Accio",
      "admin.colDate": "Data",
      "admin.colClient": "Client",
      "admin.colPayment": "Pagament",
      "admin.colStatus": "Estat",
      "admin.colSave": "Guardar",
      "orders.summaryOrders": "Total comandes",
      "orders.summaryProducts": "Total productes",
      "orders.summaryAmount": "Import acumulat",
      "auth.loginShort": "Inicia sessió",
      "auth.logout": "Surt",
      "auth.hello": "Hola"
    },
    es: {
      "lang.ca": "Català",
      "lang.es": "Castellano",
      "lang.en": "English",
      "home.title": "Inicio | Tienda Online",
      "orders.title": "Mis pedidos | PONPAPERConnect",
      "admin.title": "Admin | PONPAPERConnect",
      "login.title": "Iniciar sesión | PONPAPERConnect",
      "private.title": "Área privada | Tienda Online",
      "budget.title": "Presupuesto - PONPAPERConnect",
      "nav.home": "Inicio",
      "nav.products": "Productos",
      "nav.catalog": "Catálogo",
      "nav.orders": "Pedidos",
      "nav.myOrders": "Mis pedidos",
      "nav.budget": "Presupuesto",
      "nav.contact": "Contacto",
      "nav.login": "Acceder / Registrarse",
      "nav.admin": "Admin",
      "cart.title": "Carrito",
      "cart.total": "Total",
      "cart.close": "Cerrar",
      "cart.checkout": "Finalizar compra",
      "checkout.subtotal": "Subtotal",
      "checkout.vat": "IVA 21%",
      "checkout.total": "Total final",
      "contact.title": "Contacta con nosotros",
      "contact.phoneLabel": "Tel:",
      "contact.emailLabel": "Correo:",
      "contact.form.name": "Nombre",
      "contact.form.email": "Correo electrónico",
      "contact.form.message": "Mensaje",
      "contact.send": "Enviar",
      "contact.sentSimulated": "Mensaje enviado (simulado).",
      "budget.requestTitle": "Solicitud de presupuesto",
      "admin.panelTitle": "Panel de administración",
      "admin.panelSubtitle": "Gestiona productos y pedidos desde un único lugar.",
      "admin.tabProducts": "Gestión de productos",
      "admin.tabOrders": "Gestión de pedidos",
      "admin.productsHelp": "Cambia el stock de cualquier producto y guarda los cambios.",
      "admin.ordersHelp": "Revisa los pedidos y actualiza su estado.",
      "admin.colProduct": "Producto",
      "admin.colPrice": "Precio",
      "admin.colCurrentStock": "Stock actual",
      "admin.colNewStock": "Nuevo stock",
      "admin.colAction": "Acción",
      "admin.colDate": "Fecha",
      "admin.colClient": "Cliente",
      "admin.colPayment": "Pago",
      "admin.colStatus": "Estado",
      "admin.colSave": "Guardar",
      "orders.summaryOrders": "Total pedidos",
      "orders.summaryProducts": "Total productos",
      "orders.summaryAmount": "Importe acumulado",
      "auth.loginShort": "Iniciar sesión",
      "auth.logout": "Salir",
      "auth.hello": "Hola"
    },
    en: {
      "lang.ca": "Català",
      "lang.es": "Castellano",
      "lang.en": "English",
      "home.title": "Home | Online Store",
      "orders.title": "My orders | PONPAPERConnect",
      "admin.title": "Admin | PONPAPERConnect",
      "login.title": "Sign in | PONPAPERConnect",
      "private.title": "Private area | Online Store",
      "budget.title": "Budget - PONPAPERConnect",
      "nav.home": "Home",
      "nav.products": "Products",
      "nav.catalog": "Catalog",
      "nav.orders": "Orders",
      "nav.myOrders": "My orders",
      "nav.budget": "Budget",
      "nav.contact": "Contact",
      "nav.login": "Sign in / Register",
      "nav.admin": "Admin",
      "cart.title": "Cart",
      "cart.total": "Total",
      "cart.close": "Close",
      "cart.checkout": "Checkout",
      "checkout.subtotal": "Subtotal",
      "checkout.vat": "VAT 21%",
      "checkout.total": "Final total",
      "contact.title": "Contact us",
      "contact.phoneLabel": "Phone:",
      "contact.emailLabel": "Email:",
      "contact.form.name": "Name",
      "contact.form.email": "Email",
      "contact.form.message": "Message",
      "contact.send": "Send",
      "contact.sentSimulated": "Message sent (simulated).",
      "budget.requestTitle": "Budget request",
      "admin.panelTitle": "Admin panel",
      "admin.panelSubtitle": "Manage products and orders from one place.",
      "admin.tabProducts": "Product management",
      "admin.tabOrders": "Order management",
      "admin.productsHelp": "Update product stock and save changes.",
      "admin.ordersHelp": "Review orders and update their status.",
      "admin.colProduct": "Product",
      "admin.colPrice": "Price",
      "admin.colCurrentStock": "Current stock",
      "admin.colNewStock": "New stock",
      "admin.colAction": "Action",
      "admin.colDate": "Date",
      "admin.colClient": "Customer",
      "admin.colPayment": "Payment",
      "admin.colStatus": "Status",
      "admin.colSave": "Save",
      "orders.summaryOrders": "Total orders",
      "orders.summaryProducts": "Total products",
      "orders.summaryAmount": "Accumulated amount",
      "auth.loginShort": "Sign in",
      "auth.logout": "Log out",
      "auth.hello": "Hello"
    }
  };

  function getLanguage() {
    // Multillenguatge pausat temporalment: sempre catala.
    return DEFAULT_LANG;
  }

  function setLanguage(lang) {
    // Manté la clau en catala per poder reactivar idiomes en el futur.
    localStorage.setItem(LANG_KEY, lang === "ca" ? "ca" : DEFAULT_LANG);
    applyTranslations();
  }

  function t(key) {
    const lang = getLanguage();
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS[DEFAULT_LANG]?.[key] || key;
  }

  function applyTranslations() {
    const lang = getLanguage();
    document.documentElement.setAttribute("lang", lang);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      el.setAttribute("placeholder", t(key));
    });

    const titleNode = document.querySelector("title[data-i18n-title]");
    if (titleNode) {
      const key = titleNode.getAttribute("data-i18n-title");
      if (key) {
        titleNode.textContent = t(key);
      }
    }

    document.querySelectorAll("#language-selector-tabs button[data-lang]").forEach((btn) => {
      const langCode = btn.getAttribute("data-lang");
      btn.classList.toggle("active", langCode === lang);
    });
  }

  function injectLanguageTabs() {
    // Selector ocult mentre només es mostra catala.
  }

  function detectApiCandidates() {
    const hostBase = `${location.protocol}//${location.host}`;
    const savedBase = localStorage.getItem(API_BASE_KEY);
    return [
      ...(savedBase ? [savedBase] : []),
      `${hostBase}/backend-1.0-SNAPSHOT`,
      `${hostBase}/ponpaper-backend-1.0-SNAPSHOT`,
      `${hostBase}/ponpaper-backend`,
      "http://localhost:8080/backend-1.0-SNAPSHOT",
      "http://localhost:8080/ponpaper-backend-1.0-SNAPSHOT",
      "http://localhost:8080/ponpaper-backend"
    ];
  }

  async function clearBackendAdminSession() {
    const candidates = detectApiCandidates();
    for (const base of candidates) {
      try {
        const res = await fetch(`${base}/api/auth/logout`, {
          method: "POST",
          credentials: "include"
        });
        if (res.ok) return;
      } catch (_) {
        // Ignore logout errors in unreachable candidates.
      }
    }
  }

  function isAuthPage(pathname) {
    const path = pathname.toLowerCase();
    return path.endsWith("/pages/login.html") ||
      path.endsWith("/pages/private.html") ||
      path.endsWith("/login.html") ||
      path.endsWith("/private.html");
  }

  function rememberCurrentPage() {
    if (isAuthPage(window.location.pathname)) return;
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    localStorage.setItem(LAST_PAGE_KEY, currentPath);
  }

  function clearSession() {
    clearBackendAdminSession();
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  }

  function inferLoginHref() {
    const loginLink = document.querySelector('a[href$="login.html"]');
    if (loginLink) {
      return loginLink.getAttribute("href") || "login.html";
    }
    return window.location.pathname.includes("/pages/")
      ? "login.html"
      : "pages/login.html";
  }

  function renderUserArea(username) {
    const userNameLink = document.getElementById("user-name");
    const logoutBtnHeader = document.getElementById("logout-btn-header");
    if (!userNameLink) return;

    const loginHref = userNameLink.getAttribute("href") || inferLoginHref();

    if (username) {
      userNameLink.textContent = username;
      if (logoutBtnHeader) {
        logoutBtnHeader.style.display = "inline-block";
        logoutBtnHeader.onclick = () => {
          clearSession();
          window.location.href = loginHref;
        };
        logoutBtnHeader.textContent = t("auth.logout");
      }
    } else {
      userNameLink.textContent = t("auth.loginShort");
      userNameLink.setAttribute("href", loginHref);
      if (logoutBtnHeader) {
        logoutBtnHeader.style.display = "none";
        logoutBtnHeader.onclick = null;
      }
    }
  }

  function removeInjectedAuthItems(navList) {
    navList
      .querySelectorAll(`[${AUTH_ITEM_ATTR}="true"]`)
      .forEach((el) => el.remove());
  }

  function resolveLinkForCurrentDepth(fileInPagesDir, fileAtRoot) {
    return window.location.pathname.includes("/pages/") ? fileInPagesDir : fileAtRoot;
  }

  function createNavLinkItem(href, text) {
    const li = document.createElement("li");
    li.setAttribute(AUTH_ITEM_ATTR, "true");
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    li.appendChild(a);
    return li;
  }

  function renderNavAuth(username, role) {
    const navList = document.querySelector(".site-nav ul") || document.querySelector("header nav ul");
    if (!navList) return;

    removeInjectedAuthItems(navList);

    const loginLink = navList.querySelector('a[href$="login.html"]');
    const loginItem = loginLink ? loginLink.closest("li") : null;

    if (username) {
      if (loginItem) loginItem.style.display = "none";

      if (role === "admin") {
        const adminPanelHref = resolveLinkForCurrentDepth("admin_productes.html", "pages/admin_productes.html");
        const hasAdminLink = Array.from(navList.querySelectorAll("a")).some((link) => {
          const href = (link.getAttribute("href") || "").toLowerCase();
          return href.endsWith("admin_productes.html") || href.endsWith("pages/admin_productes.html");
        });

        if (!hasAdminLink) {
          navList.appendChild(createNavLinkItem(adminPanelHref, t("nav.admin")));
        }
      }

      const userItem = document.createElement("li");
      userItem.setAttribute(AUTH_ITEM_ATTR, "true");
      userItem.innerHTML = `<span>${t("auth.hello")}, ${username}</span>`;

      const logoutItem = document.createElement("li");
      logoutItem.setAttribute(AUTH_ITEM_ATTR, "true");
      const logoutLink = document.createElement("a");
      logoutLink.href = "#";
      logoutLink.textContent = t("auth.logout");
      logoutLink.onclick = (event) => {
        event.preventDefault();
        clearSession();
        const loginHref = loginLink
          ? loginLink.getAttribute("href") || inferLoginHref()
          : inferLoginHref();
        window.location.href = loginHref;
      };

      logoutItem.appendChild(logoutLink);
      navList.appendChild(userItem);
      navList.appendChild(logoutItem);
    } else if (loginItem) {
      loginItem.style.display = "";
    }
  }

  function renderSessionState() {
    const username = localStorage.getItem(USERNAME_KEY);
    const role = localStorage.getItem(USER_ROLE_KEY);
    renderUserArea(username);
    renderNavAuth(username, role);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectLanguageTabs();
    rememberCurrentPage();
    renderSessionState();
    applyTranslations();
  });
  window.addEventListener("storage", (event) => {
    if (
      event.key === null ||
      event.key === LANG_KEY ||
      event.key === USERNAME_KEY ||
      event.key === USER_ROLE_KEY ||
      event.key === USER_ID_KEY ||
      event.key === LEGACY_USER_KEY
    ) {
      renderSessionState();
      applyTranslations();
    }
  });

  window.i18n = {
    t,
    getLanguage,
    setLanguage,
    applyTranslations
  };
})();
