const BASE_URL = import.meta.env.VITE_API_URL as string;

function getToken(): string | null {
  return localStorage.getItem("token");
}

function handleSessionExpired(): void {
  localStorage.removeItem("token");
  window.dispatchEvent(
    new CustomEvent("session-expired", {
      detail: { message: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente." },
    })
  );
}

async function handleResponse<T>(
  response: Response,
  returnBlob: false,
  requiresAuth: boolean
): Promise<T>;
async function handleResponse(
  response: Response,
  returnBlob: true,
  requiresAuth: boolean
): Promise<Blob>;
async function handleResponse(
  response: Response,
  returnBlob: boolean = false,
  requiresAuth: boolean = false
): Promise<unknown> {
  // Solo si la petición requería autenticación y recibimos 401 → sesión expirada
  if (requiresAuth && response.status === 401) {
    handleSessionExpired();
    throw new Error("SESION_EXPIRADA");
  }
  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errorData = (await response.json()) as {
        message?: string | string[];
      };
      // El ValidationPipe de NestJS devuelve un arreglo cuando hay varios
      // errores de validación a la vez (uno por campo), y un string simple
      // cuando es un solo error de negocio. Antes se asumía siempre string,
      // así que un arreglo terminaba coercionado por Error() y unido con
      // comas sin espacio ("mensaje uno,mensaje dos").
      if (Array.isArray(errorData.message)) {
        errorMsg = errorData.message.join(". ");
      } else if (errorData.message) {
        errorMsg = errorData.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return returnBlob ? await response.blob() : await response.json();
}

export const recovenApi = {
  baseUrl: BASE_URL,

  async post<T = unknown>(
    endpoint: string,
    data: unknown,
    requiresAuth: boolean = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (requiresAuth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response, false, requiresAuth);
  },

  async get<T = unknown>(endpoint: string, requiresAuth: boolean = false): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (requiresAuth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers,
    });
    return handleResponse<T>(response, false, requiresAuth);
  },

  async put<T = unknown>(
    endpoint: string,
    data: unknown,
    requiresAuth: boolean = true
  ): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (requiresAuth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response, false, requiresAuth);
  },

  async delete<T = unknown>(
    endpoint: string,
    data?: unknown,
    requiresAuth: boolean = true
  ): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (requiresAuth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response, false, requiresAuth);
  },

  async getBlob(endpoint: string, requiresAuth: boolean = true): Promise<Blob> {
    const headers: Record<string, string> = {};
    if (requiresAuth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers,
    });
    return handleResponse(response, true, requiresAuth);
  },

  async patch<T = unknown>(
    endpoint: string,
    data: unknown,
    requiresAuth: boolean = true
  ): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (requiresAuth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response, false, requiresAuth);
  },
};
