// components/admin/ExportarCapasModal.tsx
import { useState } from "react";
import { FaTimes, FaFileCode, FaFileArchive, FaSpinner } from "react-icons/fa";
import { descargarCapa, type CapaId } from "../../lib/exportarCapas";
import type { MicrorrutasFilters } from "../../types/microrruta";

interface CapaExportable {
  id: CapaId;
  nombre: string;
  // Conteo solo para mostrar en pantalla — la exportación real siempre le
  // pide los datos frescos al backend, con el mismo filtro activo.
  total: number;
}

interface ExportarCapasModalProps {
  capas: CapaExportable[];
  filtros: MicrorrutasFilters;
  onClose: () => void;
}

/**
 * Modal para exportar las capas del mapa (barrios, localidades, vías,
 * microrrutas) en GeoJSON o Shapefile (EPSG:9377), para revisar en
 * QGIS/ArcGIS. Los archivos los genera el backend — este modal solo
 * dispara la petición y maneja el estado de carga por botón.
 */
export default function ExportarCapasModal({ capas, filtros, onClose }: ExportarCapasModalProps) {
  // Identifica qué botón está en curso, como "barrios-geojson" o
  // "vias-shp", para mostrarle el spinner solo a ese y bloquear los demás
  // mientras dura.
  const [exportando, setExportando] = useState<string | null>(null);

  const handleExportar = async (capa: CapaExportable, formato: "geojson" | "shp") => {
    const clave = `${capa.id}-${formato}`;
    setExportando(clave);
    try {
      await descargarCapa(capa.id, formato, filtros);
    } catch (error) {
      console.error(`Error exportando ${capa.nombre} (${formato}):`, error);
      alert(`No se pudo exportar "${capa.nombre}".`);
    } finally {
      setExportando(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Exportar capas</h2>
            <p className="mt-1 text-xs text-gray-500">
              Para revisar en QGIS o ArcGIS. El Shapefile sale en EPSG:9377.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {capas.map((capa) => {
            const generandoGeojson = exportando === `${capa.id}-geojson`;
            const generandoShp = exportando === `${capa.id}-shp`;
            return (
              <div
                key={capa.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 p-3"
              >
                <div>
                  <p className="text-sm font-bold text-gray-800">{capa.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {capa.total} elemento{capa.total === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportar(capa, "geojson")}
                    disabled={exportando !== null}
                    title="Descargar GeoJSON (EPSG:9377)"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generandoGeojson ? <FaSpinner className="animate-spin" /> : <FaFileCode />}
                    GeoJSON
                  </button>
                  <button
                    onClick={() => handleExportar(capa, "shp")}
                    disabled={exportando !== null}
                    title="Descargar Shapefile (EPSG:9377)"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generandoShp ? <FaSpinner className="animate-spin" /> : <FaFileArchive />}
                    Shapefile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
