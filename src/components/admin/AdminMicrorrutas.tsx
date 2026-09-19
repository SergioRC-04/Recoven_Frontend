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
  FaMap,
  FaFileAlt,
  FaChevronDown,
  FaTable,
} from "react-icons/fa";
import { getLocalidadesList, getBarriosGeoJson, getViasGeoJson } from "../../services/geo";
import {
  getMicrorrutas,
  deleteMicrorruta,
  exportarMicrorrutasExcel,
  exportarMicrorrutasTabla,
  getMacrorrutas,
} from "../../services/microrutas";
import { getRecyclers } from "../../services/recyclers";
import { calcularConteosMicrorrutas, ordenarPorConteo } from "../../lib/microrrutaConteos";
import type {
  Localidad,
  Barrio,
  GeoJsonFeatureCollection,
  BarrioProperties,
  ViaProperties,
  Municipio,
} from "../../types/geo";
import type { Recycler } from "../../types/recycler";
import {
  toMicrorrutaFormValues,
  ESTADO_MICRORRUTA_LABELS,
  type EstadoMicrorruta,
  type MicrorrutasGeoJson,
  type MicrorrutaProperties,
  type LineStringGeoJson,
  type MacrorrutaResumen,
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
import { generarReporteMacrorrutas } from "../../lib/macrorrutaReportePdf";

type FormModalState =
  | { mode: "create"; geojson: LineStringGeoJson; distanciaTotalKm: number }
  | { mode: "edit"; microrruta: MicrorrutaProperties }
  | null;

export default function AdminMicrorrutas() {
  // El filtro más amplio de todos — pero a diferencia de
  // localidad/barrio/macrorruta, NO es un filtro combinable: los datos de
  // las dos ciudades nunca se mezclan, así que siempre hay una ciudad
  // activa (nunca "todas"), igual que las pestañas del mapa público
  // (MapaServicios.tsx). Barranquilla se divide en localidades/barrios;
  // Puerto Colombia hoy es una sola "localidad" que cubre todo el
  // municipio (ver schema.prisma, enum Municipio).
  const [selectedCiudad, setSelectedCiudad] = useState<Municipio>("BARRANQUILLA");
  const [selectedLocalidad, setSelectedLocalidad] = useState("");
  const [selectedBarrio, setSelectedBarrio] = useState("");
  // Independiente de localidad/barrio: filtra por en qué localidad cae la
  // MAYOR parte del trazo de cada ruta (ver macrorrutaNumero en
  // types/microrruta.ts), no por qué barrios toca.
  const [selectedMacrorruta, setSelectedMacrorruta] = useState("");
  // Por defecto solo las ACTIVA; las INACTIVA (todos sus recicladores
  // desvinculados) solo se ven eligiéndolas aquí.
  const [selectedEstado, setSelectedEstado] = useState<EstadoMicrorruta>("ACTIVA");
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [macrorrutas, setMacrorrutas] = useState<MacrorrutaResumen[]>([]);

  // GeoJSON de todos los barrios de la ciudad activa (se recarga al
  // cambiar de ciudad, ya no es una carga única para toda la app).
  const [todosLosBarriosGeo, setTodosLosBarriosGeo] =
    useState<GeoJsonFeatureCollection<BarrioProperties> | null>(null);

  // GeoJSON de vías de la ciudad activa — hoy siempre vacío para Puerto
  // Colombia (no se cargó ninguna vía ahí), pero el filtro funciona igual.
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
  const [descargandoTabla, setDescargandoTabla] = useState(false);
  const [generandoMapaMacrorrutas, setGenerandoMapaMacrorrutas] = useState(false);
  // Dropdown "Informes" — agrupa las 3 exportaciones de informe (Excel
  // SUI, PDF SUI, Mapa de Macrorrutas) en un solo botón, para no llenar
  // el header de botones sueltos. "Exportar Capas" y "Exportar Tabla" NO
  // usan este patrón: Capas ya tiene su propio modal, y Tabla es una sola
  // acción directa sin nada que elegir.
  const [mostrarMenuInformes, setMostrarMenuInformes] = useState(false);
  const menuInformesRef = useRef<HTMLDivElement>(null);
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

  // Cierra el dropdown "Informes" al hacer clic afuera — patrón estándar,
  // no depende de ningún otro estado del componente.
  useEffect(() => {
    if (!mostrarMenuInformes) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuInformesRef.current && !menuInformesRef.current.contains(e.target as Node)) {
        setMostrarMenuInformes(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrarMenuInformes]);

  // ─── Carga de datos iniciales ────────────────────────────────────────────────

  // Localidades — se recarga al cambiar de ciudad. Cambiar de ciudad
  // también limpia localidad/barrio/macrorruta, porque esas selecciones
  // ya no aplican necesariamente a la ciudad nueva.
  useEffect(() => {
    getLocalidadesList(selectedCiudad)
      .then(setLocalidades)
      .catch((err) => console.error("Error cargando localidades:", err));
  }, [selectedCiudad]);

  // Lista de macrorrutas para el select de filtro — se refresca con
  // refreshKey para que una macrorruta recién creada (al crear la
  // primera microrruta de una localidad) aparezca sin recargar la
  // página.
  useEffect(() => {
    getMacrorrutas(selectedCiudad)
      .then(setMacrorrutas)
      .catch((err) => console.error("Error cargando macrorrutas:", err));
  }, [selectedCiudad, refreshKey]);

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

  // Barrios de la ciudad activa — se recarga al cambiar de ciudad.
  useEffect(() => {
    getBarriosGeoJson({ municipio: selectedCiudad })
      .then(setTodosLosBarriosGeo)
      .catch((err) => console.error("Error cargando todos los barrios:", err));
  }, [selectedCiudad]);

  // Vías de la ciudad activa — hoy siempre vacío para Puerto Colombia.
  useEffect(() => {
    getViasGeoJson({ municipio: selectedCiudad })
      .then(setViasGeo)
      .catch((err) => console.error("Error cargando vías:", err));
  }, [selectedCiudad]);

  useEffect(() => {
    getMicrorrutas({ municipio: selectedCiudad })
      .then((geo) => setTodasLasMicrorrutas(geo.features.map((f) => f.properties)))
      .catch((err) =>
        console.error("Error cargando el total de microrrutas para los filtros:", err)
      );
  }, [selectedCiudad, refreshKey]);

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
      macrorrutaNumero: selectedMacrorruta || undefined,
      municipio: selectedCiudad,
      estado: selectedEstado,
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
  }, [
    selectedCiudad,
    selectedLocalidad,
    selectedBarrio,
    selectedMacrorruta,
    selectedEstado,
    refreshKey,
  ]);

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

  // Cambiar de ciudad limpia localidad/barrio/macrorruta — esas opciones
  // pertenecen a la ciudad anterior y ya no tendría sentido dejarlas
  // seleccionadas (una localidad de Barranquilla no existe al ver Puerto
  // Colombia, y viceversa). A diferencia de los demás filtros, ciudad no
  // tiene un valor "vacío": siempre hay una activa.
  const handleCiudadChange = (value: Municipio) => {
    setSelectedCiudad(value);
    setSelectedLocalidad("");
    setSelectedBarrio("");
    setSelectedMacrorruta("");
  };

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
        macrorrutaNumero: selectedMacrorruta || undefined,
        municipio: selectedCiudad,
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

  const handleGenerarMapaMacrorrutas = async () => {
    setGenerandoMapaMacrorrutas(true);
    try {
      await generarReporteMacrorrutas();
    } catch (error) {
      console.error("Error generando el mapa de macrorrutas:", error);
      alert("No se pudo generar el mapa de macrorrutas.");
    } finally {
      setGenerandoMapaMacrorrutas(false);
    }
  };

  // Excel "espejo" de MicrorrutasTable.tsx (Nombre, Tipo, Fecha, Días,
  // Trabajador, Barrio) — distinto del Excel SUI (formato oficial,
  // columnas numeradas). Acción directa, sin dropdown: solo hace una cosa.
  const handleDescargarTabla = async () => {
    setDescargandoTabla(true);
    try {
      const blob = await exportarMicrorrutasTabla({
        localidadCod: selectedLocalidad || undefined,
        barrioCod: selectedBarrio || undefined,
        macrorrutaNumero: selectedMacrorruta || undefined,
        municipio: selectedCiudad,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `microrrutas-tabla-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando la tabla de microrrutas:", error);
      alert("No se pudo descargar la tabla de microrrutas.");
    } finally {
      setDescargandoTabla(false);
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

          <div className="relative" ref={menuInformesRef}>
            <button
              type="button"
              onClick={() => setMostrarMenuInformes((v) => !v)}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaFileAlt /> Informes <FaChevronDown className="text-xs" />
            </button>
            {mostrarMenuInformes && (
              <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarMenuInformes(false);
                    handleDescargarExcel();
                  }}
                  disabled={isBusy || descargandoExcel}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {descargandoExcel ? <FaSpinner className="animate-spin" /> : <FaFileExcel />}
                  Excel SUI Microrrutas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarMenuInformes(false);
                    handleGenerarReporteTodas();
                  }}
                  disabled={isBusy || generandoTodo !== null}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generandoTodo ? <FaSpinner className="animate-spin" /> : <FaFileDownload />}
                  Informe SUI Microrrutas ({microrrutasList.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarMenuInformes(false);
                    handleGenerarMapaMacrorrutas();
                  }}
                  disabled={isBusy || generandoMapaMacrorrutas}
                  title="Mapa con la división por macrorrutas (localidades con al menos una microrruta)"
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generandoMapaMacrorrutas ? <FaSpinner className="animate-spin" /> : <FaMap />}
                  Mapa de Macrorrutas
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMostrarExportarCapas(true)}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaLayerGroup /> Exportar Capas
          </button>

          <button
            type="button"
            onClick={handleDescargarTabla}
            disabled={isBusy || descargandoTabla}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {descargandoTabla ? <FaSpinner className="animate-spin" /> : <FaTable />}
            Exportar Tabla
          </button>
        </div>
      </div>

      {/* Ciudad — pestañas separadas del panel de filtros a propósito
          (igual que en el mapa público, MapaServicios.tsx): los datos de
          Barranquilla y Puerto Colombia nunca se mezclan, así que no es
          "un filtro más" combinable con Localidad/Barrio/Macrorruta, sino
          una sección completa aparte. Siempre hay una ciudad activa. */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => handleCiudadChange("BARRANQUILLA")}
          disabled={isBusy}
          className={`rounded-t-xl px-6 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            selectedCiudad === "BARRANQUILLA"
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
          }`}
        >
          📍 Barranquilla
        </button>
        <button
          type="button"
          onClick={() => handleCiudadChange("PUERTO_COLOMBIA")}
          disabled={isBusy}
          className={`rounded-t-xl px-6 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            selectedCiudad === "PUERTO_COLOMBIA"
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
          }`}
        >
          ⚓ Puerto Colombia
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        {selectedCiudad === "BARRANQUILLA" && (
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
        )}
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

        <div>
          <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase">
            Macrorruta
          </label>
          <select
            value={selectedMacrorruta}
            disabled={isBusy || macrorrutas.length === 0}
            onChange={(e) => setSelectedMacrorruta(e.target.value)}
            className="mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
          >
            <option value="">Todas</option>
            {macrorrutas.map((mac) => (
              <option key={mac.numero} value={mac.numero}>
                {mac.numero} — {mac.localidadNombre} ({mac.total})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase">
            Estado
          </label>
          <select
            value={selectedEstado}
            disabled={isBusy}
            onChange={(e) => setSelectedEstado(e.target.value as EstadoMicrorruta)}
            className="mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
          >
            {(Object.keys(ESTADO_MICRORRUTA_LABELS) as EstadoMicrorruta[]).map((estado) => (
              <option key={estado} value={estado}>
                {ESTADO_MICRORRUTA_LABELS[estado]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedLocalidad("");
            setSelectedBarrio("");
            setSelectedMacrorruta("");
            setSelectedEstado("ACTIVA");
          }}
          disabled={
            isBusy ||
            (!selectedLocalidad &&
              !selectedBarrio &&
              !selectedMacrorruta &&
              selectedEstado === "ACTIVA")
          }
          title="Limpiar filtros"
          aria-label="Limpiar filtros"
          className="inline-flex items-center justify-center rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FaEraser />
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
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
            macrorrutaNumero: selectedMacrorruta || undefined,
            municipio: selectedCiudad,
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
