package com.tienda.usuarios;

import com.tienda.security.SecurityUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;

public final class RepositoriUsuaris {
    private static final Path DATA_DIR = Paths.get(System.getProperty("user.home"), ".ponpaper-connect");
    private static final Path USERS_FILE = DATA_DIR.resolve("users.bin");

    private static final List<Usuari> USUARIS = loadFromDisk();

    private RepositoriUsuaris() {
    }

    public static synchronized List<Usuari> findAll() {
        return Collections.unmodifiableList(new LinkedList<>(USUARIS));
    }

    public static synchronized Usuari findByUsernameOrEmail(String identifier) {
        for (Usuari usuari : USUARIS) {
            if (usuari.getUsername().equalsIgnoreCase(identifier) || usuari.getEmail().equalsIgnoreCase(identifier)) {
                return usuari;
            }
        }
        return null;
    }

    public static synchronized boolean addUser(Usuari usuari) {
        if (findByUsernameOrEmail(usuari.getUsername()) != null || findByUsernameOrEmail(usuari.getEmail()) != null) {
            return false; // Usuari ja existeix
        }
        USUARIS.add(usuari);
        saveToDisk();
        return true;
    }

    private static List<Usuari> loadFromDisk() {
        try {
            Files.createDirectories(DATA_DIR);
            if (!Files.exists(USERS_FILE)) {
                return new LinkedList<>();
            }

            byte[] fileBytes = Files.readAllBytes(USERS_FILE);
            try {
                byte[] decrypted = SecurityUtils.decryptBytes(fileBytes);
                Object raw = SecurityUtils.deserializeObject(decrypted);
                if (raw instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Usuari> loaded = (List<Usuari>) raw;
                    return new LinkedList<>(loaded);
                }
            } catch (GeneralSecurityException ex) {
                Object raw = SecurityUtils.deserializeObject(fileBytes);
                if (raw instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Usuari> loaded = (List<Usuari>) raw;
                    List<Usuari> migrated = new LinkedList<>(loaded);
                    saveToDisk(migrated);
                    return migrated;
                }
            }
        } catch (IOException | ClassNotFoundException ignored) {
        }

        return new LinkedList<>();
    }

    private static void saveToDisk() {
        saveToDisk(USUARIS);
    }

    private static void saveToDisk(List<Usuari> items) {
        try {
            Files.createDirectories(DATA_DIR);
            byte[] serialized = SecurityUtils.serializeObject(new LinkedList<>(items));
            byte[] encrypted = SecurityUtils.encryptBytes(serialized);
            Files.write(USERS_FILE, encrypted);
        } catch (IOException | GeneralSecurityException ignored) {
        }
    }
}