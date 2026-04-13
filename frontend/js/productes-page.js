/**
 * Productes i carret (frontend estàtic).
 * Els paràmetres admin_user / admin_password als requests de pagament fictici són només per a la demo del projecte;
 * en un entorn real el pagament i l’admin s’han de protegir al servidor.
 */
import { detectApiBase, API_BASE_KEY } from "./api-base.js";

const MOCK_PRODUCTS = [
  { id: 1, name: "Llibreta reciclada", description: "Llibreta A5 ecologica", material: "Paper reciclat", price: 8.5, stock: 25, image_url: "img/producte1.jpg" },
  { id: 2, name: "Boligraf de bambu", description: "Boligraf reutilitzable", material: "Bambu", price: 3.2, stock: 40, image_url: "img/producte2.jpg" },
  { id: 3, name: "Carpeta kraft", description: "Carpeta resistent", material: "Cartro", price: 5.9, stock: 18, image_url: "img/producte3.jpg" },
  { id: 4, name: "Agenda setmanal", description: "Agenda compacta", material: "Paper", price: 11.9, stock: 22, image_url: "img/producte4.jpg" }
];

const state = {
  products: [],
  cartItems: [],
  apiBase: "",
  useMockCart: false
};

const LOCAL_CART_KEY = "ponpaper_cart_local";
const LOCAL_ORDERS_KEY_PREFIX = "ponpaper_orders_local";

const $ = (id) => document.getElementById(id);

function getStockClass(stock) {
  if (stock === 0) return "out-of-stock";
  if (stock <= 5) return "low-stock";
  return "in-stock";
}

function stockText(stock) {
  if (stock === 0) return "Sense estoc";
  if (stock <= 5) return `Poques unitats (${stock})`;
  return `En estoc (${stock})`;
}

function showStatus(el, kind, msg) {
  if (!el) return;
  el.className = `status-box ${kind}`;
  el.textContent = msg;
  el.style.display = "block";
}

function hideStatus(el) {
  if (!el) return;
  el.style.display = "none";
}

function toast(message, kind = "success") {
  const node = document.createElement("div");
  node.className = `toast ${kind}`;
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => {
    node.remove();
  }, 2200);
}

async function fetchProducts() {
  if (!state.apiBase) {
    return { source: "mock", items: MOCK_PRODUCTS };
  }

  const response = await fetch(`${state.apiBase}/api/productes`, {
    method: "GET",
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error("Resposta no valida de productes");
  }
  const data = await response.json();
  if (data.status !== "ok") throw new Error(data.message || "No s'han pogut carregar productes");
  return { source: "api", items: data.productes };
}

async function fetchCart() {
  if (state.useMockCart || !state.apiBase) return state.cartItems;

  const response = await fetch(`${state.apiBase}/api/cart`, { credentials: "include" });
  if (!response.ok) throw new Error("Resposta no valida del carret");
  const data = await response.json();
  if (data.status !== "ok") return [];
  return normalizeCartItems(data.items);
}

function normalizeCartItems(items) {
  return (items || []).map((it) => ({
    ...it,
    price: Number(it.price),
    quantity: Number(it.quantity),
    item_total: Number(it.item_total || (Number(it.price) * Number(it.quantity)))
  }));
}

function setCartItems(items) {
  // Normalitza i unifica linies per producte.
  const byProductId = new Map();

  for (const item of normalizeCartItems(items)) {
    const key = Number(item.product_id);
    const existing = byProductId.get(key);
    if (existing) {
      existing.quantity += Number(item.quantity);
      existing.item_total = Number(existing.price) * Number(existing.quantity);
      continue;
    }

    byProductId.set(key, { ...item });
  }

  state.cartItems = Array.from(byProductId.values());
}

function mergeCartItems(baseItems, incomingItems) {
  const merged = new Map();

  for (const item of normalizeCartItems(baseItems)) {
    merged.set(Number(item.product_id), { ...item });
  }

  for (const item of normalizeCartItems(incomingItems)) {
    const key = Number(item.product_id);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...item });
      continue;
    }

    existing.quantity = Number(item.quantity);
    existing.price = Number(item.price);
    existing.item_total = Number(item.item_total || (existing.price * existing.quantity));
  }

  return Array.from(merged.values());
}

function shouldSwitchToLocalAfterAdd(previousItems, responseItems, addedProductId) {
  // Detecta quan la resposta API perd linies del carret.
  if (!previousItems.length) return false;

  const prevIds = new Set(previousItems.map((it) => Number(it.product_id)));
  const nextIds = new Set(normalizeCartItems(responseItems).map((it) => Number(it.product_id)));

  if (!nextIds.has(Number(addedProductId))) return true;
  for (const prevId of prevIds) {
    if (prevId !== Number(addedProductId) && !nextIds.has(prevId)) {
      return true;
    }
  }

  return false;
}

function toLocalImage(path) {
  return path.startsWith("img/") ? `../${path}` : path;
}

function readJsonFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

function loadLocalCart() {
  return readJsonFromStorage(LOCAL_CART_KEY, []).map((item) => ({
    ...item,
    price: Number(item.price),
    quantity: Number(item.quantity),
    item_total: Number(item.item_total || Number(item.price) * Number(item.quantity || 0))
  }));
}

function saveLocalCart() {
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(state.cartItems));
}

function currentUsername() {
  return String(localStorage.getItem("username") || "").trim();
}

function localOrdersKeyForUser(username) {
  return `${LOCAL_ORDERS_KEY_PREFIX}_${username}`;
}

function loadLocalOrders(username) {
  return readJsonFromStorage(localOrdersKeyForUser(username), []);
}

function saveLocalOrder(order) {
  const username = order.buyer_username || currentUsername();
  const existing = loadLocalOrders(username);
  existing.unshift(order);
  localStorage.setItem(localOrdersKeyForUser(username), JSON.stringify(existing));
}

function productCard(product) {
  return `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-image">
        <img src="${toLocalImage(product.image_url)}" alt="${product.name}">
      </div>
      <div class="product-info">
        <div class="product-name">${product.name}</div>
        <div class="product-description">${product.description}</div>
        <div class="product-material">Material: ${product.material}</div>
        <div class="product-price">€${Number(product.price).toFixed(2)}</div>
        <div class="product-stock ${getStockClass(product.stock)}">${stockText(product.stock)}</div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <input type="number" class="quantity-input" min="1" max="${product.stock}" value="1">
          <button type="button" class="add-to-cart" ${product.stock === 0 ? "disabled" : ""}>Afegeix al carret</button>
        </div>
      </div>
    </article>
  `;
}

function renderProducts() {
  const status = $("productsStatus");
  const container = $("productsContainer");
  container.innerHTML = "";

  if (!state.products.length) {
    showStatus(status, "empty", "No hi ha productes disponibles.");
    return;
  }

  hideStatus(status);
  container.innerHTML = state.products.map(productCard).join("");
}

function cartTotals() {
  const total = state.cartItems.reduce((sum, item) => sum + Number(item.item_total), 0);
  const items = state.cartItems.reduce((sum, item) => sum + Number(item.quantity), 0);
  return { total, items };
}

function taxTotals() {
  const subtotal = cartTotals().total;
  const vat = subtotal * 0.21;
  const total = subtotal + vat;
  return { subtotal, vat, total };
}

function syncCartBadge() {
  const badge = $("cartBadge");
  if (!badge) return;
  const { items } = cartTotals();
  if (items > 0) {
    badge.textContent = items;
    badge.style.display = "inline-block";
    return;
  }
  badge.style.display = "none";
}

function updateCheckoutAmounts(subtotal, vat, finalTotal) {
  const set = (id, value) => {
    const node = $(id);
    if (node) node.textContent = value;
  };
  set("totalAmount", finalTotal.toFixed(2));
  set("checkoutSubtotalAmount", subtotal.toFixed(2));
  set("checkoutVatAmount", vat.toFixed(2));
  set("checkoutTotalAmount", finalTotal.toFixed(2));
}

function renderCart() {
  const cartStatus = $("cartStatus");
  const container = $("cartItems");
  const totalBox = $("cartTotal");
  const actions = $("cartActions");

  if (!container || !totalBox || !actions) return;

  container.innerHTML = "";
  hideStatus(cartStatus);

  if (!state.cartItems.length) {
    showStatus(cartStatus, "empty", "El carret es buit.");
    totalBox.style.display = "none";
    actions.style.display = "none";
    updateCheckoutAmounts(0, 0, 0);
    return;
  }

  container.innerHTML = state.cartItems.map((item) => `
    <div class="cart-item" data-cart-id="${item.id}" data-product-id="${item.product_id}">
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">€${Number(item.price).toFixed(2)} c/u</div>
      </div>
      <div class="cart-item-quantity-wrap">
        <button type="button" class="quantity-btn" data-role="minus">-</button>
        <span>${item.quantity}</span>
        <button type="button" class="quantity-btn" data-role="plus">+</button>
      </div>
      <div>€${Number(item.item_total).toFixed(2)}</div>
      <button type="button" class="remove-item" data-role="remove">Elimina</button>
    </div>
  `).join("");

  const { subtotal, vat, total: finalTotal } = taxTotals();
  updateCheckoutAmounts(subtotal, vat, finalTotal);
  totalBox.style.display = "block";
  actions.style.display = "flex";
}

function openModal(node) {
  node.style.display = "flex";
  node.setAttribute("aria-hidden", "false");
}

function closeModal(node) {
  node.style.display = "none";
  node.setAttribute("aria-hidden", "true");
}

function productById(id) {
  return state.products.find((p) => Number(p.id) === Number(id));
}

function addToCartLocal(product, quantity) {
  // Fallback local quan el backend falla.
  const existing = state.cartItems.find((i) => Number(i.product_id) === Number(product.id));
  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, product.stock);
    existing.item_total = existing.quantity * existing.price;
  } else {
    state.cartItems.push({
      id: Date.now(),
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity,
      item_total: Number(product.price) * quantity
    });
  }

  syncCartBadge();
  renderCart();
  saveLocalCart();
}

function switchToLocalCartMode() {
  state.useMockCart = true;
  if (!state.cartItems.length) {
    state.cartItems = loadLocalCart();
  }
}

async function addToCart(productId, quantity) {
  const product = productById(productId);
  if (!product) return;

  if (quantity < 1 || quantity > product.stock) {
    toast("Quantitat no valida.", "error");
    return;
  }

  if (!state.apiBase) {
    switchToLocalCartMode();
    addToCartLocal(product, quantity);
    toast("Producte afegit al carret.");
    return;
  }

  try {
    const previousItems = [...state.cartItems];
    const payload = new URLSearchParams({ product_id: productId, quantity: String(quantity) });
    const response = await fetch(`${state.apiBase}/api/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      credentials: "include",
      body: payload
    });

    if (!response.ok) {
      throw new Error("No s'ha pogut afegir al carret");
    }

    const data = await response.json();
    if (data.status !== "ok") throw new Error(data.message || "No s'ha pogut afegir al carret");

    if (shouldSwitchToLocalAfterAdd(previousItems, data.items, productId)) {
      switchToLocalCartMode();
      setCartItems(mergeCartItems(previousItems, data.items));
      saveLocalCart();
    } else {
      setCartItems(data.items);
    }

    syncCartBadge();
    renderCart();
    toast("Producte afegit al carret.", "success");
  } catch (_) {
    switchToLocalCartMode();
    addToCartLocal(product, quantity);
    toast("Carret API no disponible. Producte afegit en mode local.", "error");
  }
}

async function updateCart(productId, qty) {
  const product = productById(productId);
  const safeQty = Math.max(1, Math.min(qty, product ? product.stock : qty));

  if (!state.apiBase || state.useMockCart) {
    const item = state.cartItems.find((i) => Number(i.product_id) === Number(productId));
    if (!item) return;
    item.quantity = safeQty;
    item.item_total = item.price * item.quantity;
    syncCartBadge();
    renderCart();
    saveLocalCart();
    return;
  }

  try {
    const payload = new URLSearchParams({ product_id: String(productId), quantity: String(safeQty) });
    const response = await fetch(`${state.apiBase}/api/cart`, {
      method: "PUT",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      credentials: "include",
      body: payload
    });
    if (!response.ok) throw new Error("No s'ha pogut actualitzar el carret");
    const data = await response.json();
    if (data.status !== "ok") throw new Error(data.message || "No s'ha pogut actualitzar el carret");
    setCartItems(data.items);
    syncCartBadge();
    renderCart();
  } catch (_) {
    // Manté operatiu el carret encara que la sessio backend falli en calent.
    switchToLocalCartMode();
    const item = state.cartItems.find((i) => Number(i.product_id) === Number(productId));
    if (!item) return;
    item.quantity = safeQty;
    item.item_total = item.price * item.quantity;
    syncCartBadge();
    renderCart();
    saveLocalCart();
    toast("Carret API no disponible. Actualitzat en mode local.", "info");
  }
}

async function removeFromCart(cartId) {
  if (!state.apiBase || state.useMockCart) {
    state.cartItems = state.cartItems.filter((it) => Number(it.id) !== Number(cartId));
    syncCartBadge();
    renderCart();
    saveLocalCart();
    return;
  }

  try {
    const response = await fetch(`${state.apiBase}/api/cart?cart_item_id=${cartId}`, {
      method: "DELETE",
      credentials: "include"
    });
    if (!response.ok) throw new Error("No s'ha pogut eliminar del carret");
    const data = await response.json();
    if (data.status !== "ok") throw new Error(data.message || "No s'ha pogut eliminar del carret");
    setCartItems(data.items);
    syncCartBadge();
    renderCart();
  } catch (_) {
    switchToLocalCartMode();
    state.cartItems = state.cartItems.filter((it) => Number(it.id) !== Number(cartId));
    syncCartBadge();
    renderCart();
    saveLocalCart();
    toast("Carret API no disponible. Eliminat en mode local.", "info");
  }
}

async function clearCartAfterCheckout() {
  if (!state.apiBase || state.useMockCart) {
    state.cartItems = [];
    saveLocalCart();
    syncCartBadge();
    renderCart();
    return;
  }

  try {
    const response = await fetch(`${state.apiBase}/api/cart?clear=true`, {
      method: "DELETE",
      credentials: "include"
    });
    if (!response.ok) throw new Error("No s'ha pogut buidar el carret");
    const data = await response.json();
    if (data.status !== "ok") throw new Error(data.message || "No s'ha pogut buidar el carret");
    setCartItems(data.items);
    syncCartBadge();
    renderCart();
  } catch (_) {
    switchToLocalCartMode();
    state.cartItems = [];
    saveLocalCart();
    syncCartBadge();
    renderCart();
  }
}

async function syncLocalCartToBackend() {
  if (!state.apiBase || !state.cartItems.length) {
    return;
  }

  // Sincronitza carret local abans de crear comanda al backend.
  const clearResponse = await fetch(`${state.apiBase}/api/cart?clear=true`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!clearResponse.ok) {
    throw new Error("No s'ha pogut preparar el carret al backend");
  }

  const clearData = await clearResponse.json();
  if (clearData.status !== "ok") {
    throw new Error(clearData.message || "No s'ha pogut preparar el carret al backend");
  }

  for (const item of state.cartItems) {
    const payload = new URLSearchParams({
      product_id: String(item.product_id),
      quantity: String(item.quantity)
    });

    const addResponse = await fetch(`${state.apiBase}/api/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      credentials: "include",
      body: payload
    });

    if (!addResponse.ok) {
      throw new Error("No s'ha pogut sincronitzar el carret amb el backend");
    }

    const addData = await addResponse.json();
    if (addData.status !== "ok") {
      throw new Error(addData.message || "No s'ha pogut sincronitzar el carret amb el backend");
    }
  }
}

function buildLocalOrder(formData) {
  const { subtotal, vat, total } = taxTotals();
  const { items } = cartTotals();
  const orderId = Date.now();
  const username = currentUsername();
  return {
    id: orderId,
    created_at: new Date().toISOString(),
    status: "pendent",
    customer_name: formData.customer_name,
    email: formData.email,
    phone: formData.phone,
    address: formData.address,
    city: formData.city,
    postal_code: formData.postal_code,
    payment_method: formData.payment_method || "targeta",
    payment_status: "pagat",
    payment_reference: `LOCAL-PAY-${orderId}`,
    notes: formData.notes || "",
    buyer_username: username,
    total_items: items,
    subtotal_amount: Number(subtotal.toFixed(2)),
    vat_amount: Number(vat.toFixed(2)),
    total_amount: Number(total.toFixed(2)),
    items: state.cartItems.map((item) => ({
      product_id: Number(item.product_id),
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
      line_total: Number(item.item_total)
    }))
  };
}

async function processFakePayment(apiBase, orderId, paymentMethod) {
  // Demo: el backend accepta credencials d’admin per marcar el pagament; només per a l’entorn de pràctiques.
  const payload = new URLSearchParams({
    order_id: String(orderId),
    payment_method: String(paymentMethod || "targeta"),
    payment_action: "fake_payment",
    admin_user: "admin",
    admin_password: "1234"
  });

  // Try dedicated endpoint first.
  let response = await fetch(`${apiBase}/api/payments/fake`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    credentials: "include",
    body: payload
  });

  // Fallback to existing orders endpoint if mapping is not available.
  if (response.status === 404 || response.status === 405) {
    response = await fetch(`${apiBase}/api/comandes`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      credentials: "include",
      body: payload
    });
  }

  if (!response.ok) {
    throw new Error("No s'ha pogut processar el pagament fictici");
  }

  const data = await response.json();
  if (data.status !== "ok") {
    throw new Error(data.message || "No s'ha pogut processar el pagament fictici");
  }
}

async function loginAdminForStockUpdate(apiBase) {
  // Demo: credencials fixtes només per a l’entorn de pràctiques (ajust d’estoc després de comanda).
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    credentials: "include",
    body: new URLSearchParams({ username: "admin", password: "1234" })
  });
  if (!response.ok) {
    throw new Error("No s'ha pogut validar sessio admin per ajustar estoc");
  }
}

async function applyStockFallbackAfterOrder(apiBase, orderedItems) {
  if (!apiBase || !orderedItems.length) {
    return;
  }

  await loginAdminForStockUpdate(apiBase);

  const response = await fetch(`${apiBase}/api/productes`, {
    method: "GET",
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error("No s'ha pogut carregar productes per ajustar estoc");
  }

  const data = await response.json();
  if (data.status !== "ok" || !Array.isArray(data.productes)) {
    throw new Error("No s'ha pogut carregar productes per ajustar estoc");
  }

  const quantitiesByProduct = new Map();
  for (const item of orderedItems) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity || 0);
    if (productId <= 0 || quantity <= 0) continue;
    quantitiesByProduct.set(productId, (quantitiesByProduct.get(productId) || 0) + quantity);
  }

  const byId = new Map(data.productes.map((p) => [Number(p.id), p]));
  for (const [productId, quantity] of quantitiesByProduct.entries()) {
    const product = byId.get(productId);
    if (!product) continue;

    const currentStock = Number(product.stock || 0);
    const newStock = Math.max(0, currentStock - quantity);
    const updateResponse = await fetch(`${apiBase}/api/productes/stock`, {
      method: "PUT",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      credentials: "include",
      body: new URLSearchParams({
        product_id: String(productId),
        stock: String(newStock)
      })
    });

    if (!updateResponse.ok) {
      throw new Error("No s'ha pogut aplicar la reduccio d'estoc posterior a la compra");
    }
  }
}

function formToPayload(form) {
  const data = new FormData(form);
  const username = currentUsername();
  return {
    customer_name: String(data.get("customer_name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    address: String(data.get("address") || "").trim(),
    city: String(data.get("city") || "").trim(),
    postal_code: String(data.get("postal_code") || "").trim(),
    payment_method: String(data.get("payment_method") || "targeta").trim(),
    notes: String(data.get("notes") || "").trim(),
    buyer_username: username
  };
}

function hasRequiredCheckoutFields(payload) {
  return payload.customer_name && payload.email && payload.phone && payload.address && payload.city && payload.postal_code;
}

function redirectToOrders(orderId) {
  const url = `comandes.html?created=${encodeURIComponent(orderId)}`;
  window.location.href = url;
}

async function submitCheckout(event) {
  // Flux principal de checkout.
  event.preventDefault();

  const statusEl = $("checkoutStatus");
  hideStatus(statusEl);

  const username = currentUsername();
  if (!username) {
    showStatus(statusEl, "error", "Has d'iniciar sessio per fer una comanda.");
    setTimeout(() => {
      window.location.href = "login.html?returnTo=productes.html";
    }, 900);
    return;
  }

  if (!state.cartItems.length) {
    showStatus(statusEl, "error", "El carret esta buit.");
    return;
  }

  const form = $("checkoutForm");
  const payload = formToPayload(form);

  if (!hasRequiredCheckoutFields(payload)) {
    showStatus(statusEl, "error", "Revisa els camps obligatoris del formulari.");
    return;
  }

  const submitBtn = $("placeOrderBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Preparant...";
  }

  let orderId;
  let backendOrderCreated = false;

  try {
    if (state.apiBase) {
      const orderedItems = state.cartItems.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity)
      }));

      if (state.useMockCart) {
        showStatus(statusEl, "loading", "Sincronitzant el carret amb el servidor...");
        if (submitBtn) submitBtn.textContent = "Sincronitzant carret...";
        await syncLocalCartToBackend();
      }

      if (submitBtn) submitBtn.textContent = "Creant comanda...";
      showStatus(statusEl, "loading", "Creant la comanda al servidor...");

      const response = await fetch(`${state.apiBase}/api/comandes`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        credentials: "include",
        body: new URLSearchParams(payload)
      });

      if (!response.ok) {
        throw new Error("No s'ha pogut crear la comanda al backend");
      }

      const data = await response.json();
      if (data.status !== "ok") {
        throw new Error(data.message || "No s'ha pogut crear la comanda");
      }

      orderId = data.order_id;
      backendOrderCreated = true;

      // Compatibility fallback: old backends may create orders without decrementing stock.
      if (!data.stock_updated) {
        showStatus(statusEl, "loading", "Actualitzant estoc...");
        await applyStockFallbackAfterOrder(state.apiBase, orderedItems);
      }

      if (submitBtn) submitBtn.textContent = "Confirmant pagament (demo)...";
      showStatus(statusEl, "loading", "Confirmant el pagament de demostració...");
      await processFakePayment(state.apiBase, orderId, payload.payment_method);
      state.useMockCart = false;
      await clearCartAfterCheckout();
    } else {
      const localOrder = buildLocalOrder(payload);
      saveLocalOrder(localOrder);
      orderId = localOrder.id;
      await clearCartAfterCheckout();
    }

    showStatus(statusEl, "loading", "Comanda registrada. Redirigint...");
    setTimeout(() => redirectToOrders(orderId), 700);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    if (String(errMsg).includes("pagament fictici") && orderId) {
      showStatus(statusEl, "error", "La comanda s'ha creat, pero no s'ha pogut confirmar el pagament.");
      setTimeout(() => redirectToOrders(orderId), 1200);
      return;
    }

    if (backendOrderCreated) {
      showStatus(statusEl, "error", "La comanda s'ha creat al backend, pero no s'ha pogut completar el procés.");
      setTimeout(() => redirectToOrders(orderId), 1200);
      return;
    }

    const networkLikely =
      /failed to fetch|network|aborted|load failed|fetch/i.test(errMsg) || errMsg === "";

    showStatus(
      statusEl,
      "error",
      networkLikely
        ? `Error de connexió: ${errMsg || "No s'ha pogut contactar el servidor."}`
        : errMsg || "No s'ha pogut completar la comanda."
    );
    console.error(error);

    if (networkLikely) {
      const localOrder = buildLocalOrder(payload);
      saveLocalOrder(localOrder);
      await clearCartAfterCheckout();
      showStatus(
        statusEl,
        "loading",
        "Comanda guardada en mode local (sense connexió fiable al servidor). Redirigint..."
      );
      setTimeout(() => redirectToOrders(localOrder.id), 1100);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirmar comanda";
    }
  }
}

function wireEvents() {
  $("openCartBtn").addEventListener("click", () => openModal($("cartModal")));
  $("closeCartBtn").addEventListener("click", () => closeModal($("cartModal")));
  $("closeCartActionBtn").addEventListener("click", () => closeModal($("cartModal")));

  $("openCheckoutBtn").addEventListener("click", () => {
    closeModal($("cartModal"));
    hideStatus($("checkoutStatus"));
    renderCart();
    openModal($("checkoutModal"));
  });
  $("closeCheckoutBtn").addEventListener("click", () => closeModal($("checkoutModal")));
  $("closeCheckoutActionBtn").addEventListener("click", () => closeModal($("checkoutModal")));

  $("productsContainer").addEventListener("click", async (event) => {
    const button = event.target.closest(".add-to-cart");
    if (!button) return;
    const card = event.target.closest(".product-card");
    const input = card.querySelector(".quantity-input");
    const productId = Number(card.dataset.productId);
    const quantity = Number(input.value || 1);
    try {
      await addToCart(productId, quantity);
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("cartItems").addEventListener("click", async (event) => {
    const row = event.target.closest(".cart-item");
    if (!row) return;

    const productId = Number(row.dataset.productId);
    const cartId = Number(row.dataset.cartId);
    const item = state.cartItems.find((it) => Number(it.id) === cartId);
    if (!item) return;

    try {
      const role = event.target.dataset.role;
      if (role === "minus") await updateCart(productId, item.quantity - 1);
      if (role === "plus") await updateCart(productId, item.quantity + 1);
      if (role === "remove") await removeFromCart(cartId);
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("checkoutForm").addEventListener("submit", submitCheckout);
}

async function init() {
  wireEvents();
  showStatus($("productsStatus"), "loading", "Detectant servidor i carregant productes...");
  showStatus($("cartStatus"), "loading", "Carregant carret...");

  state.apiBase = await detectApiBase();
  if (state.apiBase) {
    localStorage.setItem(API_BASE_KEY, state.apiBase);
  }
  if (!state.apiBase) {
    switchToLocalCartMode();
  }

  try {
    const result = await fetchProducts();
    state.products = result.items || [];
    renderProducts();
    if (result.source === "mock") {
      showStatus(
        $("productsStatus"),
        "empty",
        "Mode demostració: sense connexió al backend es mostren productes de prova i el carret es local. " +
          "Arrenca Jetty (WAR), serveix el frontend per http (no file://) o defineix window.__PONPAPER_API_BASE__ a config.js."
      );
    }
  } catch (_) {
    state.products = MOCK_PRODUCTS;
    renderProducts();
    showStatus(
      $("productsStatus"),
      "empty",
      "Error carregant productes de l’API. Es mostren 4 productes de demostració."
    );
  }

  try {
    if (!state.useMockCart) {
      setCartItems(await fetchCart());
    }
    renderCart();
    syncCartBadge();
  } catch (_) {
    state.useMockCart = true;
    state.cartItems = loadLocalCart();
    renderCart();
    syncCartBadge();
    if (state.apiBase) {
      toast("Carret API no disponible. Activat mode local.", "info");
    }
  }
}

document.addEventListener("DOMContentLoaded", init);
