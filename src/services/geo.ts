// services/geo.ts
import { recovenApi } from "./api";
import type {
  GeoJsonFeatureCollection,
  LocalidadesFilters,
  BarriosFilters,
  ViasFilters,
  Localidad,
  Barrio,
  Municipio,
  LocalidadProperties,
  BarrioProperties,
  ViaProperties,
} from "../types/geo";

export async function getLocalidadesGeoJson(
  filters?: LocalidadesFilters
): Promise<GeoJsonFeatureCollection<LocalidadProperties>> {
  const params = new URLSearchParams();
  if (filters?.municipio) params.append("municipio", filters.municipio);
  const query = params.toString();
  return recovenApi.get(`/geo-territorio/localidades${query ? `?${query}` : ""}`, false);
}

export async function getBarriosGeoJson(
  filters?: BarriosFilters
): Promise<GeoJsonFeatureCollection<BarrioProperties>> {
  const params = new URLSearchParams();
  if (filters?.localidadCod) params.append("localidadCod", filters.localidadCod);
  if (filters?.municipio) params.append("municipio", filters.municipio);
  const url = `/geo-territorio/barrios?${params.toString()}`;
  return recovenApi.get(url, false);
}

export async function getViasGeoJson(
  filters?: ViasFilters
): Promise<GeoJsonFeatureCollection<ViaProperties>> {
  const params = new URLSearchParams();
  if (filters?.localidadCod) params.append("localidadCod", filters.localidadCod);
  if (filters?.barrioCod) params.append("barrioCod", filters.barrioCod);
  if (filters?.municipio) params.append("municipio", filters.municipio);
  const url = `/geo-territorio/vias?${params.toString()}`;
  return recovenApi.get(url, false);
}

export async function getLocalidadesList(municipio?: Municipio): Promise<Localidad[]> {
  const geojson = await getLocalidadesGeoJson(municipio ? { municipio } : {});
  return geojson.features.map((f) => ({
    id: f.id as number,
    identificador: f.properties.identificador,
    nombre: f.properties.nombre,
    municipio: f.properties.municipio,
  }));
}

export async function getBarriosList(
  localidadCod?: string,
  municipio?: Municipio
): Promise<Barrio[]> {
  const geojson = await getBarriosGeoJson({
    ...(localidadCod ? { localidadCod } : {}),
    ...(municipio ? { municipio } : {}),
  });
  return geojson.features.map((f) => ({
    id: f.id as number,
    identificador: f.properties.identificador,
    nombre_barrio: f.properties.nombre,
    localidadCod: f.properties.localidadCod,
  }));
}

export async function exportarLocalidades(
  formato: "geojson" | "shp",
  municipio?: Municipio
): Promise<Blob> {
  const params = new URLSearchParams({ formato });
  if (municipio) params.append("municipio", municipio);
  return recovenApi.getBlob(`/geo-territorio/localidades/exportar?${params.toString()}`, false);
}

export async function exportarBarrios(
  formato: "geojson" | "shp",
  localidadCod?: string,
  municipio?: Municipio
): Promise<Blob> {
  const params = new URLSearchParams({ formato });
  if (localidadCod) params.append("localidadCod", localidadCod);
  if (municipio) params.append("municipio", municipio);
  return recovenApi.getBlob(`/geo-territorio/barrios/exportar?${params.toString()}`, false);
}

export async function exportarVias(
  formato: "geojson" | "shp",
  localidadCod?: string,
  barrioCod?: string,
  municipio?: Municipio
): Promise<Blob> {
  const params = new URLSearchParams({ formato });
  if (localidadCod) params.append("localidadCod", localidadCod);
  if (barrioCod) params.append("barrioCod", barrioCod);
  if (municipio) params.append("municipio", municipio);
  return recovenApi.getBlob(`/geo-territorio/vias/exportar?${params.toString()}`, false);
}
