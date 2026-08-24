// components/admin/AdminMicrorrutas.tsx
import { useEffect, useRef, useState } from "react";
import {
  FaDrawPolygon,
  FaTimes,
  FaEraser,
  FaFileDownload,
  FaFileExcel,
  FaLayerGroup,
  FaSpinner,
} from "react-icons/fa";
import { getLocalidadesList, getBarriosGeoJson, getViasGeoJson } from "../../services/geo";
import {
  getMicrorrutas,
  deleteMicrorruta,
  exportarMicrorrutasExcel,
} from "../../services/microrutas";
import type {
  Localidad,
  Barrio,
  GeoJsonFeatureCollection,
  BarrioProperties,
  ViaProperties,
} from "../../types/geo";
import {
  toMicrorrutaFormValues,
  type MicrorrutasGeoJson,
  type MicrorrutaProperties,
  type LineStringGeoJson,
} from "../../types/microrruta";
import MicrorrutaMapEditor from "./MicrorrutaMapEditor";
import MicrorrutasTable from "./MicrorrutasTable";
import MicrorrutaFormModal from "./MicrorrutaFormModal";
import ExportarCapasModal from "./ExportarCapasModal";
import {
  generarReporteMicrorruta,
  generarReporteMicrorrutas,
} from "../../lib/microrrutaReportePdf";

type FormModalState =
  | { mode: "create"; geojson: LineStringGeoJson; distanciaTotalKm: number }
  | { mode: "edit"; microrruta: MicrorrutaProperties }
  | null;

export default function AdminMicrorrutas() {
  const [selectedLocalidad, setSelectedLocalidad] = useState("");
  const [selectedBarrio, setSelectedBarrio] = useState("");
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [barrios, setBarrios] = useState<Barrio[]>([]);
  // GeoJSON completo de los barrios de la localidad filtrada. Se pide una
  // sola vez aquí y se comparte con el mapa (como prop) en vez de que el
  // mapa haga su propia petición por separado — antes eran dos fetches
  // independientes compitiendo, y a veces el mapa no alcanzaba a tener los
  // datos listos cuando el usuario ya había elegido un barrio, por lo que
  // el encuadre no ocurría.
  const [barriosGeo, setBarriosGeo] = useState<GeoJsonFeatureCollection<BarrioProperties> | null>(
    null
  );

  // GeoJSON de vías — capa de referencia y fuente del snap al dibujar.
  // Filtradas por localidad/barrio cuando hay un filtro activo; si no hay
  // ninguno pero se está dibujando o editando, se cargan todas las vías de
  // la ciudad como respaldo (ver el efecto correspondiente más abajo).
  const [viasGeo, setViasGeo] = useState<GeoJsonFeatureCollection<ViaProperties> | null>(null);

  const [microrrutasGeo, setMicrorrutasGeo] = useState<MicrorrutasGeoJson | null>(null);

  // loading se deriva del estado de los datos: si aún no hay respuesta (null),
  // estamos cargando. Esto evita tener que llamar setState en el cuerpo del
  // efecto, lo que violaría react-hooks/set-state-in-effect.
  const loading = microrrutasGeo === null;

  const [drawing, setDrawing] = useState(false);
  const [editingGeometriaId, setEditingGeometriaId] = useState<number | null>(null);
  // id de la microrruta cuyo PDF se está generando (muestra spinner en su fila).
  const [generandoReporteId, setGenerandoReporteId] = useState<number | null>(null);
  // Progreso del PDF combinado ("Descargar todo"). null = no está corriendo.
  const [generandoTodo, setGenerandoTodo] = useState<{ actual: number; total: number } | null>(
    null
  );
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [mostrarExportarCapas, setMostrarExportarCapas] = useState(false);
  const [formModalState, setFormModalState] = useState<FormModalState>(null);

  // Contador que se incrementa para forzar una recarga de microrrutas sin
  // necesidad de pasar una función async como dependencia de useEffect.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  // Guarda contra respuestas obsoletas: recovenApi.get no acepta un
  // AbortSignal, así que un AbortController no cancela la petición real —
  // solo marca un signal que nadie lee. En su lugar, cada fetch se numera;
  // si la respuesta llega después de que los filtros ya cambiaron, se descarta.
  const requestIdRef = useRef(0);

  // Mientras se dibuja una ruta nueva o se edita un trazo existente, no permitimos
  // cambiar los filtros (evita que el mapa recargue su capa a mitad de una edición).
  const isBusy = drawing || editingGeometriaId !== null;

  // Localidades (una vez al montar)
  useEffect(() => {
    getLocalidadesList()
      .then(setLocalidades)
      .catch((err) => console.error("Error cargando localidades:", err));
  }, []);

  // Barrios según la localidad seleccionada: un solo fetch que alimenta
  // tanto el selector (lista liviana) como el mapa (GeoJSON completo).
  // El reseteo cuando no hay localidad ocurre en el evento que lo origina
  // (handleLocalidadChange / "Limpiar filtros"), no aquí — este efecto solo
  // hace la petición real cuando hay una localidad que consultar.
  useEffect(() => {
    if (!selectedLocalidad) return;

    getBarriosGeoJson({ localidadCod: selectedLocalidad })
      .then((geo) => {
        setBarriosGeo(geo);
        const lista: Barrio[] = geo.features.map((f) => ({
          id: f.properties.id,
          identificador: f.properties.identificador,
          nombre_barrio: f.properties.nombre,
          localidadCod: f.properties.localidadCod,
        }));
        setBarrios(lista);
        // Si el barrio seleccionado ya no pertenece a la nueva localidad, lo limpiamos.
        setSelectedBarrio((prev) =>
          prev && !lista.some((b) => b.identificador === prev) ? "" : prev
        );
      })
      .catch((err) => console.error("Error cargando barrios:", err));
  }, [selectedLocalidad]);

  // Vías: filtradas por el filtro de ubicación activo cuando lo hay. Si no
  // hay ningún filtro pero se está dibujando o editando un trazo, se traen
  // todas las vías de la ciudad como respaldo — es el único caso en que
  // tiene sentido cargar el set completo (sin eso, no habría nada a qué
  // engancharse con el snap). Sin filtro y sin estar dibujando/editando, no
  // se pide nada (la capa igual está oculta en ese caso).
  useEffect(() => {
    if (!selectedLocalidad && !isBusy) return;

    const filtros = selectedBarrio
      ? { localidadCod: selectedLocalidad, barrioCod: selectedBarrio }
      : selectedLocalidad
        ? { localidadCod: selectedLocalidad }
        : undefined; // sin filtro, dibujando: todas las vías

    getViasGeoJson(filtros)
      .then(setViasGeo)
      .catch((err) => console.error("Error cargando vías:", err));
  }, [selectedLocalidad, selectedBarrio, isBusy]);

  // Cambia la localidad y limpia de inmediato los datos que dependían de la
  // anterior (barrios, barrio elegido). Vías NO se limpia aquí: no depende
  // del filtro de localidad, se carga una sola vez al montar. Se hace esto
  // en el evento que lo origina, en vez de reactivamente en el efecto de
  // arriba — llamar setState síncronamente dentro de un efecto sin trabajo
  // asíncrono real detrás genera renders en cascada innecesarios.
  const handleLocalidadChange = (value: string) => {
    setSelectedLocalidad(value);
    setBarriosGeo(null);
    setBarrios([]);
    setSelectedBarrio("");
  };

  // Microrrutas — se recarga cuando cambian los filtros o cuando refresh() es llamado.
  // Ponemos microrrutasGeo a null al inicio de cada fetch (en el cleanup del efecto
  // anterior) para que `loading` vuelva a ser true inmediatamente, sin llamar
  // setState en el cuerpo del efecto.
  useEffect(() => {
    const requestId = ++requestIdRef.current;

    getMicrorrutas({
      localidadCod: selectedLocalidad || undefined,
      barrioCod: selectedBarrio || undefined,
    })
      .then((data) => {
        if (requestIdRef.current !== requestId) return; // respuesta obsoleta, se ignora
        setMicrorrutasGeo(data);
      })
      .catch((err) => {
        if (requestIdRef.current !== requestId) return;
        console.error("Error cargando microrrutas:", err);
        // En error mostramos colección vacía para no quedarnos en loading indefinido.
        setMicrorrutasGeo({ type: "FeatureCollection", features: [] });
      });

    return () => {
      // Resetear a null para que loading === true durante el siguiente fetch.
      setMicrorrutasGeo(null);
    };
  }, [selectedLocalidad, selectedBarrio, refreshKey]);

  const microrrutasList = microrrutasGeo?.features?.map((f) => f.properties) ?? [];

  const handleDrawEnd = (geojson: LineStringGeoJson, distanciaTotalKm: number) => {
    setDrawing(false);
    setFormModalState({ mode: "create", geojson, distanciaTotalKm });
  };

  const handleCloseModal = () => setFormModalState(null);

  const handleEdit = (mr: MicrorrutaProperties) => {
    setFormModalState({ mode: "edit", microrruta: mr });
  };

  const handleDelete = async (mr: MicrorrutaProperties) => {
    if (!confirm(`¿Eliminar la microrruta "${mr.nombre}"? Esta acción no se puede deshacer.`))
      return;
    try {
      await deleteMicrorruta(mr.id);
      refresh();
    } catch (error) {
      console.error("Error eliminando microrruta:", error);
      alert("No se pudo eliminar la microrruta.");
    }
  };

  const handleGenerarReporte = async (mr: MicrorrutaProperties) => {
    // La geometría vive en el feature GeoJSON, no en MicrorrutaProperties
    // (que solo trae los atributos) — se busca en los datos ya cargados en
    // vez de pedirla de nuevo al backend.
    const feature = microrrutasGeo?.features.find((f) => f.properties.id === mr.id);
    if (!feature) {
      alert("No se encontró la geometría de la microrruta. Recarga la página e intenta de nuevo.");
      return;
    }
    setGenerandoReporteId(mr.id);
    try {
      // La geometría de una microrruta siempre es LineString (confirmado en
      // el schema de Prisma: geom Unsupported("geometry(LineString, 9377)")),
      // pero el tipo del feature es el genérico GeoJsonGeometry — de ahí el cast.
      await generarReporteMicrorruta(mr, feature.geometry as LineStringGeoJson);
    } catch (error) {
      console.error("Error generando el reporte PDF:", error);
      alert("No se pudo generar el PDF de la microrruta.");
    } finally {
      setGenerandoReporteId(null);
    }
  };

  const handleGenerarReporteTodas = async () => {
    const features = microrrutasGeo?.features ?? [];
    if (features.length === 0) {
      alert("No hay microrrutas para exportar con el filtro actual.");
      return;
    }
    // Respeta el filtro de localidad/barrio activo en la tabla — "todo" es
    // "todo lo que se está viendo ahora mismo", no necesariamente todas las
    // microrrutas del sistema.
    const rutas = features.map((f) => ({
      microrruta: f.properties,
      geometry: f.geometry as LineStringGeoJson,
    }));

    setGenerandoTodo({ actual: 0, total: rutas.length });
    try {
      await generarReporteMicrorrutas(rutas, (actual, total) =>
        setGenerandoTodo({ actual, total })
      );
    } catch (error) {
      console.error("Error generando el reporte de todas las microrrutas:", error);
      alert("No se pudo generar el PDF combinado.");
    } finally {
      setGenerandoTodo(null);
    }
  };

  const handleDescargarExcel = async () => {
    setDescargandoExcel(true);
    try {
      // Mismo filtro activo que la tabla y que "Descargar todo" (PDF).
      const blob = await exportarMicrorrutasExcel({
        localidadCod: selectedLocalidad || undefined,
        barrioCod: selectedBarrio || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `microrrutas-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando el Excel de microrrutas:", error);
      alert("No se pudo descargar el archivo Excel.");
    } finally {
      setDescargandoExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-black text-gray-900">Microrrutas</h1>
        <p className="text-sm text-gray-500">
          Trace y administre los recorridos de recolección sobre el mapa.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase">
            Localidad
          </label>
          <select
            value={selectedLocalidad}
            disabled={isBusy}
            onChange={(e) => handleLocalidadChange(e.target.value)}
            className="mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
          >
            <option value="">Todas</option>
            {localidades.map((loc) => (
              <option key={loc.identificador} value={loc.identificador}>
                {loc.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase">
            Barrio
          </label>
          <select
            value={selectedBarrio}
            disabled={isBusy || barrios.length === 0}
            onChange={(e) => setSelectedBarrio(e.target.value)}
            className="mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
          >
            <option value="">Todos</option>
            {barrios.map((b) => (
              <option key={b.identificador} value={b.identificador}>
                {b.nombre_barrio}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => handleLocalidadChange("")}
          disabled={isBusy || (!selectedLocalidad && !selectedBarrio)}
          title="Limpiar filtros"
          className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FaEraser /> Limpiar filtros
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarExportarCapas(true)}
            disabled={isBusy}
            title="Exportar capas en GeoJSON o Shapefile para QGIS/ArcGIS"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaLayerGroup /> Exportar capas
          </button>
          {drawing ? (
            <button
              onClick={() => setDrawing(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
            >
              <FaTimes /> Cancelar Trazo
            </button>
          ) : (
            <button
              onClick={() => setDrawing(true)}
              disabled={editingGeometriaId !== null}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <FaDrawPolygon /> Trazar Nueva Ruta
            </button>
          )}
        </div>
      </div>

      {drawing && (
        <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          Haz clic sobre el mapa para trazar los puntos del recorrido y doble clic para finalizarlo.
          Al terminar se abrirá el formulario para completar los datos.
        </p>
      )}

      <MicrorrutaMapEditor
        localidadCod={selectedLocalidad || undefined}
        barrioCod={selectedBarrio || undefined}
        barriosGeoJson={barriosGeo}
        viasGeoJson={viasGeo}
        microrrutasGeoJson={microrrutasGeo}
        pendingGeojson={formModalState?.mode === "create" ? formModalState.geojson : null}
        drawing={drawing}
        editingGeometriaId={editingGeometriaId}
        onDrawEnd={handleDrawEnd}
        onGeometriaSaved={() => {
          setEditingGeometriaId(null);
          refresh();
        }}
        onCancelGeometriaEdit={() => setEditingGeometriaId(null)}
      />

      {loading ? (
        <div className="py-10 text-center text-gray-400">Cargando microrrutas...</div>
      ) : (
        <MicrorrutasTable
          microrrutas={microrrutasList}
          editingGeometriaId={editingGeometriaId}
          disabled={isBusy}
          generandoReporteId={generandoReporteId}
          onEdit={handleEdit}
          onEditGeometria={(mr) => setEditingGeometriaId(mr.id)}
          onDelete={handleDelete}
          onGenerarReporte={handleGenerarReporte}
        />
      )}

      {!loading && microrrutasList.length > 0 && (
        <div className="flex items-center justify-end gap-3">
          {generandoTodo && (
            <span className="text-xs font-semibold text-gray-500">
              Generando {generandoTodo.actual} de {generandoTodo.total}...
            </span>
          )}
          <button
            type="button"
            onClick={handleDescargarExcel}
            disabled={isBusy || descargandoExcel}
            title="Descargar el reporte de microrrutas en formato SUI (.xlsx)"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {descargandoExcel ? <FaSpinner className="animate-spin" /> : <FaFileExcel />}
            Descargar Excel
          </button>
          <button
            type="button"
            onClick={handleGenerarReporteTodas}
            disabled={isBusy || generandoTodo !== null}
            title="Descargar un solo PDF con una hoja por cada microrruta mostrada"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generandoTodo ? <FaSpinner className="animate-spin" /> : <FaFileDownload />}
            Descargar todo ({microrrutasList.length})
          </button>
        </div>
      )}

      {mostrarExportarCapas && (
        <ExportarCapasModal
          capas={[
            { id: "localidades", nombre: "Localidades", total: localidades.length },
            { id: "barrios", nombre: "Barrios", total: barriosGeo?.features.length ?? 0 },
            { id: "vias", nombre: "Vías", total: viasGeo?.features.length ?? 0 },
            { id: "microrrutas", nombre: "Microrrutas", total: microrrutasList.length },
          ]}
          filtros={{
            localidadCod: selectedLocalidad || undefined,
            barrioCod: selectedBarrio || undefined,
          }}
          onClose={() => setMostrarExportarCapas(false)}
        />
      )}

      {formModalState?.mode === "create" && (
        <MicrorrutaFormModal
          mode="create"
          geojson={formModalState.geojson}
          distanciaTotalKm={formModalState.distanciaTotalKm}
          onClose={handleCloseModal}
          onSaved={refresh}
        />
      )}
      {formModalState?.mode === "edit" && (
        <MicrorrutaFormModal
          mode="edit"
          microrrutaId={formModalState.microrruta.id}
          initialValues={toMicrorrutaFormValues(formModalState.microrruta)}
          onClose={handleCloseModal}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
