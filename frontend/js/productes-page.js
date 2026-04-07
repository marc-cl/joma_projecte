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
  el.className = `status-box ${kind}`;
  el.textContent = msg;
  el.style.display = "block";
}

function hideStatus(el) {
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
      // Keep searching for available backend candidate.
    }
  }
  return "";
}

async function fetchProducts() {
  if (!state.apiBase) {
    return { source: "mock", items: MOCK_PRODUCTS };
  }

  const response = await fetch(`${state.apiBase}/api/productes`);
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
  const data = await response.json();
  if (data.status !== "ok") return [];
  return (data.items || []).map((it) => ({
    ...it,
    item_total: Number(it.item_total || (it.price * it.quantity))
  }));
}

function toLocalImage(path) {
  return path.startsWith("img/") ? `../${path}` : path;
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

function syncCartBadge() {
  const badge = $("cartBadge");
  const { items } = cartTotals();
  if (items > 0) {
    badge.textContent = items;
    badge.style.display = "inline-block";
    return;
  }
  badge.style.display = "none";
}

function renderCart() {
  const cartStatus = $("cartStatus");
  const container = $("cartItems");
  const totalBox = $("cartTotal");
  const actions = $("cartActions");

  container.innerHTML = "";
  hideStatus(cartStatus);

  if (!state.cartItems.length) {
    showStatus(cartStatus, "empty", "El carret es buit.");
    totalBox.style.display = "none";
    actions.style.display = "none";
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

  const { total } = cartTotals();
  $("totalAmount").textContent = total.toFixed(2);
  $("checkoutTotalAmount").textContent = total.toFixed(2);
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

async function addToCart(productId, quantity) {
  const product = productById(productId);
  if (!product) return;

  if (quantity < 1 || quantity > product.stock) {
    toast("Quantitat no valida.", "error");
    return;
  }

  if (!state.apiBase) {
    state.useMockCart = true;
    const existing = state.cartItems.find((i) => Number(i.product_id) === Number(productId));
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
    toast("Producte afegit al carret.");
    return;
  }

  const payload = new URLSearchParams({ product_id: productId, quantity: String(quantity) });
  const response = await fetch(`${state.apiBase}/api/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    credentials: "include",
    body: payload
  });
  const data = await response.json();
  if (data.status !== "ok") throw new Error(data.message || "No s'ha pogut afegir al carret");
  state.cartItems = await fetchCart();
  syncCartBadge();
  renderCart();
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
    return;
  }

  const payload = new URLSearchParams({ product_id: String(productId), quantity: String(safeQty) });
  const response = await fetch(`${state.apiBase}/api/cart`, {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    credentials: "include",
    body: payload
  });
  const data = await response.json();
  if (data.status !== "ok") throw new Error(data.message || "No s'ha pogut actualitzar el carret");
  state.cartItems = await fetchCart();
  syncCartBadge();
  renderCart();
}

async function removeFromCart(cartId) {
  if (!state.apiBase || state.useMockCart) {
    state.cartItems = state.cartItems.filter((it) => Number(it.id) !== Number(cartId));
    syncCartBadge();
    renderCart();
    return;
  }

  const response = await fetch(`${state.apiBase}/api/cart?cart_item_id=${cartId}`, {
    method: "DELETE",
    credentials: "include"
  });
  const data = await response.json();
  if (data.status !== "ok") throw new Error(data.message || "No s'ha pogut eliminar del carret");
  state.cartItems = await fetchCart();
  syncCartBadge();
  renderCart();
}

function wireEvents() {
  $("openCartBtn").addEventListener("click", () => openModal($("cartModal")));
  $("closeCartBtn").addEventListener("click", () => closeModal($("cartModal")));
  $("closeCartActionBtn").addEventListener("click", () => closeModal($("cartModal")));

  $("openCheckoutBtn").addEventListener("click", () => {
    closeModal($("cartModal"));
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
}

async function init() {
  wireEvents();
  showStatus($("productsStatus"), "loading", "Carregant productes...");
  showStatus($("cartStatus"), "loading", "Carregant carret...");

  state.apiBase = await detectApiBase();
  if (!state.apiBase) {
    state.useMockCart = true;
  }

  try {
    const result = await fetchProducts();
    state.products = result.items || [];
    renderProducts();
  } catch (_) {
    state.products = MOCK_PRODUCTS;
    renderProducts();
    toast("API no disponible. Carregats productes mock.", "error");
  }

  try {
    state.cartItems = await fetchCart();
    renderCart();
    syncCartBadge();
  } catch (_) {
    showStatus($("cartStatus"), "error", "No s'ha pogut carregar el carret.");
  }
}

document.addEventListener("DOMContentLoaded", init);
