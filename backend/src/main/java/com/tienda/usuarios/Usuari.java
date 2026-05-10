package com.tienda.usuarios;

import java.io.Serializable;

public class Usuari implements Serializable {
    private static final long serialVersionUID = 1L;

    private String username;
    private String email;
    private String passwordHash;

    public Usuari(String username, String email, String passwordHash) {
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }
}