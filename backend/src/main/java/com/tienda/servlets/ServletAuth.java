package com.tienda.servlets;

import com.tienda.security.SecurityUtils;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

public class ServletAuth extends HttpServlet {
    public static final String ADMIN_SESSION_KEY = "isAdminAuthenticated";
    public static final String ADMIN_USERNAME = "admin";
    private static final String ADMIN_PASSWORD_HASH = resolveAdminPasswordHash();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        CorsSupport.apply(req, resp);

        if (!"/api/auth/session".equals(req.getServletPath())) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        resp.setContentType("application/json;charset=UTF-8");

        HttpSession session = req.getSession(false);
        boolean authenticated = session != null && Boolean.TRUE.equals(session.getAttribute(ADMIN_SESSION_KEY));

        String json = authenticated
            ? "{\"status\":\"ok\",\"authenticated\":true,\"role\":\"admin\",\"username\":\"admin\"}"
            : "{\"status\":\"ok\",\"authenticated\":false,\"role\":\"guest\"}";

        resp.getWriter().write(json);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        CorsSupport.apply(req, resp);

        String servletPath = req.getServletPath();

        if ("/api/auth/login".equals(servletPath)) {
            handleLogin(req, resp);
            return;
        }

        if ("/api/auth/logout".equals(servletPath)) {
            handleLogout(req, resp);
            return;
        }

        resp.sendError(HttpServletResponse.SC_NOT_FOUND);
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) {
        CorsSupport.apply(req, resp);
        resp.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }

    private void handleLogin(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json;charset=UTF-8");

        String username = safe(req.getParameter("username"));
        String password = safe(req.getParameter("password"));

        if (!ADMIN_USERNAME.equals(username) || !SecurityUtils.verifyPassword(password, ADMIN_PASSWORD_HASH)) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("{\"status\":\"error\",\"message\":\"Credencials d'administrador invalides.\"}");
            return;
        }

        HttpSession session = req.getSession(true);
        session.setAttribute(ADMIN_SESSION_KEY, Boolean.TRUE);

        resp.getWriter().write("{\"status\":\"ok\",\"role\":\"admin\",\"username\":\"admin\"}");
    }

    private void handleLogout(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json;charset=UTF-8");

        HttpSession session = req.getSession(false);
        if (session != null) {
            session.removeAttribute(ADMIN_SESSION_KEY);
        }

        resp.getWriter().write("{\"status\":\"ok\",\"message\":\"Sessio tancada.\"}");
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private static String resolveAdminPasswordHash() {
        String envHash = System.getenv("PONPAPER_ADMIN_PASSWORD_HASH");
        if (envHash != null && !envHash.isBlank()) {
            return envHash.trim();
        }

        return SecurityUtils.hashPassword("1234");
    }
}
