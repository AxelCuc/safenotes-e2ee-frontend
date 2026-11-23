// Cliente de la API. Todas las rutas son relativas (/api/...): en desarrollo Vite las
// reenvía al backend. La cookie HttpOnly de sesión la maneja el navegador solo.
let csrfToken = null;
let onUnauthorized = null;

export const setCsrf = (token) => {
  csrfToken = token;
};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET" && csrfToken) headers["X-CSRF-Token"] = csrfToken;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: "same-origin",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Revisa que el backend esté encendido.", 0);
  }

  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin JSON */
  }

  if (!res.ok) {
    const isAuthProbe = path === "/auth/login" || path === "/auth/me";
    if (res.status === 401 && !isAuthProbe && onUnauthorized) onUnauthorized();
    let message = "Ocurrió un error inesperado.";
    if (Array.isArray(data?.errors) && data.errors.length) {
      message = data.errors.map((e) => e.mensaje).join(" ");
    } else if (typeof data?.detail === "string") {
      message = data.detail;
    }
    throw new ApiError(message, res.status);
  }
  return data;
}

export const api = {
  register: (data) => request("POST", "/auth/register", data),
  login: (data) => request("POST", "/auth/login", data),
  me: () => request("GET", "/auth/me"),
  logout: () => request("POST", "/auth/logout"),
  listNotes: () => request("GET", "/notes?limit=200"),
  createNote: (sealed) => request("POST", "/notes", sealed),
  updateNote: (id, sealed) => request("PUT", `/notes/${id}`, sealed),
  deleteNote: (id) => request("DELETE", `/notes/${id}`),
};
