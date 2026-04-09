package com.tienda.servlets;

import com.tienda.productes.RepositoriArticles;
import com.tienda.security.SecurityUtils;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

public class ServletComanda extends HttpServlet {
    private static final String ADMIN_USER = "admin";
    private static final String ADMIN_PASSWORD = "1234";
    private static final double VAT_RATE = 0.21;
    private static final Path DATA_DIR = Paths.get(System.getProperty("user.home"), ".ponpaper-connect");
    private static final Path ORDERS_FILE = DATA_DIR.resolve("orders.bin");
    private static final List<Order> ORDERS = Collections.synchronizedList(loadOrdersFromDisk());
    private static final AtomicInteger ORDER_SEQUENCE = new AtomicInteger(nextOrderId(ORDERS));
    private static final Set<String> VALID_STATUSES = new HashSet<>();

    static {
        VALID_STATUSES.add("pendent");
        VALID_STATUSES.add("preparant");
        VALID_STATUSES.add("enviada");
        VALID_STATUSES.add("entregada");
        VALID_STATUSES.add("cancelada");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        CorsSupport.apply(req, resp);

        if ("/api/comandes".equals(req.getServletPath())) {
            String scope = safe(req.getParameter("scope")).toLowerCase(Locale.ROOT);
            String username = safe(req.getParameter("username"));

            if ("all".equals(scope)) {
                if (!isAdminRequest(req)) {
                    resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    resp.setContentType("application/json;charset=UTF-8");
                    resp.getWriter().write(errorJson("No autoritzat per consultar totes les comandes."));
                    return;
                }

                resp.setContentType("application/json;charset=UTF-8");
                resp.getWriter().write(buildOrdersJson(ORDERS));
                return;
            }

            if (username.isEmpty()) {
                resp.setContentType("application/json;charset=UTF-8");
                resp.getWriter().write("{\"status\":\"ok\",\"orders\":[]}");
                return;
            }

            resp.setContentType("application/json;charset=UTF-8");
            resp.getWriter().write(buildOrdersJson(filterOrdersByBuyer(username)));
            return;
        }

        resp.setContentType("text/html;charset=UTF-8");
        resp.getWriter().write("<h1>Gestio de comandes</h1>");
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        CorsSupport.apply(req, resp);

        if ("/api/payments/fake".equals(req.getServletPath())) {
            handleFakePayment(req, resp, false);
            return;
        }

        if (!"/api/comandes".equals(req.getServletPath())) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        if ("fake_payment".equalsIgnoreCase(safe(req.getParameter("payment_action")))) {
            handleFakePayment(req, resp, true);
            return;
        }

        resp.setContentType("application/json;charset=UTF-8");

        String customerName = safe(req.getParameter("customer_name"));
        String email = safe(req.getParameter("email"));
        String phone = safe(req.getParameter("phone"));
        String address = safe(req.getParameter("address"));
        String city = safe(req.getParameter("city"));
        String postalCode = safe(req.getParameter("postal_code"));
        String paymentMethod = safe(req.getParameter("payment_method"));
        String notes = safe(req.getParameter("notes"));
        String buyerUsername = safe(req.getParameter("buyer_username"));

        if (customerName.isEmpty() || email.isEmpty() || phone.isEmpty() || address.isEmpty() || city.isEmpty() || postalCode.isEmpty()) {
            resp.getWriter().write(errorJson("Falten camps obligatoris del checkout."));
            return;
        }

        HttpSession session = req.getSession();
        Map<Integer, ServletCarret.CartItem> sessionCart = getSessionCart(session);
        if (sessionCart.isEmpty()) {
            resp.getWriter().write(errorJson("El carret esta buit."));
            return;
        }

        List<OrderItem> items = new ArrayList<>();
        int totalItems = 0;
        double subtotalAmount = 0;
        Map<Integer, Integer> requestedStockByProduct = new HashMap<>();

        for (ServletCarret.CartItem item : sessionCart.values()) {
            double lineTotal = item.getPrice() * item.getQuantity();
            items.add(new OrderItem(item.getProductId(), item.getName(), item.getPrice(), item.getQuantity(), lineTotal));
            totalItems += item.getQuantity();
            subtotalAmount += lineTotal;
            requestedStockByProduct.merge(item.getProductId(), item.getQuantity(), Integer::sum);
        }

        double vatAmount = subtotalAmount * VAT_RATE;
        double totalAmount = subtotalAmount + vatAmount;

        boolean stockReserved = RepositoriArticles.reserveStock(requestedStockByProduct);
        if (!stockReserved) {
            resp.getWriter().write(errorJson("No hi ha prou estoc disponible per completar la comanda."));
            return;
        }

        int orderId = ORDER_SEQUENCE.getAndIncrement();
        Order order = new Order(
            orderId,
            Instant.now().toString(),
            "pendent",
            "pendent",
            "",
            customerName,
            email,
            phone,
            address,
            city,
            postalCode,
            paymentMethod.isEmpty() ? "targeta" : paymentMethod,
            notes,
            buyerUsername,
            totalItems,
            subtotalAmount,
            vatAmount,
            totalAmount,
            items
        );

        ORDERS.add(order);
        saveOrdersToDisk();
        sessionCart.clear();

        resp.getWriter().write("{\"status\":\"ok\",\"message\":\"Comanda creada correctament.\",\"order_id\":" + orderId + ",\"stock_updated\":true}");
    }

    private void handleFakePayment(HttpServletRequest req, HttpServletResponse resp, boolean requireAdmin) throws IOException {
        resp.setContentType("application/json;charset=UTF-8");

        if (requireAdmin && !isAdminRequest(req)) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write(errorJson("No autoritzat per registrar pagament."));
            return;
        }

        int orderId = parseIntParameter(req, "order_id", -1);
        String paymentMethod = safe(req.getParameter("payment_method"));
        if (orderId <= 0) {
            resp.getWriter().write(errorJson("Comanda no valida per processar pagament."));
            return;
        }

        String transactionId = "PAY-" + orderId + "-" + System.currentTimeMillis();
        Order paid = markOrderPaid(orderId, transactionId);
        if (paid == null) {
            resp.getWriter().write(errorJson("Comanda no trobada per registrar el pagament."));
            return;
        }

        String method = paymentMethod.isEmpty() ? paid.paymentMethod : paymentMethod;
        StringBuilder json = new StringBuilder("{\"status\":\"ok\",\"message\":\"Pagament fictici completat.\"");
        json.append(",\"order_id\":").append(paid.id)
            .append(",\"payment_status\":\"pagat\"")
            .append(",\"payment_method\":\"").append(escapeJson(method)).append("\"")
            .append(",\"transaction_id\":\"").append(escapeJson(transactionId)).append("\"}");
        resp.getWriter().write(json.toString());
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        CorsSupport.apply(req, resp);

        if (!"/api/comandes".equals(req.getServletPath())) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        resp.setContentType("application/json;charset=UTF-8");

        if (!isAdminRequest(req)) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write(errorJson("No autoritzat. Credencials d'administrador invalides."));
            return;
        }

        int orderId = parseIntParameter(req, "order_id", -1);
        String status = safe(req.getParameter("status")).toLowerCase(Locale.ROOT);

        if (orderId <= 0 || !VALID_STATUSES.contains(status)) {
            resp.getWriter().write(errorJson("Parametres no valids per actualitzar l'estat."));
            return;
        }

        Order updated = updateOrderStatus(orderId, status);
        if (updated == null) {
            resp.getWriter().write(errorJson("Comanda no trobada."));
            return;
        }

        resp.getWriter().write("{\"status\":\"ok\",\"message\":\"Estat actualitzat.\",\"order_id\":" + updated.id + ",\"new_status\":\"" + escapeJson(updated.status) + "\"}");
    }

    @SuppressWarnings("unchecked")
    private Map<Integer, ServletCarret.CartItem> getSessionCart(HttpSession session) {
        Object cart = session.getAttribute(ServletCarret.SESSION_CART_KEY);
        if (cart instanceof Map) {
            return (Map<Integer, ServletCarret.CartItem>) cart;
        }

        Map<Integer, ServletCarret.CartItem> empty = new LinkedHashMap<>();
        session.setAttribute(ServletCarret.SESSION_CART_KEY, empty);
        return empty;
    }

    private String buildOrdersJson(List<Order> orders) {
        StringBuilder json = new StringBuilder("{\"status\":\"ok\",\"orders\":[");

        for (int i = 0; i < orders.size(); i++) {
            if (i > 0) {
                json.append(',');
            }
            json.append(orderToJson(orders.get(i)));
        }

        json.append("]}");
        return json.toString();
    }

    private List<Order> filterOrdersByBuyer(String username) {
        List<Order> filtered = new ArrayList<>();
        synchronized (ORDERS) {
            for (Order order : ORDERS) {
                if (username.equalsIgnoreCase(order.buyerUsername)) {
                    filtered.add(order);
                }
            }
        }
        return filtered;
    }

    private Order updateOrderStatus(int orderId, String status) {
        synchronized (ORDERS) {
            for (Order order : ORDERS) {
                if (order.id == orderId) {
                    order.status = status;
                    saveOrdersToDisk();
                    return order;
                }
            }
        }
        return null;
    }

    private Order markOrderPaid(int orderId, String paymentReference) {
        synchronized (ORDERS) {
            for (Order order : ORDERS) {
                if (order.id == orderId) {
                    order.paymentStatus = "pagat";
                    order.paymentReference = paymentReference;
                    saveOrdersToDisk();
                    return order;
                }
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

    private String orderToJson(Order order) {
        StringBuilder json = new StringBuilder("{");
        json.append("\"id\":").append(order.id)
            .append(",\"created_at\":\"").append(escapeJson(order.createdAt)).append("\"")
            .append(",\"status\":\"").append(escapeJson(order.status)).append("\"")
            .append(",\"payment_status\":\"").append(escapeJson(order.paymentStatus == null || order.paymentStatus.isBlank() ? "pendent" : order.paymentStatus)).append("\"")
            .append(",\"payment_reference\":\"").append(escapeJson(order.paymentReference == null ? "" : order.paymentReference)).append("\"")
            .append(",\"customer_name\":\"").append(escapeJson(order.customerName)).append("\"")
            .append(",\"email\":\"").append(escapeJson(order.email)).append("\"")
            .append(",\"phone\":\"").append(escapeJson(order.phone)).append("\"")
            .append(",\"address\":\"").append(escapeJson(order.address)).append("\"")
            .append(",\"city\":\"").append(escapeJson(order.city)).append("\"")
            .append(",\"postal_code\":\"").append(escapeJson(order.postalCode)).append("\"")
            .append(",\"payment_method\":\"").append(escapeJson(order.paymentMethod)).append("\"")
            .append(",\"notes\":\"").append(escapeJson(order.notes)).append("\"")
            .append(",\"buyer_username\":\"").append(escapeJson(order.buyerUsername)).append("\"")
            .append(",\"total_items\":").append(order.totalItems)
            .append(",\"subtotal_amount\":").append(String.format(Locale.US, "%.2f", order.subtotalAmount))
            .append(",\"vat_amount\":").append(String.format(Locale.US, "%.2f", order.vatAmount))
            .append(",\"total_amount\":").append(String.format(Locale.US, "%.2f", order.totalAmount))
            .append(",\"items\":[");

        for (int i = 0; i < order.items.size(); i++) {
            if (i > 0) {
                json.append(',');
            }
            OrderItem item = order.items.get(i);
            json.append("{\"product_id\":").append(item.productId)
                .append(",\"name\":\"").append(escapeJson(item.name)).append("\"")
                .append(",\"price\":").append(String.format(Locale.US, "%.2f", item.price))
                .append(",\"quantity\":").append(item.quantity)
                .append(",\"line_total\":").append(String.format(Locale.US, "%.2f", item.lineTotal))
                .append('}');
        }

        json.append("]}");
        return json.toString();
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
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

    private boolean isAdminRequest(HttpServletRequest req) {
        HttpSession session = req.getSession(false);
        if (session != null && Boolean.TRUE.equals(session.getAttribute(ServletAuth.ADMIN_SESSION_KEY))) {
            return true;
        }

        String paramUser = safe(req.getParameter("admin_user"));
        String paramPassword = safe(req.getParameter("admin_password"));
        if (ADMIN_USER.equals(paramUser) && ADMIN_PASSWORD.equals(paramPassword)) {
            return true;
        }

        String user = req.getHeader("X-Admin-User");
        String password = req.getHeader("X-Admin-Password");
        return ADMIN_USER.equals(user) && ADMIN_PASSWORD.equals(password);
    }

    private static List<Order> loadOrdersFromDisk() {
        try {
            Files.createDirectories(DATA_DIR);
            if (!Files.exists(ORDERS_FILE)) {
                return new ArrayList<>();
            }

            byte[] fileBytes = Files.readAllBytes(ORDERS_FILE);
            try {
                byte[] decrypted = SecurityUtils.decryptBytes(fileBytes);
                Object raw = SecurityUtils.deserializeObject(decrypted);
                if (raw instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Order> loaded = (List<Order>) raw;
                    return new ArrayList<>(loaded);
                }
            } catch (GeneralSecurityException ex) {
                // Legacy fallback: plain serialized data from old versions.
                Object raw = SecurityUtils.deserializeObject(fileBytes);
                if (raw instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Order> loaded = (List<Order>) raw;
                    List<Order> migrated = new ArrayList<>(loaded);
                    try {
                        byte[] serialized = SecurityUtils.serializeObject(new ArrayList<>(migrated));
                        byte[] encrypted = SecurityUtils.encryptBytes(serialized);
                        Files.write(ORDERS_FILE, encrypted);
                    } catch (IOException | GeneralSecurityException ignored) {
                        // Return migrated data even if migration write fails.
                    }
                    return migrated;
                }
            }
        } catch (IOException | ClassNotFoundException ignored) {
            // Fallback to empty in-memory list when persisted data cannot be read.
        }
        return new ArrayList<>();
    }

    private static int nextOrderId(List<Order> orders) {
        int max = 1000;
        for (Order order : orders) {
            if (order.id > max) {
                max = order.id;
            }
        }
        return max + 1;
    }

    private static void saveOrdersToDisk() {
        try {
            Files.createDirectories(DATA_DIR);
            synchronized (ORDERS) {
                byte[] serialized = SecurityUtils.serializeObject(new ArrayList<>(ORDERS));
                byte[] encrypted = SecurityUtils.encryptBytes(serialized);
                Files.write(ORDERS_FILE, encrypted);
            }
        } catch (IOException ignored) {
            // Keep API functional even if persistence write fails.
        } catch (GeneralSecurityException ignored) {
            // Keep API functional even if encryption layer fails.
        }
    }

    private static final class Order implements Serializable {
        private static final long serialVersionUID = 1L;

        private final int id;
        private final String createdAt;
        private String status;
        private String paymentStatus;
        private String paymentReference;
        private final String customerName;
        private final String email;
        private final String phone;
        private final String address;
        private final String city;
        private final String postalCode;
        private final String paymentMethod;
        private final String notes;
        private final String buyerUsername;
        private final int totalItems;
        private final double subtotalAmount;
        private final double vatAmount;
        private final double totalAmount;
        private final List<OrderItem> items;

        private Order(
            int id,
            String createdAt,
            String status,
            String paymentStatus,
            String paymentReference,
            String customerName,
            String email,
            String phone,
            String address,
            String city,
            String postalCode,
            String paymentMethod,
            String notes,
            String buyerUsername,
            int totalItems,
            double subtotalAmount,
            double vatAmount,
            double totalAmount,
            List<OrderItem> items
        ) {
            this.id = id;
            this.createdAt = createdAt;
            this.status = status;
            this.paymentStatus = paymentStatus;
            this.paymentReference = paymentReference;
            this.customerName = customerName;
            this.email = email;
            this.phone = phone;
            this.address = address;
            this.city = city;
            this.postalCode = postalCode;
            this.paymentMethod = paymentMethod;
            this.notes = notes;
            this.buyerUsername = buyerUsername;
            this.totalItems = totalItems;
            this.subtotalAmount = subtotalAmount;
            this.vatAmount = vatAmount;
            this.totalAmount = totalAmount;
            this.items = items;
        }
    }

    private static final class OrderItem implements Serializable {
        private static final long serialVersionUID = 1L;

        private final int productId;
        private final String name;
        private final double price;
        private final int quantity;
        private final double lineTotal;

        private OrderItem(int productId, String name, double price, int quantity, double lineTotal) {
            this.productId = productId;
            this.name = name;
            this.price = price;
            this.quantity = quantity;
            this.lineTotal = lineTotal;
        }
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) {
        CorsSupport.apply(req, resp);
        resp.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }
}
