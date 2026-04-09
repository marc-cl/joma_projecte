package com.tienda.servlets;

import com.tienda.productes.Article;
import com.tienda.productes.RepositoriArticles;

import javax.servlet.*;
import javax.servlet.http.*;
import java.io.IOException;
import java.util.List;
import java.util.Locale;

public class ServletArticle extends HttpServlet {
    private static final String ADMIN_USER = "admin";
    private static final String ADMIN_PASSWORD = "1234";

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        CorsSupport.apply(req, resp);

        if ("/api/productes".equals(req.getServletPath())) {
            resp.setContentType("application/json;charset=UTF-8");
            resp.getWriter().write(buildArticlesJson(RepositoriArticles.findAll()));
            return;
        }

        resp.setContentType("text/html;charset=UTF-8");
        resp.getWriter().write("<h1>Gestio de articles (base)</h1>");
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        CorsSupport.apply(req, resp);
        // Mateixa logica d'actualitzacio per POST i PUT.
        handleStockUpdate(req, resp);
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        CorsSupport.apply(req, resp);
        handleStockUpdate(req, resp);
    }

    private void handleStockUpdate(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        // Endpoint administratiu d'estoc.
        if (!"/api/productes/stock".equals(req.getServletPath())) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        resp.setContentType("application/json;charset=UTF-8");

        if (!isAdminRequest(req)) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write(errorJson("No autoritzat. Credencials d'administrador invalides."));
            return;
        }

        int productId = parseIntParameter(req, "product_id", -1);
        int stock = parseIntParameter(req, "stock", -1);
        String rawPrice = safe(req.getParameter("price"));
        Double price = null;
        if (!rawPrice.isBlank()) {
            try {
                price = Double.parseDouble(rawPrice.replace(',', '.'));
            } catch (NumberFormatException ex) {
                resp.getWriter().write(errorJson("Preu no valid."));
                return;
            }
        }

        Integer stockValue = stock >= 0 ? stock : null;
        if (productId <= 0 || (stockValue == null && price == null)) {
            resp.getWriter().write(errorJson("Parametres no valids."));
            return;
        }

        boolean updated = RepositoriArticles.updateProduct(productId, stockValue, price);
        if (!updated) {
            resp.getWriter().write(errorJson("Producte no trobat."));
            return;
        }

        Article article = RepositoriArticles.findById(productId);
        if (article == null) {
            resp.getWriter().write(errorJson("Producte no trobat."));
            return;
        }

        StringBuilder json = new StringBuilder("{\"status\":\"ok\",\"message\":\"Estoc actualitzat.\",\"producte\":{");
        json.append("\"id\":").append(article.getId())
            .append(",\"name\":\"").append(escapeJson(article.getName())).append("\"")
            .append(",\"price\":").append(String.format(Locale.US, "%.2f", article.getPrice()))
            .append(",\"stock\":").append(article.getStock())
            .append("}}");

        resp.getWriter().write(json.toString());
    }

    private String buildArticlesJson(List<Article> articles) {
        StringBuilder json = new StringBuilder("{\"status\":\"ok\",\"productes\":[");

        for (int i = 0; i < articles.size(); i++) {
            Article a = articles.get(i);
            if (i > 0) {
                json.append(',');
            }

            json.append("{\"id\":").append(a.getId())
                .append(",\"name\":\"").append(escapeJson(a.getName())).append("\"")
                .append(",\"description\":\"").append(escapeJson(a.getDescription())).append("\"")
                .append(",\"material\":\"").append(escapeJson(a.getMaterial())).append("\"")
                .append(",\"price\":").append(String.format(Locale.US, "%.2f", a.getPrice()))
                .append(",\"stock\":").append(a.getStock())
                .append(",\"image_url\":\"").append(escapeJson(a.getImageUrl())).append("\"}");
        }

        json.append("]}");
        return json.toString();
    }

    private String escapeJson(String value) {
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
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

    private String errorJson(String message) {
        return "{\"status\":\"error\",\"message\":\"" + escapeJson(message) + "\"}";
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isAdminRequest(HttpServletRequest req) {
        // Autoritza per sessio, parametres o capcaleres.
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

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) {
        CorsSupport.apply(req, resp);
        resp.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }
}
