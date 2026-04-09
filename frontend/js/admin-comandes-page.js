const state = {
  apiBase: "",
  orders: []
};

const $ = (id) => document.getElementById(id);

const ORDER_STATUSES = ["pendent", "preparant", "enviada", "entregada", "cancelada"];

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
  const el = $("adminOrdersStatus");
  el.className = `admin-status ${kind}`;
  el.textContent = message;
  el.style.display = "block";
}

function toMoney(value) {
  return Number(value || 0).toFixed(2);
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

async function fetchOrders() {
  const response = await fetch(`${state.apiBase}/api/comandes`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) throw new Error("No s'han pogut carregar les comandes");
  const data = await response.json();
  if (data.status !== "ok") throw new Error(data.message || "No s'han pogut carregar les comandes");
  return Array.isArray(data.orders) ? data.orders : [];
}

function renderOrders() {
  const body = $("ordersBody");

  if (!state.orders.length) {
    body.innerHTML = "";
    showStatus("empty", "No hi ha comandes per gestionar.");
    return;
  }

  showStatus("success", "Canvia l'estat de la comanda i desa canvis.");

  body.innerHTML = state.orders.map((order) => `
    <tr data-order-id="${order.id}">
      <td>#${order.id}</td>
      <td>${toDate(order.created_at)}</td>
      <td>${order.customer_name || "-"}</td>
      <td>${order.email || "-"}</td>
      <td>€${toMoney(order.total_amount)}</td>
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

async function updateOrderStatus(orderId, status) {
  const payload = new URLSearchParams({
    order_id: String(orderId),
    status
  });

  const response = await fetch(`${state.apiBase}/api/comandes`, {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    credentials: "include",
    body: payload
  });

  if (!response.ok) throw new Error("No s'ha pogut actualitzar l'estat de la comanda");

  const data = await response.json();
  if (data.status !== "ok") throw new Error(data.message || "No s'ha pogut actualitzar l'estat de la comanda");
}

function wireEvents() {
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
      await updateOrderStatus(orderId, newStatus);
      state.orders = await fetchOrders();
      renderOrders();
      showStatus("success", `Comanda #${orderId} actualitzada a '${newStatus}'.`);
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
  showStatus("loading", "Carregant comandes...");

  state.apiBase = await detectApiBase();
  if (!state.apiBase) {
    showStatus("error", "Backend no disponible. No es pot gestionar comandes.");
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
    state.orders = await fetchOrders();
    renderOrders();
  } catch (error) {
    showStatus("error", error.message);
  }
}

document.addEventListener("DOMContentLoaded", init);
