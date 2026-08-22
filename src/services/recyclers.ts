// services/recyclers.ts
import { recovenApi } from "./api";
import type {
  Recycler,
  RecyclerTab,
  RecyclerCreatePayload,
  RecyclerUpdatePayload,
} from "../types/recycler";

// Todos los endpoints del módulo comparten la misma base /recyclers.
// El guard JwtAuthGuard está aplicado a nivel de clase en el controller,
// por lo que TODOS los métodos requieren autenticación (requiresAuth: true).

/**
 * Lista recicladores filtrando por pestaña y/o búsqueda de nombre/cédula.
 * Cuando tab === "todos" no se envía el parámetro tab, y el backend
 * devuelve todos los activos (estadoVinculacion = ACTIVO, deletedAt = null).
 *
 * Controller: GET /recyclers  (JwtAuthGuard — nivel de clase)
 */
export async function getRecyclersByTab(tab: RecyclerTab, search?: string): Promise<Recycler[]> {
  const params = new URLSearchParams();
  if (tab !== "todos") params.append("tab", tab);
  if (search) params.append("search", search);
  const query = params.toString();
  return recovenApi.get(`/recyclers${query ? `?${query}` : ""}`, true);
}

/**
 * Crea un reciclador (completo o parcial).
 *
 * Controller: POST /recyclers  (JwtAuthGuard)
 */
export async function createRecycler(payload: RecyclerCreatePayload): Promise<Recycler> {
  return recovenApi.post("/recyclers", payload, true);
}

/**
 * Actualiza los datos de un reciclador (campos básicos, barrios y microrrutas).
 * El servicio NestJS usa una transacción para reemplazar las relaciones M:N
 * (delete + createMany) junto con el update de los datos básicos.
 *
 * Controller: PUT /recyclers/:id  (JwtAuthGuard)
 */
export async function updateRecycler(
  id: number,
  payload: RecyclerUpdatePayload
): Promise<Recycler> {
  return recovenApi.put(`/recyclers/${id}`, payload, true);
}

/**
 * Alterna el estado de censo (switch rápido en la tabla). Sin body.
 *
 * Controller: PATCH /recyclers/:id/toggle-censo  (JwtAuthGuard)
 */
export async function toggleCenso(id: number): Promise<Recycler> {
  return recovenApi.patch(`/recyclers/${id}/toggle-censo`, {}, true);
}

/**
 * Desvincula un reciclador (soft delete): marca estadoVinculacion = INACTIVO
 * y registra deletedAt. El reciclador pasa a la pestaña "Desvinculados".
 *
 * Controller: DELETE /recyclers/:id  (JwtAuthGuard)
 */
export async function desvincularRecycler(id: number): Promise<void> {
  return recovenApi.delete(`/recyclers/${id}`, undefined, true);
}

/**
 * Reactiva un reciclador previamente desvinculado (botón "Reactivar" en la
 * pestaña Histórico). Revierte el soft delete.
 *
 * Controller: PATCH /recyclers/:id/reactivar  (JwtAuthGuard)
 */
export async function reactivarRecycler(id: number): Promise<Recycler> {
  return recovenApi.patch(`/recyclers/${id}/reactivar`, {}, true);
}
