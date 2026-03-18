package com.tienda.productos;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public final class ProductoRepository {
    private static final List<Producto> PRODUCTOS = Collections.unmodifiableList(Arrays.asList(
        new Producto(1, "Llibreta reciclada", "Llibreta A5 ecologica", "Paper reciclat", 8.50, 25, "img/producte1.jpg"),
        new Producto(2, "Boligraf de bambu", "Boligraf reutilitzable", "Bambu", 3.20, 40, "img/producte2.jpg"),
        new Producto(3, "Carpeta kraft", "Carpeta resistent", "Cartro", 5.90, 18, "img/producte3.jpg")
    ));

    private ProductoRepository() {
    }

    public static List<Producto> findAll() {
        return PRODUCTOS;
    }
}
