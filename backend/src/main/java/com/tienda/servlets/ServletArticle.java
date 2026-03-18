package com.tienda.servlets;

import com.tienda.productes.Article;
import com.tienda.productes.RepositoriArticles;

import javax.servlet.*;
import javax.servlet.http.*;
import java.io.IOException;
import java.util.List;
import java.util.Locale;

public class ServletArticle extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        if ("/api/productes".equals(req.getServletPath())) {
            resp.setContentType("application/json;charset=UTF-8");
            resp.getWriter().write(buildArticlesJson(RepositoriArticles.findAll()));
            return;
        }

        resp.setContentType("text/html;charset=UTF-8");
        resp.getWriter().write("<h1>Gestio de articles (base)</h1>");
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
}
