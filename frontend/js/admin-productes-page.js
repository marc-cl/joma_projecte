const state = {
  apiBase: "",
  products: []
};

const $ = (id) => document.getElementById(id);

function requireAdminLocalRole() {
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("userRole");
  if (username === "admin" && role === "admin") {
    return true;
  }

  const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `login.html?returnTo=${returnTo}`;
  return false;
}

async function validateAdminSession() {
  const response = await fetch(`${state.apiBase}/api/auth/session`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) return false;
  const data = await response.json();
  return data.status === "ok" && data.authenticated === true && data.role === "admin";
}

function showStatus(kind, message) {
  const el = $("adminStatus");
  el.className = `admin-status ${kind}`;
  el.textContent = message;
  el.style.display = "block";
}

async function detectApiBase() {
  const hostBase = `${location.protocol}//${location.host}`;
  const candidates = [
    `${hostBase}/backend-1.0-SNAPSHOT`,
    `${hostBase}/ponpaper-backend-1.0-SNAPSHOT`,
    `${hostBase}/ponpaper-backend`,
    "http://localhost:8080/backend-1.0-SNAPSHOT",
    "http://localhost:8080/ponpaper-backend-1.0-SNAPSHOT",
    "http://localhost:8080/ponpaper-backend"
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(`${candidate}/api/productes`, { method: "GET" });
      if (response.ok) return candidate;
    } catch (_) {
      // Keep trying candidates.
    }
  }

  return "";
}

async function fetchProducts() {
  const response = await fetch(`${state.apiBase}/api/productes`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) throw new Error("No s'han pogut carregar els productes");
  const data = await response.json();
  if (data.status !== "ok") throw new Error(data.message || "No s'han pogut carregar els productes");
  return Array.isArray(data.productes) ? data.productes : [];
}

function renderProducts() {
  const body = $("productsBody");

  if (!state.products.length) {
    body.innerHTML = "";
    showStatus("empty", "No hi ha productes per gestionar.");
    return;
  }

  showStatus("success", "Pots editar l'estoc i desar canvis producte a producte.");

  body.innerHTML = state.products.map((product) => `
    <tr data-product-id="${product.id}">
      <td>${product.id}</td>
      <td>${product.name}</td>
      <td>€${Number(product.price).toFixed(2)}</td>
      <td>${product.stock}</td>
      <td>
        <input type="number" min="0" value="${product.stock}" data-role="new-stock">
      </td>
      <td>
        <button type="button" class="admin-action-btn" data-role="save-stock">Guardar</button>
      </td>
    </tr>
  `).join("");
}

async function updateStock(productId, stock) {
  const payload = new URLSearchParams({
    product_id: String(productId),
    stock: String(stock)
  });

  const response = await fetch(`${state.apiBase}/api/productes/stock`, {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    credentials: "include",
    body: payload
  });

  if (!response.ok) throw new Error("No s'ha pogut actualitzar l'estoc");
  const data = await response.json();
  if (data.status !== "ok") throw new Error(data.message || "No s'ha pogut actualitzar l'estoc");
}

function wireEvents() {
  $("productsBody").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-role='save-stock']");
    if (!button) return;

    const row = event.target.closest("tr");
    const input = row.querySelector("[data-role='new-stock']");
    const productId = Number(row.dataset.productId);
    const newStock = Number(input.value);

    if (!Number.isInteger(newStock) || newStock < 0) {
      showStatus("error", "L'estoc ha de ser un numero enter >= 0.");
      return;
    }

    button.disabled = true;

    try {
      await updateStock(productId, newStock);
      state.products = await fetchProducts();
      renderProducts();
      showStatus("success", `Estoc del producte #${productId} actualitzat a ${newStock}.`);
    } catch (error) {
      showStatus("error", error.message);
    } finally {
      button.disabled = false;
    }
  });
}

async function init() {
  if (!requireAdminLocalRole()) return;

  wireEvents();
  showStatus("loading", "Carregant productes...");

  state.apiBase = await detectApiBase();
  if (!state.apiBase) {
    showStatus("error", "Backend no disponible. No es pot gestionar l'estoc.");
    return;
  }

  const validAdminSession = await validateAdminSession();
  if (!validAdminSession) {
    localStorage.removeItem("username");
    localStorage.removeItem("userRole");
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `login.html?returnTo=${returnTo}`;
    return;
  }

  try {
    state.products = await fetchProducts();
    renderProducts();
  } catch (error) {
    showStatus("error", error.message);
  }
}

document.addEventListener("DOMContentLoaded", init);
