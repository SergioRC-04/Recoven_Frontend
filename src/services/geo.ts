// services/geo.ts
import { recovenApi } from "./api";
import type {
  GeoJsonFeatureCollection,
  BarriosFilters,
  ViasFilters,
  Localidad,
  Barrio,
  LocalidadProperties,
  BarrioProperties,
  ViaProperties,
} from "../types/geo";

export async function getLocalidadesGeoJson(): Promise<
  GeoJsonFeatureCollection<LocalidadProperties>
> {
  return recovenApi.get("/geo-territorio/localidades", false);
}

export async function getBarriosGeoJson(
  filters?: BarriosFilters
): Promise<GeoJsonFeatureCollection<BarrioProperties>> {
  const params = new URLSearchParams();
  if (filters?.localidadCod) params.append("localidadCod", filters.localidadCod);
  const url = `/geo-territorio/barrios?${params.toString()}`;
  return recovenApi.get(url, false);
}

export async function getViasGeoJson(
  filters?: ViasFilters
): Promise<GeoJsonFeatureCollection<ViaProperties>> {
  const params = new URLSearchParams();
  if (filters?.localidadCod) params.append("localidadCod", filters.localidadCod);
  if (filters?.barrioCod) params.append("barrioCod", filters.barrioCod);
  const url = `/geo-territorio/vias?${params.toString()}`;
  return recovenApi.get(url, false);
}

export async function getLocalidadesList(): Promise<Localidad[]> {
  const geojson = await getLocalidadesGeoJson();
  return geojson.features.map((f) => ({
    id: f.id as number,
    identificador: f.properties.identificador,
    nombre: f.properties.nombre,
  }));
}

export async function getBarriosList(localidadCod?: string): Promise<Barrio[]> {
  const geojson = await getBarriosGeoJson(localidadCod ? { localidadCod } : {});
  return geojson.features.map((f) => ({
    id: f.id as number,
    identificador: f.properties.identificador,
    nombre_barrio: f.properties.nombre,
    localidadCod: f.properties.localidadCod,
  }));
}
