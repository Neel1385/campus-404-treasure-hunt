// Thin API client. All responses use the { success, message, data } envelope.
// On error it throws an Error with .code and .status attached.

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export const PLAYER_KEY = "campus404:player";
export const ADMIN_KEY = "campus404:admin";
export const EVENT_KEY = "campus404:current_event";

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

export function readCurrentEventId() {
  try {
    const ev = JSON.parse(localStorage.getItem(EVENT_KEY) || "null");
    return ev ? ev._id : null;
  } catch {
    return null;
  }
}

async function http(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const currentEventId = readCurrentEventId();
  let fullPath = path;
  if (currentEventId && !path.includes("eventId=")) {
    const separator = path.includes("?") ? "&" : "?";
    fullPath = `${path}${separator}eventId=${currentEventId}`;
  }

  const res = await fetch(`${API_BASE}${fullPath}`, {
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

  if (!res.ok || !json.success) {
    const defaultMsg = res.status === 404
      ? "Resource not found on server."
      : res.status >= 500
      ? "Server encountered an error. Please try again."
      : `Request failed (${res.status})`;
    const err = new Error(json.message || defaultMsg);
    err.code = json.code || (res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR");
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
