package com.tienda.servlets;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public final class CorsSupport {
    private CorsSupport() {
    }

    public static void apply(HttpServletRequest req, HttpServletResponse resp) {
        String origin = req.getHeader("Origin");
        if (origin != null && isAllowedOrigin(origin)) {
            resp.setHeader("Access-Control-Allow-Origin", origin);
            resp.setHeader("Vary", "Origin");
            resp.setHeader("Access-Control-Allow-Credentials", "true");
        }

        resp.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-User, X-Admin-Password");
        resp.setHeader("Access-Control-Max-Age", "3600");
    }

    private static boolean isAllowedOrigin(String origin) {
        return "null".equals(origin)
            || origin.startsWith("http://localhost")
            || origin.startsWith("http://127.0.0.1")
            || origin.startsWith("https://localhost")
            || origin.startsWith("https://127.0.0.1");
    }
}
