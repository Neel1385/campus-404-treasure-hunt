// Thin API client. All responses use the { success, message, data } envelope.
// On error it throws an Error with .code and .status attached.

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export const PLAYER_KEY = "campus404:player";
export const ADMIN_KEY = "campus404:admin";

export function readPlayer() {
  try {
    return JSON.parse(localStorage.getItem(PLAYER_KEY) || "null");
  } catch {
    return null;
  }
}

export function savePlayer(auth) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(auth));
}

export function clearPlayer() {
  localStorage.removeItem(PLAYER_KEY);
}

export function readAdmin() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveAdmin(auth) {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(auth));
}

export function clearAdmin() {
  localStorage.removeItem(ADMIN_KEY);
}

async function http(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let json = {};
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!json.success) {
    const err = new Error(json.message || `Request failed (${res.status})`);
    err.code = json.code || "SERVER_ERROR";
    err.status = res.status;
    throw err;
  }

  const out = json.data && typeof json.data === "object" ? json.data : {};
  if (json.message) out.message = json.message;
  return out;
}

export const api = {
  get: (path, opts) => http(path, { ...opts }),
  post: (path, body, opts) => http(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => http(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts) => http(path, { ...opts, method: "PATCH", body }),
  del: (path, opts) => http(path, { ...opts, method: "DELETE" }),
};
