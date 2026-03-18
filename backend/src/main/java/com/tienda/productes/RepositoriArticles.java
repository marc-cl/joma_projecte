package com.tienda.productes;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public final class RepositoriArticles {
    private static final List<Article> ARTICLES = Collections.unmodifiableList(Arrays.asList(
        new Article(1, "Llibreta reciclada", "Llibreta A5 ecologica", "Paper reciclat", 8.50, 25, "img/producte1.jpg"),
        new Article(2, "Boligraf de bambu", "Boligraf reutilitzable", "Bambu", 3.20, 40, "img/producte2.jpg"),
        new Article(3, "Carpeta kraft", "Carpeta resistent", "Cartro", 5.90, 18, "img/producte3.jpg"),
        new Article(4, "Agenda setmanal", "Agenda compacta per organitzar la setmana", "Paper", 11.90, 22, "img/producte4.jpg"),
        new Article(5, "Pack de retoladors", "Set de retoladors de colors", "Tinta", 7.40, 30, "img/producte5.jpg"),
        new Article(6, "Estoig ecologic", "Estoig reutilitzable per material escolar", "Textil reciclat", 9.80, 16, "img/producte6.jpg"),
        new Article(7, "Bloc premium", "Bloc de notes de qualitat superior", "Paper premium", 12.50, 14, "img/producte7.jpg"),
        new Article(8, "Organitzador d'escriptori", "Accessoris per mantenir l'ordre al despatx", "Fusta", 15.00, 10, "img/producte8.jpg"),
        new Article(9, "Dossier corporatiu", "Material corporatiu inspirat en la imatge d'empresa", "Paper estucat", 13.90, 12, "img/empresa.jpg"),
        new Article(10, "Edicio temporada", "Producte inspirat en la imatge principal de la portada", "Edicio limitada", 17.50, 8, "img/hero-img.jpg"),
        new Article(11, "Edicio especial 01D13A0517", "Serie especial basada en la imatge exclusiva", "Coleccio", 21.00, 6, "img/01D13A0517.jpg")
    ));

    private RepositoriArticles() {
    }

    public static List<Article> findAll() {
        return ARTICLES;
    }
}
