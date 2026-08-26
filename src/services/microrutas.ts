// services/microrutas.ts
import { recovenApi } from "./api";
import type {
  MicrorrutasGeoJson,
  MicrorrutaFeature,
  MicrorrutasFilters,
  MicrorrutaCreatePayload,
  MicrorrutaUpdatePayload,
  MicrorrutaGeometriaPayload,
  MicrorrutaProperties,
  MicrorrutaApiItem,
} from "../types/microrruta";

// ============================================================
// LECTURA
// ============================================================

/**
 * Lista las microrrutas y las adapta a un GeoJSON FeatureCollection en
 * EPSG:4326 (con longitud calculada en km), que es la forma que consumen
 * el mapa, la tabla y el resto de la app. Admite filtro por barrioCod y/o
 * localidadCod.
 *
 * Controller: GET /microrrutas  (@Controller('/microrrutas'), sin guard)
 *
 * ⚠️ El backend NO devuelve un FeatureCollection: devuelve un array plano,
 * con los nombres de columna de Prisma en snake_case (fecha_operacion,
 * dir_inicio, dist_pavimentada, etc.) y la geometría anidada en `geojson`
 * por cada item — confirmado con una respuesta real. La adaptación a
 * FeatureCollection + camelCase ocurre en `toMicrorrutaFeature` de este
 * archivo, para que el resto de la app no tenga que conocer esta forma.
 */
export async function getMicrorrutas(filters?: MicrorrutasFilters): Promise<MicrorrutasGeoJson> {
  const params = new URLSearchParams();
  if (filters?.localidadCod) params.append("localidadCod", filters.localidadCod);
  if (filters?.barrioCod) params.append("barrioCod", filters.barrioCod);
  const query = params.toString();
  const raw = await recovenApi.get<unknown>(`/microrrutas${query ? `?${query}` : ""}`, false);
  return normalizeMicrorrutasGeoJson(raw);
}

function normalizeMicrorrutasGeoJson(raw: unknown): MicrorrutasGeoJson {
  // Forma nueva confirmada: array plano de MicrorrutaApiItem (snake_case).
  if (Array.isArray(raw)) {
    const features: MicrorrutaFeature[] = [];
    for (const item of raw as MicrorrutaApiItem[]) {
      const feature = toMicrorrutaFeature(item);
      if (feature) features.push(feature);
    }
    return { type: "FeatureCollection", features };
  }

  // Por si el backend cambia en el futuro y sí empieza a responder un
  // FeatureCollection real, lo aceptamos tal cual sin necesidad de tocar
  // este archivo de nuevo.
  if (raw && typeof raw === "object" && Array.isArray((raw as { features?: unknown }).features)) {
    return raw as MicrorrutasGeoJson;
  }

  console.warn(
    "[microrrutas] GET /microrrutas devolvió una forma no reconocida " +
      "(ni array plano ni FeatureCollection). Se usa una colección vacía " +
      "como respaldo. Respuesta recibida:",
    raw
  );
  return { type: "FeatureCollection", features: [] };
}

/**
 * Adapta un item crudo del backend (snake_case, geometría anidada) a un
 * GeoJSON Feature con propiedades en camelCase. Si al item le falta una
 * geometría válida se descarta (con un warning) en vez de romper el mapa.
 */
function toMicrorrutaFeature(item: MicrorrutaApiItem): MicrorrutaFeature | null {
  if (!item.geojson || item.geojson.type !== "LineString") {
    console.warn(
      `[microrrutas] La microrruta "${item.nombre}" (id ${item.id}) no tiene una geometría ` +
        "LineString válida y se omite del mapa/tabla.",
      item
    );
    return null;
  }

  const properties: MicrorrutaProperties = {
    id: item.id,
    nombre: item.nombre,
    tipo: item.tipo,
    fechaOperacion: item.fecha_operacion,
    dirInicio: item.dir_inicio,
    horaInicio: item.hora_inicio,
    dirFin: item.dir_fin,
    horaFin: item.hora_fin,
    distPavimentada: item.dist_pavimentada,
    distNoPavimentada: item.dist_no_pavimentada,
    frecuencia: item.frecuencia,
    diasFrecuencia: item.dias_frecuencia,
    estacionTransferencia: item.estacion_transferencia,
    tipoBarrido: item.tipo_barrido,
    estado: item.estado,
    longitudKm: item.longitud_calculada_km,
  };

  return {
    type: "Feature",
    id: item.id,
    geometry: item.geojson,
    properties,
  };
}

/**
 * Versión liviana: solo id/nombre, para poblar selectores (p. ej. el
 * multi-select de microrrutas en el formulario de recicladores).
 */
export async function getMicrorrutasList(): Promise<{ id: number; nombre: string }[]> {
  const geojson = await getMicrorrutas();
  return geojson.features.map((f) => ({ id: f.properties.id, nombre: f.properties.nombre }));
}

// ============================================================
// MUTACIONES
// ============================================================

/**
 * Crea una microrruta con su trazo inicial.
 *
 * Controller: POST /microrrutas  (JwtAuthGuard)
 */
export async function createMicrorruta(
  payload: MicrorrutaCreatePayload
): Promise<MicrorrutaProperties> {
  return recovenApi.post("/microrrutas", payload, true);
}

/**
 * Actualiza los campos del SUI de una microrruta. Si se incluye `geojson`
 * en el payload, el servicio NestJS lo detecta y actualiza también la
 * geometría PostGIS en la misma llamada.
 *
 * Controller: PUT /microrrutas/:id  (JwtAuthGuard)
 */
export async function updateMicrorruta(
  id: number,
  payload: MicrorrutaUpdatePayload
): Promise<MicrorrutaProperties> {
  return recovenApi.put(`/microrrutas/${id}`, payload, true);
}

/**
 * Redibuja únicamente el trazo (geometría) de una microrruta existente.
 * Se llama desde el botón "Guardar Trazo" del mapa, sin tocar los demás
 * campos del SUI.
 *
 * Controller: PUT /microrrutas/:id/geometria  (JwtAuthGuard)
 */
export async function updateMicrorrutaGeometria(
  id: number,
  payload: MicrorrutaGeometriaPayload
): Promise<MicrorrutaProperties> {
  return recovenApi.put(`/microrrutas/${id}/geometria`, payload, true);
}

/**
 * Elimina una microrruta.
 *
 * Controller: DELETE /microrrutas/:id  (JwtAuthGuard)
 */
export async function deleteMicrorruta(id: number): Promise<void> {
  return recovenApi.delete(`/microrrutas/${id}`, undefined, true);
}

/**
 * Descarga el reporte de microrrutas en el formato oficial del SUI (columnas
 * numeradas 1-13, sin encabezados descriptivos) como archivo .xlsx. Admite
 * los mismos filtros que getMicrorrutas, para que respete el filtro activo
 * en la tabla del admin.
 *
 * ⚠️ Se asume que recovenApi.getBlob(endpoint, requiresAuth) sigue el mismo
 * patrón posicional que el resto de métodos del cliente (get/post/etc.).
 * Si la firma real difiere, ajustar esta llamada.
 *
 * Controller: GET /microrrutas/exportar-excel  (JwtAuthGuard)
 */
export async function exportarMicrorrutasExcel(filters?: MicrorrutasFilters): Promise<Blob> {
  const params = new URLSearchParams();
  if (filters?.localidadCod) params.append("localidadCod", filters.localidadCod);
  if (filters?.barrioCod) params.append("barrioCod", filters.barrioCod);
  const query = params.toString();
  return recovenApi.getBlob(`/microrrutas/exportar-excel${query ? `?${query}` : ""}`, true);
}

/**
 * Descarga la capa de microrrutas (geometría nativa en EPSG:9377, sin
 * reproyectar) en GeoJSON o Shapefile, para revisar en QGIS/ArcGIS. Admite
 * los mismos filtros que getMicrorrutas.
 *
 * Controller: GET /microrrutas/exportar-capa  (JwtAuthGuard)
 */
export async function exportarMicrorrutasCapa(
  formato: "geojson" | "shp",
  filters?: MicrorrutasFilters
): Promise<Blob> {
  const params = new URLSearchParams({ formato });
  if (filters?.localidadCod) params.append("localidadCod", filters.localidadCod);
  if (filters?.barrioCod) params.append("barrioCod", filters.barrioCod);
  return recovenApi.getBlob(`/microrrutas/exportar-capa?${params.toString()}`, true);
}

export interface UbicacionMicrorruta {
  barrioCod: string | null;
  barrioNombre: string | null;
  localidadCod: string | null;
  localidadNombre: string | null;
}

/**
 * Resuelve geométricamente el barrio y la localidad donde cae una
 * microrruta (intersección espacial en PostGIS, no el barrio asignado a
 * un reciclador). Si la ruta cruza varios barrios, el backend devuelve el
 * de mayor longitud de intersección.
 *
 * Controller: GET /microrrutas/:id/ubicacion  (JwtAuthGuard)
 */
export async function resolverUbicacionMicrorruta(id: number): Promise<UbicacionMicrorruta> {
  return recovenApi.get(`/microrrutas/${id}/ubicacion`, true);
}
