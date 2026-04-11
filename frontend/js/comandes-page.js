import { detectApiBase, API_BASE_KEY } from "./api-base.js";

const LOCAL_ORDERS_KEY_PREFIX = "ponpaper_orders_local";

const state = {
  apiBase: "",
  orders: []
};

const $ = (id) => document.getElementById(id);

function errorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function showStatus(kind, message) {
  const box = $("ordersStatus");
  if (!box) return;
  box.className = `orders-status ${kind}`;
  box.textContent = message;
  box.style.display = "block";
}

function hideStatus() {
  const box = $("ordersStatus");
  if (!box) return;
  box.style.display = "none";
}

function readLocalOrders() {
  const username = currentUsername();
  const key = `${LOCAL_ORDERS_KEY_PREFIX}_${username}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function currentUsername() {
  return String(localStorage.getItem("username") || "").trim();
}

async function fetchApiOrders() {
  if (!state.apiBase) {
    return [];
  }

  const username = currentUsername();
  if (!username) {
    return [];
  }

  const params = new URLSearchParams({ username });
  const response = await fetch(`${state.apiBase}/api/comandes?${params.toString()}`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("No s'han pogut obtenir les comandes del backend");
  }

  const data = await response.json();
  if (data.status !== "ok") {
    throw new Error(data.message || "No s'han pogut obtenir les comandes");
  }

  return Array.isArray(data.orders) ? data.orders : [];
}

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

function toDate(value) {
  if (!value) return "Data no disponible";
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

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeOrder(raw) {
  const items = Array.isArray(raw.items) ? raw.items : [];
  const totalItems = Number(raw.total_items || items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
  const subtotalAmount = Number(raw.subtotal_amount || items.reduce((sum, item) => sum + Number(item.line_total || 0), 0));
  const vatAmount = Number(raw.vat_amount || subtotalAmount * 0.21);
  const totalAmount = Number(raw.total_amount || subtotalAmount + vatAmount);

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
    payment_reference: raw.payment_reference || "",
    notes: raw.notes || "",
    total_items: totalItems,
    subtotal_amount: subtotalAmount,
    vat_amount: vatAmount,
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

function highlightOrderId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("created") || "";
}

function orderCard(order, createdId) {
  const highlighted = String(order.id) === String(createdId);
  return `
    <article class="order-card ${highlighted ? "highlight" : ""}">
      <header class="order-head">
        <div>
          <div class="order-id">Comanda #${escapeHtml(order.id)}</div>
          <div class="order-meta">Data: ${escapeHtml(toDate(order.created_at))}</div>
        </div>
        <span class="order-status">${escapeHtml(order.status)}</span>
      </header>

      <section class="order-grid">
        <div class="order-info-block">
          <h3>Dades de client</h3>
          <p><strong>Nom:</strong> ${escapeHtml(order.customer_name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(order.email)}</p>
          <p><strong>Telefon:</strong> ${escapeHtml(order.phone)}</p>
        </div>

        <div class="order-info-block">
          <h3>Entrega i pagament</h3>
          <p><strong>Adreca:</strong> ${escapeHtml(order.address)}</p>
          <p><strong>Ciutat:</strong> ${escapeHtml(order.city)} (${escapeHtml(order.postal_code)})</p>
          <p><strong>Pagament:</strong> ${escapeHtml(order.payment_method)}</p>
          <p><strong>Notes:</strong> ${escapeHtml(order.notes || "-")}</p>
        </div>
      </section>

      <section class="order-lines">
        <table>
          <thead>
            <tr>
              <th>Producte</th>
              <th>Preu</th>
              <th>Quantitat</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((item) => `
              <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>€${toMoney(item.price)}</td>
                <td>${escapeHtml(item.quantity)}</td>
                <td>€${toMoney(item.line_total)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>

      <footer class="order-total">
        <div>${escapeHtml(order.total_items)} productes</div>
        <div>Subtotal: €${toMoney(order.subtotal_amount)}</div>
        <div>IVA 21%: €${toMoney(order.vat_amount)}</div>
        <div><strong>Total: €${toMoney(order.total_amount)}</strong></div>
      </footer>
    </article>
  `;
}

function renderSummary(orders) {
  const totalOrders = orders.length;
  const totalItems = orders.reduce((sum, order) => sum + Number(order.total_items || 0), 0);
  const totalAmount = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  const so = $("summaryOrders");
  const si = $("summaryItems");
  const sa = $("summaryAmount");
  const os = $("ordersSummary");
  if (so) so.textContent = String(totalOrders);
  if (si) si.textContent = String(totalItems);
  if (sa) sa.textContent = toMoney(totalAmount);
  if (os) os.style.display = totalOrders ? "grid" : "none";
}

function renderOrders(orders) {
  const container = $("ordersContainer");
  if (!container) return;
  const createdId = highlightOrderId();
  const username = currentUsername();

  if (!username) {
    container.innerHTML = `
      <div class="order-empty-actions">
        <p>Has d'iniciar sessio per veure les teves comandes.</p>
        <a href="login.html?returnTo=comandes.html">Iniciar sessio</a>
      </div>
    `;
    showStatus("empty", "Sessio requerida per consultar comandes.");
    renderSummary([]);
    return;
  }

  if (!orders.length) {
    container.innerHTML = `
      <div class="order-empty-actions">
        <p>Encara no tens comandes.</p>
        <a href="productes.html">Comencar una compra</a>
      </div>
    `;
    showStatus("empty", "No hi ha comandes per mostrar.");
    renderSummary([]);
    return;
  }

  hideStatus();
  container.innerHTML = orders.map((order) => orderCard(order, createdId)).join("");
  renderSummary(orders);
}

async function init() {
  showStatus("loading", "Carregant comandes...");

  state.apiBase = await detectApiBase();
  if (state.apiBase) {
    localStorage.setItem(API_BASE_KEY, state.apiBase);
  }

  if (!currentUsername()) {
    renderOrders([]);
    return;
  }

  let apiOrders = [];
  let localOrders = readLocalOrders();

  try {
    apiOrders = await fetchApiOrders();
  } catch (error) {
    // If backend is not available we still show local orders.
    console.error(errorMessage(error, "Error desconegut carregant comandes"));
  }

  const merged = [...apiOrders, ...localOrders]
    .map(normalizeOrder)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  state.orders = merged;
  renderOrders(state.orders);

  const createdId = highlightOrderId();
  if (createdId) {
    showStatus("success", `Comanda #${createdId} creada correctament.`);
  }
}

document.addEventListener("DOMContentLoaded", init);
