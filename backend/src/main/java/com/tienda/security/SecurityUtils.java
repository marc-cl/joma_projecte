package com.tienda.security;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

public final class SecurityUtils {
    private static final String PASSWORD_ALGO = "PBKDF2WithHmacSHA256";
    private static final int PASSWORD_ITERATIONS = 65536;
    private static final int PASSWORD_KEY_LENGTH = 256;
    private static final int PASSWORD_SALT_BYTES = 16;

    private static final String CIPHER_ALGO = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128;
    private static final int GCM_IV_BYTES = 12;
    private static final byte[] DATA_KEY_SALT = "ponpaper-data-v1".getBytes();
    private static final int DATA_KEY_ITERATIONS = 65536;

    private static final SecureRandom RANDOM = new SecureRandom();

    private SecurityUtils() {
    }

    public static String hashPassword(String plainPassword) {
        byte[] salt = new byte[PASSWORD_SALT_BYTES];
        RANDOM.nextBytes(salt);
        byte[] hash = derivePbkdf2(plainPassword.toCharArray(), salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH);

        return "pbkdf2$" + PASSWORD_ITERATIONS + "$"
            + Base64.getEncoder().encodeToString(salt) + "$"
            + Base64.getEncoder().encodeToString(hash);
    }

    public static boolean verifyPassword(String plainPassword, String storedHash) {
        if (storedHash == null || storedHash.isBlank()) {
            return false;
        }

        String[] parts = storedHash.split("\\$");
        if (parts.length != 4 || !"pbkdf2".equals(parts[0])) {
            return false;
        }

        int iterations;
        try {
            iterations = Integer.parseInt(parts[1]);
        } catch (NumberFormatException ex) {
            return false;
        }

        byte[] salt;
        byte[] expectedHash;
        try {
            salt = Base64.getDecoder().decode(parts[2]);
            expectedHash = Base64.getDecoder().decode(parts[3]);
        } catch (IllegalArgumentException ex) {
            return false;
        }

        byte[] actualHash = derivePbkdf2(plainPassword.toCharArray(), salt, iterations, expectedHash.length * 8);
        return MessageDigest.isEqual(expectedHash, actualHash);
    }

    public static byte[] encryptBytes(byte[] plainData) throws GeneralSecurityException {
        SecretKey key = deriveDataKey();
        byte[] iv = new byte[GCM_IV_BYTES];
        RANDOM.nextBytes(iv);

        Cipher cipher = Cipher.getInstance(CIPHER_ALGO);
        cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
        byte[] encrypted = cipher.doFinal(plainData);

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        output.write('E');
        output.write('N');
        output.write('C');
        output.write('1');
        output.write(iv.length);
        output.write(iv, 0, iv.length);
        output.write(encrypted, 0, encrypted.length);
        return output.toByteArray();
    }

    public static byte[] decryptBytes(byte[] cipherData) throws GeneralSecurityException {
        if (cipherData.length < 6) {
            throw new GeneralSecurityException("Invalid encrypted payload");
        }

        if (cipherData[0] != 'E' || cipherData[1] != 'N' || cipherData[2] != 'C' || cipherData[3] != '1') {
            throw new GeneralSecurityException("Unsupported payload format");
        }

        int ivLength = cipherData[4] & 0xFF;
        int ivStart = 5;
        int payloadStart = ivStart + ivLength;
        if (cipherData.length <= payloadStart) {
            throw new GeneralSecurityException("Invalid encrypted payload");
        }

        byte[] iv = new byte[ivLength];
        System.arraycopy(cipherData, ivStart, iv, 0, ivLength);
        byte[] encrypted = new byte[cipherData.length - payloadStart];
        System.arraycopy(cipherData, payloadStart, encrypted, 0, encrypted.length);

        SecretKey key = deriveDataKey();
        Cipher cipher = Cipher.getInstance(CIPHER_ALGO);
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
        return cipher.doFinal(encrypted);
    }

    public static byte[] serializeObject(Serializable value) throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             ObjectOutputStream objectOut = new ObjectOutputStream(out)) {
            objectOut.writeObject(value);
            return out.toByteArray();
        }
    }

    public static Object deserializeObject(byte[] serialized) throws IOException, ClassNotFoundException {
        try (ObjectInputStream objectIn = new ObjectInputStream(new ByteArrayInputStream(serialized))) {
            return objectIn.readObject();
        }
    }

    private static byte[] derivePbkdf2(char[] password, byte[] salt, int iterations, int keyBits) {
        try {
            SecretKeyFactory factory = SecretKeyFactory.getInstance(PASSWORD_ALGO);
            PBEKeySpec spec = new PBEKeySpec(password, salt, iterations, keyBits);
            return factory.generateSecret(spec).getEncoded();
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Cannot hash password", ex);
        }
    }

    private static SecretKey deriveDataKey() throws GeneralSecurityException {
        String keyMaterial = System.getenv("PONPAPER_DATA_KEY");
        if (keyMaterial == null || keyMaterial.isBlank()) {
            keyMaterial = "ponpaper-dev-only-change-this-key";
        }

        byte[] keyBytes = derivePbkdf2(
            keyMaterial.toCharArray(),
            DATA_KEY_SALT,
            DATA_KEY_ITERATIONS,
            256
        );

        return new SecretKeySpec(keyBytes, "AES");
    }
}
