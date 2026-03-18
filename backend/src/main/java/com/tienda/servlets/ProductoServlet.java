package com.tienda.servlets;

import com.tienda.productos.Producto;
import com.tienda.productos.ProductoRepository;

import javax.servlet.*;
import javax.servlet.http.*;
import java.io.IOException;
import java.util.List;
import java.util.Locale;

public class ProductoServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        if ("/api/products".equals(req.getServletPath())) {
            resp.setContentType("application/json;charset=UTF-8");
            resp.getWriter().write(buildProductsJson(ProductoRepository.findAll()));
            return;
        }

        resp.setContentType("text/html;charset=UTF-8");
        resp.getWriter().write("<h1>Gestio de productes (base)</h1>");
    }

    private String buildProductsJson(List<Producto> productos) {
        StringBuilder json = new StringBuilder("{\"status\":\"ok\",\"products\":[");

        for (int i = 0; i < productos.size(); i++) {
            Producto p = productos.get(i);
            if (i > 0) {
                json.append(',');
            }

            json.append("{\"id\":").append(p.getId())
                .append(",\"name\":\"").append(escapeJson(p.getName())).append("\"")
                .append(",\"description\":\"").append(escapeJson(p.getDescription())).append("\"")
                .append(",\"material\":\"").append(escapeJson(p.getMaterial())).append("\"")
                .append(",\"price\":").append(String.format(Locale.US, "%.2f", p.getPrice()))
                .append(",\"stock\":").append(p.getStock())
                .append(",\"image_url\":\"").append(escapeJson(p.getImageUrl())).append("\"}");
        }

        json.append("]}");
        return json.toString();
    }

    private String escapeJson(String value) {
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r");
    }
}