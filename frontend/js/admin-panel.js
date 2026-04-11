import {
  API_BASE_KEY,
  buildApiCandidates,
  detectApiBase,
  detectApiBaseWithAdminSession,
  fetchWithTimeout
} from "./api-base.js";

const state = {
  apiBase: "",
  products: [],
  orders: [],
  activeTab: "productes"
};

const LOCAL_ORDERS_KEY_PREFIX = "ponpaper_orders_local";

const ORDER_STATUSES = ["pendent", "preparant", "enviada", "entregada", "cancelada"];
const ADMIN_USER = "admin";
const ADMIN_PASSWORD = "1234";

const $ = (id) => document.getElementById(id);

function requireAdminLocalRole() {
  // Control basic d'acces al panell.
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("userRole");
  if (username === "admin" && role === "admin") {
    return true;
  }

  const returnTo = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
  window.location.href = `login.html?returnTo=${returnTo}`;
  return false;
}

function showStatus(kind, message) {
  const el = $("adminPanelStatus");
  el.className = `admin-status ${kind}`;
  el.textContent = message;
  el.style.display = "block";
}

function errorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function parseTabFromHash() {
  const hash = (window.location.hash || "").toLowerCase();
  if (hash === "#comandes") return "comandes";
  return "productes";
}

function applyActiveTab(tab) {
  state.activeTab = tab;

  const tabs = document.querySelectorAll(".admin-tab");
  tabs.forEach((button) => {
    const isActive = button.dataset.tab === tab;
    button.classList.toggle("active", isActive);
  });

  const productsSection = $("tab-productes");
  const ordersSection = $("tab-comandes");
  productsSection.classList.toggle("active", tab === "productes");
  ordersSection.classList.toggle("active", tab === "comandes");

  window.location.hash = tab === "comandes" ? "comandes" : "productes";
}

function wireTabEvents() {
  // Canvi de pestanyes del panell.
  document.querySelectorAll(".admin-tab").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab === "comandes" ? "comandes" : "productes";
      applyActiveTab(tab);
    });
  });
}

async function updateWithCandidate(base, path, payload, method = "PUT") {
  // Wrapper unic per crides d'actualitzacio.
  const response = await fetchWithTimeout(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    credentials: "include",
    body: payload
  });

  if (!response.ok) {
    return { ok: false, status: response.status, data: null };
  }

  const data = await response.json();
  return { ok: data.status === "ok", status: response.status, data };
}

async function loginAdminAtBase(base) {
  // Reobre sessio admin per la base candidata (demo: credencials en clar només per a l’entorn de pràctiques).
  const response = await fetchWithTimeout(
    `${base}/api/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      credentials: "include",
      body: new URLSearchParams({ username: ADMIN_USER, password: ADMIN_PASSWORD })
    }
  );

  if (!response.ok) {
    return false;
  }

  try {
    const data = await response.json();
    return data.status === "ok";
  } catch (_) {
    return false;
  }
}

async function fetchProducts() {
  try {
    const response = await fetch(`${state.apiBase}/api/productes`, {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) throw new Error("No s'han pogut carregar els productes");
    const data = await response.json();
    if (data.status !== "ok") throw new Error(data.message || "No s'han pogut carregar els productes");
    return Array.isArray(data.productes) ? data.productes : [];
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to fetch") {
      throw new Error("No es pot connectar amb el backend per carregar productes.");
    }
    throw error;
  }
}

async function fetchOrders() {
  try {
    // Primer intenta via sessio actual.
    let response = await fetch(`${state.apiBase}/api/comandes?scope=all`, {
      method: "GET",
      credentials: "include"
    });

    // Fallback per entorns amb sessio no valida.
    if (response.status === 401 || response.status === 403) {
      const params = new URLSearchParams({
        scope: "all",
        admin_user: ADMIN_USER,
        admin_password: ADMIN_PASSWORD
      });

      response = await fetch(`${state.apiBase}/api/comandes?${params.toString()}`, {
        method: "GET",
        credentials: "include"
      });
    }

    if (!response.ok) {
      let message = "No s'han pogut carregar les comandes";
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          message = errorData.message;
        }
      } catch (_) {
        // Ignore JSON parsing error for non-JSON responses.
      }
      throw new Error(message);
    }

    const data = await response.json();
    if (data.status !== "ok") throw new Error(data.message || "No s'han pogut carregar les comandes");
    return Array.isArray(data.orders) ? data.orders : [];
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to fetch") {
      throw new Error("No es pot connectar amb el backend per carregar comandes.");
    }
    throw error;
  }
}

function readAllLocalOrders() {
  // Llegeix comandes locals de tots els usuaris.
  const orders = [];

  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith(`${LOCAL_ORDERS_KEY_PREFIX}_`)) continue;

    try {
      const raw = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(raw)) {
        orders.push(...raw.map((order) => ({
          ...order,
          payment_status: order.payment_status || "pagat"
        })));
      }
    } catch (_) {
      // Ignore malformed local order buckets.
    }
  }

  return orders;
}

function normalizeOrder(raw) {
  const items = Array.isArray(raw.items) ? raw.items : [];
  const totalItems = Number(raw.total_items || items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
  const totalAmount = Number(raw.total_amount || items.reduce((sum, item) => sum + Number(item.line_total || 0), 0));

  return {
    id: raw.id,
    created_at: raw.created_at,
    status: raw.status || "pendent",
    customer_name: raw.customer_name || "No informat",
    email: raw.email || "No informat",
    phone: raw.phone || "No informat",
    address: raw.address || "No informat",
    city: raw.city || "No informat",
    postal_code: raw.postal_code || "No informat",
    payment_method: raw.payment_method || "targeta",
    payment_status: raw.payment_status || "pendent",
    notes: raw.notes || "",
    buyer_username: raw.buyer_username || "local",
    total_items: totalItems,
    total_amount: totalAmount,
    items: items.map((item) => ({
      product_id: item.product_id,
      name: item.name || "Producte",
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 0),
      line_total: Number(item.line_total || (Number(item.price || 0) * Number(item.quantity || 0)))
    }))
  };
}

function mergeOrders(baseOrders, localOrders) {
  // Fusiona backend + local i elimina duplicats per id.
  return [...baseOrders, ...localOrders]
    .map(normalizeOrder)
    .filter((order, index, self) => index === self.findIndex((other) => String(other.id) === String(order.id)))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function refreshProductsInBackground() {
  fetchProducts()
    .then((items) => {
      state.products = items;
      renderProducts();
    })
    .catch(() => {
      // Manté la vista optimista si el refresc falla.
    });
}

function refreshOrdersInBackground() {
  Promise.allSettled([fetchOrders(), Promise.resolve(readAllLocalOrders())])
    .then(([backendResult, localResult]) => {
      const backendOrders = backendResult.status === "fulfilled" ? backendResult.value : [];
      const localOrders = localResult.status === "fulfilled" ? localResult.value : [];
      state.orders = mergeOrders(backendOrders, localOrders);
      renderOrders();
    });
}

function refreshProductsView(productId, newStock) {
  state.products = state.products.map((product) => (
    Number(product.id) === Number(productId)
      ? { ...product, stock: Number(newStock) }
      : product
  ));
  renderProducts();
}

function refreshOrdersView(orderId, newStatus) {
  state.orders = state.orders.map((order) => (
    String(order.id) === String(orderId)
      ? { ...order, status: newStatus }
      : order
  ));
  renderOrders();
}

function toDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data no disponible";
  return date.toLocaleString("ca-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

function renderProducts() {
  const body = $("productsBody");

  if (!state.products.length) {
    body.innerHTML = "";
    return;
  }

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

function renderOrders() {
  const body = $("ordersBody");

  if (!state.orders.length) {
    body.innerHTML = "";
    return;
  }

  body.innerHTML = state.orders.map((order) => `
    <tr data-order-id="${order.id}">
      <td>#${order.id}</td>
      <td>${toDate(order.created_at)}</td>
      <td>${order.customer_name || "-"}</td>
      <td>${order.email || "-"}</td>
      <td>€${toMoney(order.total_amount)}</td>
      <td>${order.payment_status || "pendent"}</td>
      <td>
        <select data-role="status-select">
          ${ORDER_STATUSES.map((status) => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </td>
      <td>
        <button type="button" class="admin-action-btn" data-role="save-order-status">Guardar</button>
      </td>
    </tr>
  `).join("");
}

async function updateStock(productId, stock) {
  // Intenta actualitzar estoc a qualsevol base valida.
  const payload = new URLSearchParams({
    product_id: String(productId),
    stock: String(stock)
  });

  for (const base of buildApiCandidates()) {
    try {
      const logged = await loginAdminAtBase(base);
      if (!logged) {
        continue;
      }

      const result = await updateWithCandidate(base, "/api/productes/stock", payload, "PUT");
      if (result.ok) {
        state.apiBase = base;
        localStorage.setItem(API_BASE_KEY, base);
        return true;
      }
    } catch (_) {
      // Try next candidate.
    }
  }

  return false;
}

function updateLocalOrderStatus(orderId, status) {
  // Manté consistencia de comandes locals.
  let changed = false;

  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith(`${LOCAL_ORDERS_KEY_PREFIX}_`)) continue;

    try {
      const raw = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(raw)) continue;

      const mapped = raw.map((order) => {
        if (String(order.id) !== String(orderId)) return order;
        changed = true;
        return { ...order, status };
      });
      localStorage.setItem(key, JSON.stringify(mapped));
    } catch (_) {
      // Ignore malformed buckets.
    }
  }

  if (changed) {
    state.orders = state.orders.map((order) => String(order.id) === String(orderId) ? { ...order, status } : order);
    renderOrders();
  }

  return changed;
}

async function updateOrderStatus(orderId, status) {
  // Prova backend; si no existeix, actualitza local.
  const payload = new URLSearchParams({
    order_id: String(orderId),
    status
  });

  for (const base of buildApiCandidates()) {
    try {
      const result = await updateWithCandidate(base, "/api/comandes", payload);
      if (result.ok) {
        state.apiBase = base;
        localStorage.setItem(API_BASE_KEY, base);
        return true;
      }

      if (result.data && result.data.message && result.data.message.includes("Comanda no trobada")) {
        if (updateLocalOrderStatus(orderId, status)) {
          return true;
        }
      }
    } catch (_) {
      // Try next candidate.
    }
  }

  if (updateLocalOrderStatus(orderId, status)) {
    return true;
  }

  return false;
}

function wireActionEvents() {
  // Guardat d'estoc.
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
      const updated = await updateStock(productId, newStock);
      if (!updated) {
        throw new Error("No s'ha pogut actualitzar l'estoc");
      }

      refreshProductsView(productId, newStock);
      showStatus("success", `Estoc del producte #${productId} actualitzat a ${newStock}.`);

      // Refresc en segon pla.
      refreshProductsInBackground();
    } catch (error) {
      showStatus("error", errorMessage(error, "No s'ha produït una resposta valida en actualitzar l'estoc."));
    } finally {
      button.disabled = false;
    }
  });

  // Guardat d'estat de comandes.
  $("ordersBody").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-role='save-order-status']");
    if (!button) return;

    const row = event.target.closest("tr");
    const orderId = Number(row.dataset.orderId);
    const statusSelect = row.querySelector("[data-role='status-select']");
    const newStatus = String(statusSelect.value || "").trim();

    if (!ORDER_STATUSES.includes(newStatus)) {
      showStatus("error", "Estat no valid.");
      return;
    }

    button.disabled = true;
    try {
      const updated = await updateOrderStatus(orderId, newStatus);
      if (!updated) {
        throw new Error("No s'ha pogut actualitzar l'estat de la comanda");
      }

      refreshOrdersView(orderId, newStatus);
      showStatus("success", `Comanda #${orderId} actualitzada a '${newStatus}'.`);

      refreshOrdersInBackground();
    } catch (error) {
      showStatus("error", errorMessage(error, "No s'ha produït una resposta valida en actualitzar la comanda."));
    } finally {
      button.disabled = false;
    }
  });
}

async function init() {
  // Inicialitza dades i UI del panell admin.
  if (!requireAdminLocalRole()) return;

  wireTabEvents();
  wireActionEvents();
  applyActiveTab(parseTabFromHash());

  showStatus("loading", "Carregant dades d'administracio...");

  state.apiBase = await detectApiBaseWithAdminSession();
  if (!state.apiBase) {
    state.apiBase = await detectApiBase();
  }
  if (!state.apiBase) {
    showStatus("error", "Backend no disponible. No es pot carregar el panell admin.");
    return;
  }
  localStorage.setItem(API_BASE_KEY, state.apiBase);

  try {
    const [productsResult, ordersResult] = await Promise.allSettled([fetchProducts(), fetchOrders()]);
    const localOrders = readAllLocalOrders().map(normalizeOrder);

    if (productsResult.status === "fulfilled") {
      state.products = productsResult.value;
    } else {
      state.products = [];
      console.error(productsResult.reason);
    }

    if (ordersResult.status === "fulfilled") {
      state.orders = ordersResult.value;
    } else {
      state.orders = [];
      console.error(ordersResult.reason);
    }

    state.orders = mergeOrders(state.orders, localOrders);

    renderProducts();
    renderOrders();

    if (state.products.length && state.orders.length) {
      showStatus("success", "Panell admin llest: productes i comandes operatius.");
    } else if (state.products.length) {
      showStatus("success", "Productes carregats. Les comandes no s'han pogut carregar ara mateix.");
    } else if (state.orders.length) {
      showStatus("success", "Comandes carregades. Els productes no s'han pogut carregar ara mateix.");
    } else {
      showStatus("empty", "No hi ha dades per gestionar.");
    }
  } catch (error) {
    showStatus("error", errorMessage(error, "No s'ha pogut carregar el panell admin."));
  }
}

document.addEventListener("DOMContentLoaded", init);
