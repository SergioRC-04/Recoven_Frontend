// services/pqrsdf.ts
import { recovenApi } from "./api";
import type {
  Pqrsdf,
  PqrsdfResponse,
  PqrsdfConsulta,
  PqrsdfCreatePayload,
  PqrsdfUpdatePayload, // ← importamos
} from "../types/pqrsdf";

/**
 * Radicar una nueva PQRSDF (público)
 */
export async function crearPqrsdf(
  data: Omit<PqrsdfCreatePayload, "urlArchivo">,
  file?: File
): Promise<PqrsdfResponse> {
  const formData = new FormData();
  Object.keys(data).forEach((key) => {
    const value = data[key as keyof typeof data];
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, String(value));
    }
  });
  if (file) {
    formData.append("file", file);
  }

  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${recovenApi.baseUrl}/pqrsdf`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al radicar la solicitud");
  }
  return response.json();
}

/**
 * Consultar el estado de un radicado (público)
 */
export async function consultarPqrsdf(payload: PqrsdfConsulta): Promise<Pqrsdf> {
  return recovenApi.post<Pqrsdf>("/pqrsdf/consultar", payload, false);
}

/**
 * Listar todas las PQRSDF (admin)
 */
export async function listarPqrsdf(): Promise<Pqrsdf[]> {
  return recovenApi.get<Pqrsdf[]>("/pqrsdf/list", true);
}

/**
 * Actualizar estado y respuesta de una PQRSDF (admin)
 */
export async function actualizarPqrsdf(
  id: number,
  payload: PqrsdfUpdatePayload,
  file?: File
): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append("estado", payload.estado);
  if (payload.respuesta) {
    formData.append("respuesta", payload.respuesta);
  }
  if (file) {
    formData.append("file", file);
  }

  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${recovenApi.baseUrl}/pqrsdf/estado/${id}`, {
    method: "PATCH",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al actualizar");
  }
  return response.json();
}
