package com.tienda.servlets;

import com.tienda.productes.Article;
import com.tienda.productes.RepositoriArticles;

import javax.servlet.*;
import javax.servlet.http.*;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class ServletCarret extends HttpServlet {
    public static final String SESSION_CART_KEY = "session_cart";
    public static final String SESSION_CART_NEXT_ID_KEY = "session_cart_next_id";

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        CorsSupport.apply(req, resp);

        if ("/api/cart".equals(req.getServletPath())) {
            resp.setContentType("application/json;charset=UTF-8");
            resp.getWriter().write(buildCartJson(getSessionCart(req.getSession())));
            return;
        }

        resp.setContentType("text/html;charset=UTF-8");
        resp.getWriter().write("<h1>Gestio del carret</h1>");
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        CorsSupport.apply(req, resp);

        if (!"/api/cart".equals(req.getServletPath())) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        resp.setContentType("application/json;charset=UTF-8");

        int productId = parseIntParameter(req, "product_id", -1);
        int quantity = parseIntParameter(req, "quantity", 1);
        if (productId <= 0 || quantity <= 0) {
            resp.getWriter().write(errorJson("Parametres no valids."));
            return;
        }

        Article article = findArticleById(productId);
        if (article == null) {
            resp.getWriter().write(errorJson("Producte no trobat."));
            return;
        }

        HttpSession session = req.getSession();
        Map<Integer, CartItem> cart = getSessionCart(session);
        CartItem existing = findCartItemByProduct(cart, productId);

        int desiredQty = quantity + (existing != null ? existing.quantity : 0);
        if (desiredQty > article.getStock()) {
            resp.getWriter().write(errorJson("No hi ha prou estoc disponible."));
            return;
        }

        if (existing != null) {
            existing.quantity = desiredQty;
        } else {
            int nextId = getAndIncrementCartItemId(session);
            cart.put(nextId, new CartItem(nextId, article.getId(), article.getName(), article.getPrice(), quantity));
        }

        resp.getWriter().write(buildCartJson(cart));
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        CorsSupport.apply(req, resp);

        if (!"/api/cart".equals(req.getServletPath())) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        resp.setContentType("application/json;charset=UTF-8");

        int productId = parseIntParameter(req, "product_id", -1);
        int quantity = parseIntParameter(req, "quantity", -1);
        if (productId <= 0 || quantity <= 0) {
            resp.getWriter().write(errorJson("Parametres no valids."));
            return;
        }

        Article article = findArticleById(productId);
        if (article == null) {
            resp.getWriter().write(errorJson("Producte no trobat."));
            return;
        }

        if (quantity > article.getStock()) {
            resp.getWriter().write(errorJson("No hi ha prou estoc disponible."));
            return;
        }

        Map<Integer, CartItem> cart = getSessionCart(req.getSession());
        CartItem item = findCartItemByProduct(cart, productId);
        if (item == null) {
            resp.getWriter().write(errorJson("Item de carret no trobat."));
            return;
        }

        item.quantity = quantity;
        resp.getWriter().write(buildCartJson(cart));
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        CorsSupport.apply(req, resp);

        if (!"/api/cart".equals(req.getServletPath())) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        resp.setContentType("application/json;charset=UTF-8");

        Map<Integer, CartItem> cart = getSessionCart(req.getSession());
        String clear = req.getParameter("clear");
        if ("true".equalsIgnoreCase(clear)) {
            cart.clear();
            resp.getWriter().write(buildCartJson(cart));
            return;
        }

        int cartItemId = parseIntParameter(req, "cart_item_id", -1);
        if (cartItemId <= 0) {
            resp.getWriter().write(errorJson("Parametres no valids."));
            return;
        }

        cart.remove(cartItemId);
        resp.getWriter().write(buildCartJson(cart));
    }

    @SuppressWarnings("unchecked")
    private Map<Integer, CartItem> getSessionCart(HttpSession session) {
        Object existing = session.getAttribute(SESSION_CART_KEY);
        if (existing instanceof Map) {
            return (Map<Integer, CartItem>) existing;
        }

        Map<Integer, CartItem> cart = new LinkedHashMap<>();
        session.setAttribute(SESSION_CART_KEY, cart);
        return cart;
    }

    private int getAndIncrementCartItemId(HttpSession session) {
        Object next = session.getAttribute(SESSION_CART_NEXT_ID_KEY);
        int id = next instanceof Integer ? (Integer) next : 1;
        session.setAttribute(SESSION_CART_NEXT_ID_KEY, id + 1);
        return id;
    }

    private CartItem findCartItemByProduct(Map<Integer, CartItem> cart, int productId) {
        for (CartItem item : cart.values()) {
            if (item.productId == productId) {
                return item;
            }
        }
        return null;
    }

    private Article findArticleById(int productId) {
        List<Article> articles = RepositoriArticles.findAll();
        for (Article article : articles) {
            if (article.getId() == productId) {
                return article;
            }
        }
        return null;
    }

    private int parseIntParameter(HttpServletRequest req, String name, int fallback) {
        String raw = req.getParameter(name);
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private String buildCartJson(Map<Integer, CartItem> cart) {
        StringBuilder json = new StringBuilder("{\"status\":\"ok\",\"items\":[");
        boolean first = true;
        for (CartItem item : cart.values()) {
            if (!first) {
                json.append(',');
            }
            first = false;
            double itemTotal = item.price * item.quantity;
            json.append("{\"id\":").append(item.id)
                .append(",\"product_id\":").append(item.productId)
                .append(",\"name\":\"").append(escapeJson(item.name)).append("\"")
                .append(",\"price\":").append(String.format(Locale.US, "%.2f", item.price))
                .append(",\"quantity\":").append(item.quantity)
                .append(",\"item_total\":").append(String.format(Locale.US, "%.2f", itemTotal))
                .append('}');
        }
        json.append("]}");
        return json.toString();
    }

    private String errorJson(String message) {
        return "{\"status\":\"error\",\"message\":\"" + escapeJson(message) + "\"}";
    }

    private String escapeJson(String value) {
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
    }

    public static final class CartItem {
        private final int id;
        private final int productId;
        private final String name;
        private final double price;
        private int quantity;

        private CartItem(int id, int productId, String name, double price, int quantity) {
            this.id = id;
            this.productId = productId;
            this.name = name;
            this.price = price;
            this.quantity = quantity;
        }

        public int getId() {
            return id;
        }

        public int getProductId() {
            return productId;
        }

        public String getName() {
            return name;
        }

        public double getPrice() {
            return price;
        }

        public int getQuantity() {
            return quantity;
        }
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) {
        CorsSupport.apply(req, resp);
        resp.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }
}
