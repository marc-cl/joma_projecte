package com.tienda.servlets;

import com.tienda.security.SecurityUtils;
import com.tienda.usuarios.RepositoriUsuaris;
import com.tienda.usuarios.Usuari;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

public class ServletAuth extends HttpServlet {
    public static final String ADMIN_SESSION_KEY = "isAdminAuthenticated";
    public static final String ADMIN_USERNAME = "admin";
    
    // Noms de sessió per als usuaris normals
    public static final String USER_SESSION_KEY = "isUserAuthenticated";
    public static final String USERNAME_KEY = "authenticatedUsername";

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
        boolean isAdmin = session != null && Boolean.TRUE.equals(session.getAttribute(ADMIN_SESSION_KEY));
        boolean isUser = session != null && Boolean.TRUE.equals(session.getAttribute(USER_SESSION_KEY));
        
        String username = session != null ? (String) session.getAttribute(USERNAME_KEY) : "";

        if (isAdmin) {
            resp.getWriter().write("{\"status\":\"ok\",\"authenticated\":true,\"role\":\"admin\",\"username\":\"admin\"}");
        } else if (isUser) {
            resp.getWriter().write("{\"status\":\"ok\",\"authenticated\":true,\"role\":\"client\",\"username\":\"" + username + "\"}");
        } else {
            resp.getWriter().write("{\"status\":\"ok\",\"authenticated\":false,\"role\":\"guest\"}");
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        CorsSupport.apply(req, resp);

        String servletPath = req.getServletPath();

        if ("/api/auth/login".equals(servletPath)) {
            handleLogin(req, resp);
            return;
        }

        if ("/api/auth/register".equals(servletPath)) {
            handleRegister(req, resp);
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

    private void handleRegister(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json;charset=UTF-8");

        String username = safe(req.getParameter("username"));
        String email = safe(req.getParameter("email"));
        String password = safe(req.getParameter("password"));

        if (username.isEmpty() || email.isEmpty() || password.isEmpty()) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"status\":\"error\",\"message\":\"Tots els camps són obligatoris.\"}");
            return;
        }
        
        if (ADMIN_USERNAME.equalsIgnoreCase(username)) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"status\":\"error\",\"message\":\"Aquest nom d'usuari està reservat.\"}");
            return;
        }

        String hashedPw = SecurityUtils.hashPassword(password);
        Usuari nouUsuari = new Usuari(username, email, hashedPw);
        
        boolean ok = RepositoriUsuaris.addUser(nouUsuari);
        if (!ok) {
            resp.setStatus(HttpServletResponse.SC_CONFLICT);
            resp.getWriter().write("{\"status\":\"error\",\"message\":\"Usuari o correu ja existeix.\"}");
            return;
        }

        // Auto-login after register
        HttpSession session = req.getSession(true);
        session.setAttribute(USER_SESSION_KEY, Boolean.TRUE);
        session.setAttribute(USERNAME_KEY, username);

        resp.getWriter().write("{\"status\":\"ok\",\"message\":\"Usuari registrat correctament.\",\"role\":\"client\",\"username\":\"" + username + "\"}");
    }

    private void handleLogin(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json;charset=UTF-8");

        String username = safe(req.getParameter("username"));
        String password = safe(req.getParameter("password"));

        if (ADMIN_USERNAME.equals(username) && SecurityUtils.verifyPassword(password, ADMIN_PASSWORD_HASH)) {
            HttpSession session = req.getSession(true);
            session.setAttribute(ADMIN_SESSION_KEY, Boolean.TRUE);
            session.setAttribute(USERNAME_KEY, ADMIN_USERNAME);
            session.removeAttribute(USER_SESSION_KEY);
            resp.getWriter().write("{\"status\":\"ok\",\"role\":\"admin\",\"username\":\"admin\"}");
            return;
        }

        Usuari client = RepositoriUsuaris.findByUsernameOrEmail(username);
        if (client != null && SecurityUtils.verifyPassword(password, client.getPasswordHash())) {
            HttpSession session = req.getSession(true);
            session.setAttribute(USER_SESSION_KEY, Boolean.TRUE);
            session.setAttribute(USERNAME_KEY, client.getUsername());
            session.removeAttribute(ADMIN_SESSION_KEY);
            resp.getWriter().write("{\"status\":\"ok\",\"role\":\"client\",\"username\":\"" + client.getUsername() + "\"}");
            return;
        }

        resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        resp.getWriter().write("{\"status\":\"error\",\"message\":\"Usuari o contrasenya incorrectes.\"}");
    }

    private void handleLogout(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json;charset=UTF-8");

        HttpSession session = req.getSession(false);
        if (session != null) {
            session.removeAttribute(ADMIN_SESSION_KEY);
            session.removeAttribute(USER_SESSION_KEY);
            session.removeAttribute(USERNAME_KEY);
            session.invalidate();
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
