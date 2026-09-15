// services/usuarios.ts
//
// Rutas confirmadas contra UsuariosMicrorrutaController (todo el módulo
// detrás de JwtAuthGuard, son datos personales) y el nuevo endpoint
// MicrorrutasController.obtenerGuiaCalles.

import { recovenApi } from "./api";
import { normalizeGuiaCalles, type GuiaCallesPaso } from "../types/usuario";
import type {
  UsuarioMicrorrutaProperties,
  UsuarioMicrorrutaCreatePayload,
  UsuarioMicrorrutaUpdatePayload,
} from "../types/usuario";

/**
 * Lista las direcciones/pólizas (UsuarioMicrorruta) de una microrruta.
 *
 * GET /usuarios-microrruta?microrrutaId=:id  (JwtAuthGuard)
 */
export async function getUsuariosMicrorruta(
  microrrutaId: number
): Promise<UsuarioMicrorrutaProperties[]> {
  return recovenApi.get(`/usuarios-microrruta?microrrutaId=${microrrutaId}`, true);
}

/**
 * Crea una dirección/póliza dentro de una microrruta.
 *
 * POST /usuarios-microrruta  (JwtAuthGuard)
 */
export async function createUsuarioMicrorruta(
  payload: UsuarioMicrorrutaCreatePayload
): Promise<UsuarioMicrorrutaProperties> {
  return recovenApi.post("/usuarios-microrruta", payload, true);
}

/**
 * Actualiza una dirección/póliza existente.
 *
 * PUT /usuarios-microrruta/:id  (JwtAuthGuard)
 */
export async function updateUsuarioMicrorruta(
  id: number,
  payload: UsuarioMicrorrutaUpdatePayload
): Promise<UsuarioMicrorrutaProperties> {
  return recovenApi.put(`/usuarios-microrruta/${id}`, payload, true);
}

/**
 * Elimina una dirección/póliza.
 *
 * DELETE /usuarios-microrruta/:id  (JwtAuthGuard)
 */
export async function deleteUsuarioMicrorruta(id: number): Promise<void> {
  return recovenApi.delete(`/usuarios-microrruta/${id}`, undefined, true);
}

/**
 * Guía de calles ya calculada por el backend para una microrruta, como
 * lista de pasos legibles.
 *
 * GET /microrrutas/:id/guia-calles  (JwtAuthGuard)
 */
export async function getGuiaCalles(microrrutaId: number): Promise<GuiaCallesPaso[]> {
  const raw = await recovenApi.get(`/microrrutas/${microrrutaId}/guia-calles`, true);
  return normalizeGuiaCalles(raw);
}
