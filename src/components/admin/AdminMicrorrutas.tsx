// components/admin/AdminMicrorrutas.tsx
import { useEffect, useRef, useState, useMemo } from "react";
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
import { getRecyclers } from "../../services/recyclers";
import { calcularConteosMicrorrutas, ordenarPorConteo } from "../../lib/microrrutaConteos";
import type {
  Localidad,
  Barrio,
  GeoJsonFeatureCollection,
  BarrioProperties,
  ViaProperties,
} from "../../types/geo";
import type { Recycler } from "../../types/recycler";
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
import AsignarTrabajadorModal from "./AsignarTrabajadorModal";
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

  // GeoJSON de todos los barrios (carga única al montar)
  const [todosLosBarriosGeo, setTodosLosBarriosGeo] =
    useState<GeoJsonFeatureCollection<BarrioProperties> | null>(null);

  // GeoJSON de vías (carga única)
  const [viasGeo, setViasGeo] = useState<GeoJsonFeatureCollection<ViaProperties> | null>(null);

  const [microrrutasGeo, setMicrorrutasGeo] = useState<MicrorrutasGeoJson | null>(null);

  const loading = microrrutasGeo === null;

  const [drawing, setDrawing] = useState(false);
  const [editingGeometriaId, setEditingGeometriaId] = useState<number | null>(null);
  const [microrrutaSeleccionadaId, setMicrorrutaSeleccionadaId] = useState<number | null>(null);
  const [generandoReporteId, setGenerandoReporteId] = useState<number | null>(null);
  const [generandoTodo, setGenerandoTodo] = useState<{ actual: number; total: number } | null>(
    null
  );
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [mostrarExportarCapas, setMostrarExportarCapas] = useState(false);
  const [formModalState, setFormModalState] = useState<FormModalState>(null);
  // Microrruta recién creada, en espera de que el usuario elija (o no) un
  // trabajador para asignarle — se abre justo después de que
  // MicrorrutaFormModal en modo "create" avisa que terminó (onCreated),
  // nunca al editar una ya existente.
  const [asignandoTrabajadorPara, setAsignandoTrabajadorPara] =
    useState<MicrorrutaProperties | null>(null);

  const [recyclers, setRecyclers] = useState<Recycler[]>([]);
  const [todasLasMicrorrutas, setTodasLasMicrorrutas] = useState<MicrorrutaProperties[]>([]);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const requestIdRef = useRef(0);

  const isBusy = drawing || editingGeometriaId !== null;

  // ─── Carga de datos iniciales ────────────────────────────────────────────────

  useEffect(() => {
    getLocalidadesList()
      .then(setLocalidades)
      .catch((err) => console.error("Error cargando localidades:", err));
  }, []);

  // Recicladores — alimentan la columna "Trabajador" de la tabla Y la
  // lista de opciones de AsignarTrabajadorModal. refreshKey en las
  // dependencias: tras asignar un trabajador a una microrruta recién
  // creada, refresh() dispara este mismo efecto, así la columna
  // "Trabajador" recoge la asignación sin necesidad de un fetch aparte
  // solo para eso.
  useEffect(() => {
    getRecyclers({})
      .then(setRecyclers)
      .catch((err) => console.error("Error cargando recicladores:", err));
  }, [refreshKey]);

  useEffect(() => {
    getBarriosGeoJson()
      .then(setTodosLosBarriosGeo)
      .catch((err) => console.error("Error cargando todos los barrios:", err));
  }, []);

  useEffect(() => {
    getViasGeoJson()
      .then(setViasGeo)
      .catch((err) => console.error("Error cargando vías:", err));
  }, []);

  useEffect(() => {
    getMicrorrutas()
      .then((geo) => setTodasLasMicrorrutas(geo.features.map((f) => f.properties)))
      .catch((err) =>
        console.error("Error cargando el total de microrrutas para los filtros:", err)
      );
  }, [refreshKey]);

  // ─── Cálculo derivado de barrios y barriosGeo (sin setState en efectos) ────

  const barrios = useMemo<Barrio[]>(() => {
    if (!todosLosBarriosGeo) return [];

    let features = todosLosBarriosGeo.features;

    if (selectedLocalidad) {
      features = features.filter((f) => f.properties.localidadCod === selectedLocalidad);
    }

    const lista: Barrio[] = features.map((f) => ({
      id: f.properties.id,
      identificador: f.properties.identificador,
      nombre_barrio: f.properties.nombre,
      localidadCod: f.properties.localidadCod,
    }));

    lista.sort((a, b) => a.nombre_barrio.localeCompare(b.nombre_barrio, "es"));
    return lista;
  }, [todosLosBarriosGeo, selectedLocalidad]);

  const barriosGeo = useMemo<GeoJsonFeatureCollection<BarrioProperties> | null>(() => {
    if (!todosLosBarriosGeo) return null;

    let features = todosLosBarriosGeo.features;

    if (selectedLocalidad) {
      features = features.filter((f) => f.properties.localidadCod === selectedLocalidad);
    }

    if (selectedBarrio) {
      features = features.filter((f) => f.properties.identificador === selectedBarrio);
    }

    if (!selectedLocalidad && !selectedBarrio) {
      return null;
    }

    return {
      type: "FeatureCollection",
      features,
    };
  }, [todosLosBarriosGeo, selectedLocalidad, selectedBarrio]);

  // ─── Carga de microrrutas según filtros ─────────────────────────────────────

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    getMicrorrutas({
      localidadCod: selectedLocalidad || undefined,
      barrioCod: selectedBarrio || undefined,
    })
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setMicrorrutasGeo(data);
      })
      .catch((err) => {
        if (requestIdRef.current !== requestId) return;
        console.error("Error cargando microrrutas:", err);
        setMicrorrutasGeo({ type: "FeatureCollection", features: [] });
      });

    return () => {
      setMicrorrutasGeo(null);
    };
  }, [selectedLocalidad, selectedBarrio, refreshKey]);

  // ─── Derivados ──────────────────────────────────────────────────────────────

  const microrrutasList = microrrutasGeo?.features?.map((f) => f.properties) ?? [];

  const conteosMicrorrutas = calcularConteosMicrorrutas(todasLasMicrorrutas);
  const localidadesOrdenadas = ordenarPorConteo(
    localidades,
    conteosMicrorrutas.porLocalidad,
    (l) => l.identificador,
    (l) => l.nombre
  );
  const barriosOrdenados = ordenarPorConteo(
    barrios,
    conteosMicrorrutas.porBarrio,
    (b) => b.identificador,
    (b) => b.nombre_barrio
  );

  const trabajadorPorMicrorrutaId = new Map<number, string>();
  recyclers.forEach((r) => {
    r.microrrutas.forEach((m) => {
      if (!trabajadorPorMicrorrutaId.has(m.id)) {
        trabajadorPorMicrorrutaId.set(m.id, r.nombreCompleto);
      }
    });
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleLocalidadChange = (value: string) => {
    setSelectedLocalidad(value);
    setSelectedBarrio(""); // limpiar barrio al cambiar localidad
  };

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
    const feature = microrrutasGeo?.features.find((f) => f.properties.id === mr.id);
    if (!feature) {
      alert("No se encontró la geometría de la microrruta. Recarga la página e intenta de nuevo.");
      return;
    }
    setGenerandoReporteId(mr.id);
    try {
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

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Microrrutas</h1>
          <p className="text-sm text-gray-500">
            Trace y administre los recorridos de recolección sobre el mapa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {generandoTodo && (
            <span className="text-xs font-semibold text-gray-500">
              Generando {generandoTodo.actual} de {generandoTodo.total}...
            </span>
          )}
          <button
            type="button"
            onClick={handleDescargarExcel}
            disabled={isBusy || descargandoExcel}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {descargandoExcel ? <FaSpinner className="animate-spin" /> : <FaFileExcel />}
            Generar Excel SUI Microrrutas
          </button>
          <button
            type="button"
            onClick={handleGenerarReporteTodas}
            disabled={isBusy || generandoTodo !== null}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generandoTodo ? <FaSpinner className="animate-spin" /> : <FaFileDownload />}
            Generar Informe SUI Microrrutas ({microrrutasList.length})
          </button>
        </div>
      </div>

      {/* Filtros */}
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
            {localidadesOrdenadas.map(({ item: loc, count }) => (
              <option key={loc.identificador} value={loc.identificador}>
                {loc.nombre}
                {count > 0 ? ` (${count})` : ""}
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
            {barriosOrdenados.map(({ item: b, count }) => (
              <option key={b.identificador} value={b.identificador}>
                {b.nombre_barrio}
                {count > 0 ? ` (${count})` : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedLocalidad("");
            setSelectedBarrio("");
          }}
          disabled={isBusy || (!selectedLocalidad && !selectedBarrio)}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FaEraser /> Limpiar filtros
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarExportarCapas(true)}
            disabled={isBusy}
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
        onSelectMicrorruta={setMicrorrutaSeleccionadaId}
        selectedMicrorrutaId={microrrutaSeleccionadaId}
      />

      {loading ? (
        <div className="py-10 text-center text-gray-400">Cargando microrrutas...</div>
      ) : (
        <MicrorrutasTable
          microrrutas={microrrutasList}
          editingGeometriaId={editingGeometriaId}
          disabled={isBusy}
          generandoReporteId={generandoReporteId}
          selectedId={microrrutaSeleccionadaId}
          trabajadorPorMicrorrutaId={trabajadorPorMicrorrutaId}
          onEdit={handleEdit}
          onEditGeometria={(mr) => setEditingGeometriaId(mr.id)}
          onDelete={handleDelete}
          onGenerarReporte={handleGenerarReporte}
          onSelectRow={(mr) =>
            setMicrorrutaSeleccionadaId((prev) => (prev === mr.id ? null : mr.id))
          }
        />
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
          onCreated={(mr) => setAsignandoTrabajadorPara(mr)}
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

      {asignandoTrabajadorPara && (
        <AsignarTrabajadorModal
          microrruta={asignandoTrabajadorPara}
          recyclers={recyclers}
          onClose={() => setAsignandoTrabajadorPara(null)}
          onAssigned={() => {
            setAsignandoTrabajadorPara(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
