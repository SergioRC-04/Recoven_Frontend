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
// PROPIEDADES ESPECÍFICAS PARA CADA CAPA
// ============================================================

export interface LocalidadProperties {
  id: number;
  identificador: string;
  nombre: string;
  areaShape?: number;
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

export interface BarriosFilters {
  localidadCod?: string;
}

export interface ViasFilters {
  localidadCod?: string;
  barrioCod?: string;
}

// ============================================================
// TIPOS PARA SELECTORES (LISTAS)
// ============================================================

export interface Localidad {
  id: number;
  identificador: string;
  nombre: string;
}

export interface Barrio {
  id: number;
  identificador: string;
  nombre_barrio: string;
  localidadCod: string;
}
