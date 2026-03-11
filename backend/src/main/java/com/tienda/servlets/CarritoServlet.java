package com.tienda.servlets;

import javax.servlet.*;
import javax.servlet.http.*;
import java.io.IOException;

public class CarritoServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("text/html;charset=UTF-8");
        resp.getWriter().write("<h1>Gestión de carrito (base)</h1>");
    }
}