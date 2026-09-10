// types/geo.ts

// ============================================================
// TIPOS GEOJSON BÁSICOS (sin any)
// ============================================================

/**
 * Posición: par de coordenadas [longitud, latitud] o [longitud, latitud, altitud]
 */
export type GeoJsonPosition = [number, number] | [number, number, number];

/**
 * Coordenadas recursivas: pueden ser una posición o un arreglo de coordenadas anidadas
 * Esto cubre Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon
 */
export type GeoJsonCoordinates = GeoJsonPosition | GeoJsonCoordinates[];

/**
 * Tipos de geometría soportados por GeoJSON
 */
export type GeoJsonGeometryType =
  | "Point"
  | "LineString"
  | "Polygon"
  | "MultiPoint"
  | "MultiLineString"
  | "MultiPolygon"
  | "GeometryCollection";

/**
 * Geometría GeoJSON con coordenadas tipadas
 */
export interface GeoJsonGeometry {
  type: GeoJsonGeometryType;
  coordinates: GeoJsonCoordinates;
}

/**
 * Feature GeoJSON con propiedades genéricas (tipadas por Props)
 */
export interface GeoJsonFeature<Props = Record<string, unknown>> {
  type: "Feature";
  id?: string | number;
  geometry: GeoJsonGeometry;
  properties: Props;
}

/**
 * FeatureCollection GeoJSON
 */
export interface GeoJsonFeatureCollection<Props = Record<string, unknown>> {
  type: "FeatureCollection";
  features: GeoJsonFeature<Props>[];
}

// ============================================================
// MUNICIPIO — Barranquilla o Puerto Colombia
// ============================================================

// Puerto Colombia hoy es UNA sola fila de Localidades (identificador
// "PC-000") cubriendo todo el municipio, no subdividida en corregimientos
// — temporal, ver el comentario en schema.prisma junto al enum Municipio.
export type Municipio = "BARRANQUILLA" | "PUERTO_COLOMBIA";

// ============================================================
// PROPIEDADES ESPECÍFICAS PARA CADA CAPA
// ============================================================

export interface LocalidadProperties {
  id: number;
  identificador: string;
  nombre: string;
  areaShape?: number;
  municipio: Municipio;
}

export interface BarrioProperties {
  id: number;
  identificador: string;
  nombre: string;
  localidadCod: string;
  observaciones?: string;
  areaShape?: number;
}

export interface ViaProperties {
  id: number;
  texto: string;
  abrTexto?: string;
  shapeLen?: number;
}

// ============================================================
// FILTROS PARA ENDPOINTS
// ============================================================

export interface LocalidadesFilters {
  municipio?: Municipio;
}

export interface BarriosFilters {
  localidadCod?: string;
  // Independiente de localidadCod — "todos los barrios de Puerto
  // Colombia" sin elegir una localidad puntual primero.
  municipio?: Municipio;
}

export interface ViasFilters {
  localidadCod?: string;
  barrioCod?: string;
  municipio?: Municipio;
}

// ============================================================
// TIPOS PARA SELECTORES (LISTAS)
// ============================================================

export interface Localidad {
  id: number;
  identificador: string;
  nombre: string;
  municipio: Municipio;
}

export interface Barrio {
  id: number;
  identificador: string;
  nombre_barrio: string;
  localidadCod: string;
}
