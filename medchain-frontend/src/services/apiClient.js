function getBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return `${window.location.protocol}//${window.location.hostname}:8080/api`;
  }
  return "http://localhost:8080/api";
}

export const BASE_URL = getBaseUrl();
const TOKEN_KEY = "medchain_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Backend returns { timestamp, status, error, message, details } on failure
// (see common/exception/ApiError.java) - this normalizes that into a plain
// Error so callers can just do `catch (err) { setError(err.message) }`.
export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details || [];
  }
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new ApiError(
      "Could not reach the MedChain server. Is the backend running on localhost:8080?",
      0,
      []
    );
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message = payload?.message || `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload?.details);
  }

  return payload;
}

export const api = {
  get: (path, opts) => request(path, { method: "GET", ...opts }),
  post: (path, body, opts) => request(path, { method: "POST", body, ...opts }),
  put: (path, body, opts) => request(path, { method: "PUT", body, ...opts }),
  patch: (path, body, opts) => request(path, { method: "PATCH", body, ...opts }),
  delete: (path, opts) => request(path, { method: "DELETE", ...opts }),
};
