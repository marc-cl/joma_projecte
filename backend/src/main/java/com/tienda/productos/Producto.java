package com.tienda.productos;

public class Producto {
    private final int id;
    private final String name;
    private final String description;
    private final String material;
    private final double price;
    private final int stock;
    private final String imageUrl;

    public Producto(int id, String name, String description, String material, double price, int stock, String imageUrl) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.material = material;
        this.price = price;
        this.stock = stock;
        this.imageUrl = imageUrl;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getMaterial() {
        return material;
    }

    public double getPrice() {
        return price;
    }

    public int getStock() {
        return stock;
    }

    public String getImageUrl() {
        return imageUrl;
    }
}
