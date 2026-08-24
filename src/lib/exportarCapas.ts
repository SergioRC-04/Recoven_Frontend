// lib/exportarCapas.ts
//
// Descarga las capas del mapa de Microrrutas (barrios, localidades, vías,
// microrrutas) en GeoJSON o Shapefile, para revisar en QGIS/ArcGIS.
//
// Todo el trabajo pesado (leer la geometría nativa en EPSG:9377, generar el
// Shapefile con el .prj correcto) lo hace el backend — ya tiene acceso
// directo a las geometrías vía PostGIS, sin necesidad de reproyectar nada
// del lado del navegador. Este archivo solo pide el blob correcto y
// dispara la descarga.
//
// Versión anterior de este archivo generaba los Shapefiles en el propio
// navegador con proj4 + @mapbox/shp-write + jszip — se descartó ese enfoque
// a favor de este, más simple y sin duplicar la lógica de reproyección.

import { exportarBarrios, exportarLocalidades, exportarVias } from "../services/geo";
import { exportarMicrorrutasCapa } from "../services/microrutas";
import type { MicrorrutasFilters } from "../types/microrruta";

export type CapaId = "barrios" | "localidades" | "vias" | "microrrutas";
export type FormatoExport = "geojson" | "shp";

function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function extensionPara(formato: FormatoExport): string {
  return formato === "shp" ? "zip" : "geojson";
}

/**
 * Pide al backend el archivo de la capa indicada y dispara su descarga.
 * `filtros` se ignora para "localidades" (esa capa no admite filtro).
 */
export async function descargarCapa(
  capa: CapaId,
  formato: FormatoExport,
  filtros: MicrorrutasFilters
): Promise<void> {
  let blob: Blob;

  switch (capa) {
    case "barrios":
      blob = await exportarBarrios(formato, filtros.localidadCod);
      break;
    case "localidades":
      blob = await exportarLocalidades(formato);
      break;
    case "vias":
      blob = await exportarVias(formato, filtros.localidadCod, filtros.barrioCod);
      break;
    case "microrrutas":
      blob = await exportarMicrorrutasCapa(formato, filtros);
      break;
  }

  descargarBlob(blob, `${capa}.${extensionPara(formato)}`);
}
