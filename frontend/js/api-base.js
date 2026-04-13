/**
 * Detecció ràpida de la URL base del backend (WAR servlet).
 * - Prioritat: window.__PONPAPER_API_BASE__ (config.js) > localStorage ponpaperApiBase > candidats.
 * - Cada intent usa AbortController + timeout curt; els candidats es proven en grups en paral·lel (Promise.any).
 */

export const API_BASE_KEY = "ponpaperApiBase";

/** Evita tornar a sondar totes les URLs en cada navegació dins la mateixa pestanya. */
const SESSION_API_BASE_KEY = "ponpaperApiBaseSession";

const DEFAULT_TIMEOUT_MS = 2000;
const PARALLEL_GROUP = 4;

function getOverrideBase() {
  if (typeof window === "undefined") return "";
  const raw = window.__PONPAPER_API_BASE__;
  if (raw == null || String(raw).trim() === "") return "";
  return String(raw).trim().replace(/\/$/, "");
}

function normalizeBase(base) {
  return String(base || "").trim().replace(/\/$/, "");
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function probeProductsBase(base) {
  const normalized = normalizeBase(base);
  if (!normalized) throw new Error("empty base");
  const response = await fetchWithTimeout(`${normalized}/api/productes`, { method: "GET" });
  if (!response.ok) throw new Error("not ok");
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) throw new Error("not json");
  const data = await response.json();
  if (!data || data.status !== "ok" || !Array.isArray(data.productes)) {
    throw new Error("unexpected payload");
  }
  return normalized;
}

async function probeAdminSessionBase(base) {
  const normalized = normalizeBase(base);
  if (!normalized) throw new Error("empty base");
  const response = await fetchWithTimeout(`${normalized}/api/auth/session`, {
    method: "GET",
    credentials: "include"
  });
  if (!response.ok) throw new Error("not ok");
  const data = await response.json();
  if (data.status === "ok" && data.authenticated === true && data.role === "admin") {
    return normalized;
  }
  throw new Error("not admin");
}

/**
 * Candidats ordats: override, desat, mateix origen, després localhost (pom: backend-1.0-SNAPSHOT).
 */
export function buildApiCandidates() {
  const override = getOverrideBase();
  let saved = "";
  try {
    saved = normalizeBase(localStorage.getItem(API_BASE_KEY) || "");
  } catch (_) {
    saved = "";
  }

  // Des de file:// el navegador no pot fer fetch fiable a localhost; només provem URLs absolutes.
  if (location.protocol === "file:") {
    const fileTail = [
      ...(override ? [override] : []),
      ...(saved && saved !== override ? [saved] : []),
      "http://localhost:8080/backend-1.0-SNAPSHOT",
      "http://127.0.0.1:8080/backend-1.0-SNAPSHOT",
      "http://localhost:8080/backend",
      "http://localhost:8080"
    ];
    return [...new Set(fileTail.map(normalizeBase).filter(Boolean))];
  }

  const hostBase = `${location.protocol}//${location.host}`;
  const tail = [
    `${hostBase}/backend-1.0-SNAPSHOT`,
    `${hostBase}/backend`,
    `${hostBase}/ponpaper-backend-1.0-SNAPSHOT`,
    hostBase,
    "http://localhost:8080/backend-1.0-SNAPSHOT",
    "http://localhost:8080/backend",
    "http://127.0.0.1:8080/backend-1.0-SNAPSHOT",
    "http://localhost:8080",
    "http://localhost:8081/backend-1.0-SNAPSHOT"
  ];

  const ordered = [
    ...(override ? [override] : []),
    ...(saved && saved !== override ? [saved] : []),
    ...tail.filter((u) => normalizeBase(u) !== override && normalizeBase(u) !== saved)
  ];

  return [...new Set(ordered.map(normalizeBase).filter(Boolean))];
}

function rememberSessionBase(base) {
  try {
    sessionStorage.setItem(SESSION_API_BASE_KEY, base);
  } catch (_) {
    // mode privat o bloquejat
  }
}

function forgetSessionBase() {
  try {
    sessionStorage.removeItem(SESSION_API_BASE_KEY);
  } catch (_) {
    // ignore
  }
}

/**
 * Primer backend que respongui GET /api/productes amb 200.
 */
export async function detectApiBase() {
  try {
    const cached = normalizeBase(sessionStorage.getItem(SESSION_API_BASE_KEY) || "");
    if (cached) {
      try {
        const base = await probeProductsBase(cached);
        rememberSessionBase(base);
        return base;
      } catch (_) {
        forgetSessionBase();
      }
    }
  } catch (_) {
    forgetSessionBase();
  }

  const candidates = buildApiCandidates();

  for (let i = 0; i < candidates.length; i += PARALLEL_GROUP) {
    const group = candidates.slice(i, i + PARALLEL_GROUP);
    try {
      const base = await Promise.any(group.map((c) => probeProductsBase(c)));
      rememberSessionBase(base);
      return base;
    } catch (_) {
      // Tots els intents del grup han fallat; següent grup.
    }
  }

  return "";
}

/**
 * Prioritza la sessió admin ja vàlida (mateixa cookie al backend correcte).
 */
export async function detectApiBaseWithAdminSession() {
  const candidates = buildApiCandidates();

  for (let i = 0; i < candidates.length; i += PARALLEL_GROUP) {
    const group = candidates.slice(i, i + PARALLEL_GROUP);
    try {
      const base = await Promise.any(group.map((c) => probeAdminSessionBase(c)));
      rememberSessionBase(base);
      return base;
    } catch (_) {
      // Següent grup.
    }
  }

  return "";
}
