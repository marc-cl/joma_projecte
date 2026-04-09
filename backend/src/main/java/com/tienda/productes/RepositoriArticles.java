package com.tienda.productes;

import com.tienda.security.SecurityUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

public final class RepositoriArticles {
    private static final Path DATA_DIR = Paths.get(System.getProperty("user.home"), ".ponpaper-connect");
    private static final Path PRODUCTS_FILE = DATA_DIR.resolve("products.bin");

    private static final List<Article> DEFAULT_ARTICLES = Arrays.asList(
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
    );

    private static final List<Article> ARTICLES = loadFromDisk();

    private RepositoriArticles() {
    }

    public static synchronized List<Article> findAll() {
        return Collections.unmodifiableList(new LinkedList<>(ARTICLES));
    }

    public static synchronized Article findById(int productId) {
        for (Article article : ARTICLES) {
            if (article.getId() == productId) {
                return article;
            }
        }
        return null;
    }

    public static synchronized boolean updateStock(int productId, int newStock) {
        for (int i = 0; i < ARTICLES.size(); i++) {
            Article current = ARTICLES.get(i);
            if (current.getId() == productId) {
                ARTICLES.set(i, new Article(
                    current.getId(),
                    current.getName(),
                    current.getDescription(),
                    current.getMaterial(),
                    current.getPrice(),
                    newStock,
                    current.getImageUrl()
                ));
                saveToDisk();
                return true;
            }
        }
        return false;
    }

    public static synchronized boolean updateProduct(int productId, Integer newStock, Double newPrice) {
        for (int i = 0; i < ARTICLES.size(); i++) {
            Article current = ARTICLES.get(i);
            if (current.getId() == productId) {
                ARTICLES.set(i, new Article(
                    current.getId(),
                    current.getName(),
                    current.getDescription(),
                    current.getMaterial(),
                    newPrice == null ? current.getPrice() : newPrice,
                    newStock == null ? current.getStock() : newStock,
                    current.getImageUrl()
                ));
                saveToDisk();
                return true;
            }
        }
        return false;
    }

    public static synchronized boolean reserveStock(Map<Integer, Integer> requestedByProductId) {
        if (requestedByProductId == null || requestedByProductId.isEmpty()) {
            return true;
        }

        Map<Integer, Article> byId = new HashMap<>();
        for (Article article : ARTICLES) {
            byId.put(article.getId(), article);
        }

        // First pass: validate stock availability for all requested products.
        for (Map.Entry<Integer, Integer> entry : requestedByProductId.entrySet()) {
            int productId = entry.getKey();
            int requestedQty = entry.getValue() == null ? 0 : entry.getValue();
            Article current = byId.get(productId);
            if (current == null || requestedQty <= 0 || current.getStock() < requestedQty) {
                return false;
            }
        }

        // Second pass: apply stock decrement once all products are validated.
        for (int i = 0; i < ARTICLES.size(); i++) {
            Article current = ARTICLES.get(i);
            Integer requestedQty = requestedByProductId.get(current.getId());
            if (requestedQty == null) {
                continue;
            }

            int newStock = current.getStock() - requestedQty;
            ARTICLES.set(i, new Article(
                current.getId(),
                current.getName(),
                current.getDescription(),
                current.getMaterial(),
                current.getPrice(),
                newStock,
                current.getImageUrl()
            ));
        }

        saveToDisk();
        return true;
    }

    private static List<Article> loadFromDisk() {
        try {
            Files.createDirectories(DATA_DIR);
            if (!Files.exists(PRODUCTS_FILE)) {
                List<Article> seeded = new LinkedList<>(DEFAULT_ARTICLES);
                saveToDisk(seeded);
                return seeded;
            }

            byte[] fileBytes = Files.readAllBytes(PRODUCTS_FILE);
            try {
                byte[] decrypted = SecurityUtils.decryptBytes(fileBytes);
                Object raw = SecurityUtils.deserializeObject(decrypted);
                if (raw instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Article> loaded = (List<Article>) raw;
                    return new LinkedList<>(loaded);
                }
            } catch (GeneralSecurityException ex) {
                // Legacy fallback: file could be plain serialized data from old versions.
                Object raw = SecurityUtils.deserializeObject(fileBytes);
                if (raw instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Article> loaded = (List<Article>) raw;
                    List<Article> migrated = new LinkedList<>(loaded);
                    saveToDisk(migrated);
                    return migrated;
                }
            }
        } catch (IOException | ClassNotFoundException ignored) {
            // Fallback to defaults when persisted data cannot be read.
        }

        return new LinkedList<>(DEFAULT_ARTICLES);
    }

    private static void saveToDisk() {
        saveToDisk(ARTICLES);
    }

    private static void saveToDisk(List<Article> items) {
        try {
            Files.createDirectories(DATA_DIR);
            byte[] serialized = SecurityUtils.serializeObject(new LinkedList<>(items));
            byte[] encrypted = SecurityUtils.encryptBytes(serialized);
            Files.write(PRODUCTS_FILE, encrypted);
        } catch (IOException ignored) {
            // Keep app running even if persistence layer fails.
        } catch (GeneralSecurityException ignored) {
            // Keep app running even if encryption layer fails.
        }
    }
}
