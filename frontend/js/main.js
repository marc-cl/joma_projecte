// Sessio global: mostra l'usuari connectat a totes les pagines i sincronitza entre pestanyes.
(() => {
  const USERNAME_KEY = "username";
  const USER_ID_KEY = "userId";
  const LEGACY_USER_KEY = "usuariConnectat";
  const LAST_PAGE_KEY = "lastVisitedPage";
  const AUTH_ITEM_ATTR = "data-auth-item";

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
    localStorage.removeItem(USERNAME_KEY);
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
      }
    } else {
      userNameLink.textContent = "Inicia sessió";
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

  function renderNavAuth(username) {
    const navList = document.querySelector(".site-nav ul") || document.querySelector("header nav ul");
    if (!navList) return;

    removeInjectedAuthItems(navList);

    const loginLink = navList.querySelector('a[href$="login.html"]');
    const loginItem = loginLink ? loginLink.closest("li") : null;

    if (username) {
      if (loginItem) loginItem.style.display = "none";

      const userItem = document.createElement("li");
      userItem.setAttribute(AUTH_ITEM_ATTR, "true");
      userItem.innerHTML = `<span>Hola, ${username}</span>`;

      const logoutItem = document.createElement("li");
      logoutItem.setAttribute(AUTH_ITEM_ATTR, "true");
      const logoutLink = document.createElement("a");
      logoutLink.href = "#";
      logoutLink.textContent = "Surt";
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
    renderUserArea(username);
    renderNavAuth(username);
  }

  document.addEventListener("DOMContentLoaded", () => {
    rememberCurrentPage();
    renderSessionState();
  });
  window.addEventListener("storage", (event) => {
    if (
      event.key === null ||
      event.key === USERNAME_KEY ||
      event.key === USER_ID_KEY ||
      event.key === LEGACY_USER_KEY
    ) {
      renderSessionState();
    }
  });
})();
