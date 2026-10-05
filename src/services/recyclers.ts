// services/recyclers.ts
import { recovenApi } from "./api";
import type {
  Recycler,
  RecyclersFilters,
  RecyclerCreatePayload,
  RecyclerUpdatePayload,
  TipoExportRecyclers,
  MunicipioCierre,
  CierreCensoPreview,
  CierreCensoResultado,
} from "../types/recycler";
import type { Municipio } from "../types/geo";

// Todos los endpoints del módulo comparten la misma base /recyclers.
// El guard JwtAuthGuard está aplicado a nivel de clase en el controller,
// por lo que TODOS los métodos requieren autenticación (requiresAuth: true).

/**
 * Lista recicladores combinando las dimensiones de filtro que hagan
 * falta (ruta, censo, clasificación, barrio, estado, búsqueda de texto) —
 * todas opcionales y combinables entre sí, a diferencia del antiguo
 * esquema de una sola pestaña excluyente. `search` ahora también hace
 * match contra el nombre del barrio y el nombre de la ruta asignados, no
 * solo nombre/cédula.
 *
 * Controller: GET /recyclers  (JwtAuthGuard — nivel de clase)
 */
export async function getRecyclers(filters: RecyclersFilters): Promise<Recycler[]> {
  const params = new URLSearchParams();
  if (filters.desvinculados) params.append("desvinculados", "true");
  if (filters.rutas) params.append("rutas", filters.rutas);
  filters.clasificacion?.forEach((c) => params.append("clasificacion", c));
  if (filters.censado !== undefined) params.append("censado", String(filters.censado));
  filters.barrioId?.forEach((b) => params.append("barrioId", b));
  if (filters.municipio) params.append("municipio", filters.municipio);
  if (filters.search) params.append("search", filters.search);
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

/**
 * Asigna una microrruta a un reciclador — a diferencia de updateRecycler,
 * no reemplaza la lista completa de rutas del reciclador (que requeriría
 * conocerla entera de antemano), solo agrega esta una sin tocar las
 * demás. Se usa en el flujo de "¿asignar un trabajador?" justo después de
 * crear una microrruta nueva.
 *
 * Controller: PATCH /recyclers/:id/asignar-microrruta  (JwtAuthGuard)
 */
export async function asignarMicrorrutaARecycler(
  recyclerId: number,
  microrrutaId: number
): Promise<void> {
  await recovenApi.patch(`/recyclers/${recyclerId}/asignar-microrruta`, { microrrutaId }, true);
}

/**
 * Descarga la Solicitud de Inclusión (PDF) de un reciclador — se genera
 * al vuelo en el backend en cada llamado, no hay nada pre-generado ni
 * guardado: siempre refleja los barrios/rutas actuales del reciclador.
 *
 * Controller: GET /recyclers/:id/afiliacion  (JwtAuthGuard)
 */
export async function exportarAfiliacion(id: number): Promise<Blob> {
  return recovenApi.getBlob(`/recyclers/${id}/afiliacion`, true);
}

/**
 * Descarga el Excel de recicladores para el reporte indicado (con colores
 * de Censo/Rutas/Clasificación aplicados en el backend). "desvinculados" es
 * el único tipo sin columna de Clasificación.
 *
 * Controller: GET /recyclers/exportar?tipo=...  (JwtAuthGuard)
 */
export async function exportarRecyclers(
  tipo: TipoExportRecyclers,
  municipio?: Municipio | "SIN_CIUDAD"
): Promise<Blob> {
  const params = new URLSearchParams({ tipo });
  if (municipio) params.append("municipio", municipio);
  return recovenApi.getBlob(`/recyclers/exportar?${params.toString()}`, true);
}

/**
 * Vista previa del cierre de censo de una ciudad: cuántos se desvinculan,
 * cuántos pasan de nuevo a regular y cuántas rutas quedarían inactivas.
 *
 * Controller: GET /recyclers/cierre-censo/preview?municipio=  (JwtAuthGuard)
 */
export async function previsualizarCierreCenso(
  municipio: MunicipioCierre
): Promise<CierreCensoPreview> {
  return recovenApi.get(`/recyclers/cierre-censo/preview?municipio=${municipio}`, true);
}

/**
 * Cierra el censo de una ciudad (IRREVERSIBLE): desvincula a los "a quitar",
 * pasa los nuevos a regulares y deja censados a todos los del informe nuevo.
 * El backend guarda una copia del Excel (censados antes/después) y devuelve
 * su URL pública.
 *
 * Controller: POST /recyclers/cierre-censo  (JwtAuthGuard)
 */
export async function cerrarCenso(municipio: MunicipioCierre): Promise<CierreCensoResultado> {
  return recovenApi.post("/recyclers/cierre-censo", { municipio }, true);
}
