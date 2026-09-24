// components/admin/AdminUsuarios.tsx
//
// Sección "Usuarios": personal de campo caminando cada microrruta con el
// celular, anotando direcciones y pólizas — diseño mobile-first, con
// tolerancia a conectividad intermitente (ver lib/offlineCache.ts): el
// mapa, la información de la microrruta, la guía de calles y la lista de
// direcciones/pólizas ya cargados se guardan en localStorage y se muestran
// de inmediato al volver a filtrar/seleccionar, sin depender de que la
// petición nueva llegue a tiempo (o llegue del todo).
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaFilePdf,
  FaSpinner,
  FaPlus,
  FaListUl,
  FaWifi,
  FaRoute,
} from "react-icons/fa";
import { getLocalidadesList, getBarriosGeoJson, getViasGeoJson } from "../../services/geo";
import { getMicrorrutas } from "../../services/microrutas";
import { getRecyclers } from "../../services/recyclers";
import { getUsuariosMicrorruta, getGuiaCalles } from "../../services/usuarios";
import { useCachedResource } from "../../lib/offlineCache";
import { generarReporteUsuarios, type MicrorrutaParaReporte } from "../../lib/usuarioReportePdf";
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
  formatearDiasFrecuenciaCorto,
  type MicrorrutasGeoJson,
  type LineStringGeoJson,
} from "../../types/microrruta";
import type { UsuarioMicrorrutaProperties, GuiaCallesPaso } from "../../types/usuario";
import type { MicrorrutaProperties } from "../../types/microrruta";
import UsuariosMapa from "./UsuariosMapa";
import MicrorrutasTable from "./MicrorrutasTable";
import UsuarioMicrorrutaFormModal from "./UsuarioMicrorrutaFormModal";
import UsuariosPreviewModal from "./UsuariosPreviewModal";

// Referencias estables para los valores por defecto de useCachedResource —
// un `?? []` inline crearía un array nuevo en cada render, lo que invalida
// innecesariamente los useMemo que dependen de estos valores.
const EMPTY_LOCALIDADES: Localidad[] = [];
const EMPTY_RECYCLERS: Recycler[] = [];
const EMPTY_USUARIOS: UsuarioMicrorrutaProperties[] = [];
const EMPTY_GUIA: GuiaCallesPaso[] = [];
const EMPTY_MICRORRUTAS_PROPS: MicrorrutaProperties[] = [];

export default function AdminUsuarios() {
  const [selectedCiudad, setSelectedCiudad] = useState<Municipio>("BARRANQUILLA");
  const [selectedLocalidad, setSelectedLocalidad] = useState("");
  const [selectedBarrio, setSelectedBarrio] = useState("");

  const [microrrutaSeleccionadaId, setMicrorrutaSeleccionadaId] = useState<number | null>(null);
  // Token para forzar un refetch de direcciones/pólizas tras crear, editar
  // o eliminar una, sin cambiar de microrruta (la llave de caché es la
  // misma, así que useCachedResource necesita esta dependencia extra).
  const [refreshUsuariosToken, setRefreshUsuariosToken] = useState(0);
  const refreshUsuarios = () => setRefreshUsuariosToken((t) => t + 1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  // Sincronización al volver a esta pestaña del navegador: si se editaron
  // recicladores o microrrutas en otra, se recargan los datos. Es silenciosa
  // (useCachedResource conserva lo ya mostrado mientras llega lo nuevo). No
  // se dispara con un formulario/vista previa abiertos ni generando el PDF;
  // se limita a una vez cada 3 s porque visibilitychange y focus suelen
  // dispararse juntos.
  const [syncKey, setSyncKey] = useState(0);
  const ocupadoRef = useRef(false);
  const ultimaSyncRef = useRef(0);
  useEffect(() => {
    ocupadoRef.current = showAddModal || showPreviewModal || generandoPdf;
  }, [showAddModal, showPreviewModal, generandoPdf]);
  useEffect(() => {
    const sincronizar = () => {
      if (document.visibilityState !== "visible" || ocupadoRef.current) return;
      const ahora = Date.now();
      if (ahora - ultimaSyncRef.current < 3000) return;
      ultimaSyncRef.current = ahora;
      setSyncKey((k) => k + 1);
    };
    document.addEventListener("visibilitychange", sincronizar);
    window.addEventListener("focus", sincronizar);
    return () => {
      document.removeEventListener("visibilitychange", sincronizar);
      window.removeEventListener("focus", sincronizar);
    };
  }, []);

  const [online, setOnline] = useState(navigator.onLine);

  // ─── Conectividad ────────────────────────────────────────────────────────
  useEffect(() => {
    const marcarOnline = () => setOnline(true);
    const marcarOffline = () => setOnline(false);
    window.addEventListener("online", marcarOnline);
    window.addEventListener("offline", marcarOffline);
    return () => {
      window.removeEventListener("online", marcarOnline);
      window.removeEventListener("offline", marcarOffline);
    };
  }, []);

  // ─── Carga de datos ─────────────────────────────────────────────────────
  // useCachedResource (lib/offlineCache.ts) muestra la última respuesta
  // guardada en localStorage para esa misma llave mientras el fetch nuevo
  // no resuelve o falla — así el mapa/guía/información no desaparecen con
  // mala señal ni al recargar la página.

  const localidades =
    useCachedResource<Localidad[]>(`localidades:${selectedCiudad}`, () =>
      getLocalidadesList(selectedCiudad)
    ) ?? EMPTY_LOCALIDADES;

  const todosLosBarriosGeo = useCachedResource<GeoJsonFeatureCollection<BarrioProperties>>(
    `barrios:${selectedCiudad}`,
    () => getBarriosGeoJson({ municipio: selectedCiudad })
  );

  const viasGeo = useCachedResource<GeoJsonFeatureCollection<ViaProperties>>(
    `vias:${selectedCiudad}`,
    () => getViasGeoJson({ municipio: selectedCiudad })
  );

  // Vías cercanas SOLO a la microrruta seleccionada — usadas exclusivamente
  // para las etiquetas de nombre de vía en el mapa (ver UsuariosMapa), que
  // no deben aparecer en ningún lado mientras no haya una microrruta
  // elegida. Llave null (sin fetch) cuando no hay selección.
  const viasMicrorrutaGeo = useCachedResource<GeoJsonFeatureCollection<ViaProperties>>(
    microrrutaSeleccionadaId !== null ? `vias-microrruta:${microrrutaSeleccionadaId}` : null,
    () => getViasGeoJson({ municipio: selectedCiudad, microrrutaId: microrrutaSeleccionadaId as number })
  );

  const recyclers =
    useCachedResource<Recycler[]>("recyclers", () => getRecyclers({}), [syncKey]) ??
    EMPTY_RECYCLERS;

  const microrrutasGeo = useCachedResource<MicrorrutasGeoJson>(
    `microrrutas:${selectedCiudad}:${selectedLocalidad}:${selectedBarrio}`,
    () =>
      getMicrorrutas({
        localidadCod: selectedLocalidad || undefined,
        barrioCod: selectedBarrio || undefined,
        municipio: selectedCiudad,
      }),
    [syncKey]
  );

  // Microrrutas SIN el filtro de localidad/barrio — solo para calcular
  // cuántas tiene cada uno y poder mostrar ese número y ordenarlos con las
  // que sí tienen rutas primero (mismo criterio que AdminMicrorrutas.tsx,
  // ver lib/microrrutaConteos.ts).
  const todasLasMicrorrutasGeo = useCachedResource<MicrorrutasGeoJson>(
    `microrrutas-todas:${selectedCiudad}`,
    () => getMicrorrutas({ municipio: selectedCiudad }),
    [syncKey]
  );

  // Direcciones/pólizas y guía de calles de la microrruta activa — llave
  // null mientras no hay ninguna seleccionada, para no disparar fetch ni
  // mostrar la caché de una microrruta distinta.
  const usuarios =
    useCachedResource<UsuarioMicrorrutaProperties[]>(
      microrrutaSeleccionadaId !== null ? `usuarios:${microrrutaSeleccionadaId}` : null,
      () => getUsuariosMicrorruta(microrrutaSeleccionadaId as number),
      [refreshUsuariosToken, syncKey]
    ) ?? EMPTY_USUARIOS;

  const guiaCalles =
    useCachedResource<GuiaCallesPaso[]>(
      microrrutaSeleccionadaId !== null ? `guia:${microrrutaSeleccionadaId}` : null,
      () => getGuiaCalles(microrrutaSeleccionadaId as number),
      [refreshUsuariosToken, syncKey]
    ) ?? EMPTY_GUIA;

  // ─── Derivados ──────────────────────────────────────────────────────────

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
    if (!selectedLocalidad && !selectedBarrio) return null;
    return { type: "FeatureCollection", features };
  }, [todosLosBarriosGeo, selectedLocalidad, selectedBarrio]);

  const microrrutasList = microrrutasGeo?.features?.map((f) => f.properties) ?? [];

  const todasLasMicrorrutas =
    todasLasMicrorrutasGeo?.features?.map((f) => f.properties) ?? EMPTY_MICRORRUTAS_PROPS;

  // Localidades/barrios con al menos una microrruta primero (orden
  // alfabético dentro de cada grupo), con el conteo listo para mostrar
  // junto al nombre — mismo criterio que AdminMicrorrutas.tsx.
  const conteosMicrorrutas = useMemo(
    () => calcularConteosMicrorrutas(todasLasMicrorrutas),
    [todasLasMicrorrutas]
  );
  const localidadesOrdenadas = useMemo(
    () =>
      ordenarPorConteo(
        localidades,
        conteosMicrorrutas.porLocalidad,
        (l) => l.identificador,
        (l) => l.nombre
      ),
    [localidades, conteosMicrorrutas]
  );
  const barriosOrdenados = useMemo(
    () =>
      ordenarPorConteo(
        barrios,
        conteosMicrorrutas.porBarrio,
        (b) => b.identificador,
        (b) => b.nombre_barrio
      ),
    [barrios, conteosMicrorrutas]
  );

  const trabajadorPorMicrorrutaId = useMemo(() => {
    const map = new Map<number, string>();
    recyclers.forEach((r) => {
      r.microrrutas.forEach((m) => {
        if (!map.has(m.id)) map.set(m.id, r.nombreCompleto);
      });
    });
    return map;
  }, [recyclers]);

  const microrrutaSeleccionada = microrrutasList.find((m) => m.id === microrrutaSeleccionadaId) ?? null;
  const geometriaSeleccionada = microrrutasGeo?.features.find(
    (f) => f.properties.id === microrrutaSeleccionadaId
  )?.geometry as LineStringGeoJson | undefined;

  const nombreTrabajadorSeleccionado = microrrutaSeleccionadaId
    ? (trabajadorPorMicrorrutaId.get(microrrutaSeleccionadaId) ?? "Sin asignar")
    : null;

  const tituloMapa = microrrutaSeleccionada
    ? `${microrrutaSeleccionada.nombre} - ${nombreTrabajadorSeleccionado}`
    : null;

  // Qué microrrutas exportar en el PDF: si hay una seleccionada, solo esa;
  // si no, todas las que ya deja ver la tabla/mapa según los filtros de
  // barrio/localidad activos (o todas las de la ciudad si no hay ninguno).
  const microrrutasParaExportar = useMemo<MicrorrutaParaReporte[]>(() => {
    if (microrrutaSeleccionada && geometriaSeleccionada) {
      return [{ properties: microrrutaSeleccionada, geometry: geometriaSeleccionada }];
    }
    return (
      microrrutasGeo?.features.map((f) => ({
        properties: f.properties,
        geometry: f.geometry as LineStringGeoJson,
      })) ?? []
    );
  }, [microrrutaSeleccionada, geometriaSeleccionada, microrrutasGeo]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleCiudadChange = (value: Municipio) => {
    setSelectedCiudad(value);
    setSelectedLocalidad("");
    setSelectedBarrio("");
    setMicrorrutaSeleccionadaId(null);
  };

  const handleLocalidadChange = (value: string) => {
    setSelectedLocalidad(value);
    setSelectedBarrio("");
  };

  const handleExportarPdf = async () => {
    if (microrrutasParaExportar.length === 0) return;

    let nombreArchivo = "todos";
    if (microrrutaSeleccionada) {
      nombreArchivo = microrrutaSeleccionada.nombre;
    } else if (selectedBarrio) {
      nombreArchivo = barrios.find((b) => b.identificador === selectedBarrio)?.nombre_barrio ?? selectedBarrio;
    } else if (selectedLocalidad) {
      nombreArchivo =
        localidades.find((l) => l.identificador === selectedLocalidad)?.nombre ?? selectedLocalidad;
    }

    setGenerandoPdf(true);
    try {
      await generarReporteUsuarios(microrrutasParaExportar, nombreArchivo);
    } catch (error) {
      console.error("Error generando el PDF de Usuarios:", error);
      alert("No se pudo generar el PDF. Si no tienes conexión, intenta de nuevo con señal.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Guías</h1>
          <p className="text-sm text-gray-500">
            Direcciones, pólizas y guía de calles por microrruta, para uso en campo.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportarPdf}
          disabled={microrrutasParaExportar.length === 0 || generandoPdf}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generandoPdf ? <FaSpinner className="animate-spin" /> : <FaFilePdf />}
          Exportar PDF
        </button>
      </div>

      {!online && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
          <FaWifi className="shrink-0" />
          Sin conexión — se muestra la última información guardada en este dispositivo. El mapa
          base puede verse en blanco en zonas sin cobertura.
        </div>
      )}

      {/* Filtros — apilados en móvil, en fila desde sm */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleCiudadChange("BARRANQUILLA")}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
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
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
              selectedCiudad === "PUERTO_COLOMBIA"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
            }`}
          >
            ⚓ Puerto Colombia
          </button>
        </div>

        {selectedCiudad === "BARRANQUILLA" && (
          <div>
            <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase">
              Localidad
            </label>
            <select
              value={selectedLocalidad}
              onChange={(e) => handleLocalidadChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none sm:w-auto"
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
            disabled={barrios.length === 0}
            onChange={(e) => setSelectedBarrio(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50 sm:w-auto"
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
      </div>

      {/* Mapa */}
      <UsuariosMapa
        localidadCod={selectedLocalidad || undefined}
        barrioCod={selectedBarrio || undefined}
        barriosGeoJson={barriosGeo}
        viasGeoJson={viasGeo}
        viasLabelGeoJson={viasMicrorrutaGeo}
        microrrutasGeoJson={microrrutasGeo}
        encuadreKey={`${selectedCiudad}|${selectedLocalidad}|${selectedBarrio}|${microrrutasGeo ? "cargado" : "cargando"}`}
        selectedMicrorrutaId={microrrutaSeleccionadaId}
        onSelectMicrorruta={(id) => setMicrorrutaSeleccionadaId(id)}
        titulo={tituloMapa}
      />

      {/* Información de la microrruta seleccionada — mismos campos que
          MicrorrutasTable.tsx (Nombre, Tipo, Fecha, Días, Trabajador, Barrio). */}
      {microrrutaSeleccionada ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase">
            <FaRoute className="text-emerald-600" />
            Información de la microrruta
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 md:grid-cols-6">
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase">Nombre</span>
              <span className="font-bold text-gray-900">{microrrutaSeleccionada.nombre}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase">Calle inicio</span>
              <span className="text-gray-700">{microrrutaSeleccionada.dirInicio || "—"}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase">Calle final</span>
              <span className="text-gray-700">{microrrutaSeleccionada.dirFin || "—"}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase">Días</span>
              <span className="text-gray-700">
                {formatearDiasFrecuenciaCorto(microrrutaSeleccionada.diasFrecuencia)}
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase">Trabajador</span>
              <span className="text-gray-700">{nombreTrabajadorSeleccionado}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase">Barrio</span>
              <span className="text-gray-700">
                {microrrutaSeleccionada.barrios.map((b) => b.barrioNombre).join(", ") || "—"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-400">
          Selecciona una microrruta en el mapa o en la tabla de abajo para ver su información, la
          guía de calles y sus direcciones/pólizas.
        </p>
      )}

      {/* Guía de calles */}
      {microrrutaSeleccionada && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500 uppercase">Guía de calles</h2>
          {guiaCalles.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">
              No hay una guía de calles calculada todavía para esta microrruta.
            </p>
          ) : (
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-gray-700">
              {guiaCalles.map((paso) => (
                <li key={paso.orden}>{paso.instruccion}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Acciones sobre direcciones/pólizas — ancho completo en móvil */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          disabled={!microrrutaSeleccionada}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <FaPlus /> Añadir Dirección y Póliza
        </button>
        <button
          type="button"
          onClick={() => setShowPreviewModal(true)}
          disabled={!microrrutaSeleccionada}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <FaListUl /> Previsualizar Direcciones y Pólizas
          {usuarios.length > 0 && (
            <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-white">
              {usuarios.length}
            </span>
          )}
        </button>
      </div>

      {/* Lista de microrrutas — igual que MicrorrutasTable.tsx. Las
          acciones de editar/eliminar/PDF de esa tabla son de gestión de
          microrrutas (fuera del alcance de esta página) y se dejan
          deshabilitadas; solo se usa para seleccionar la fila. */}
      <MicrorrutasTable
        microrrutas={microrrutasList}
        editingGeometriaId={null}
        disabled={true}
        generandoReporteId={null}
        selectedId={microrrutaSeleccionadaId}
        trabajadorPorMicrorrutaId={trabajadorPorMicrorrutaId}
        onEdit={() => {}}
        onEditGeometria={() => {}}
        onDelete={() => {}}
        onGenerarReporte={() => {}}
        onSelectRow={(mr) =>
          setMicrorrutaSeleccionadaId((prev) => (prev === mr.id ? null : mr.id))
        }
      />

      {showAddModal && microrrutaSeleccionadaId !== null && (
        <UsuarioMicrorrutaFormModal
          mode="create"
          microrrutaId={microrrutaSeleccionadaId}
          onClose={() => setShowAddModal(false)}
          onSaved={refreshUsuarios}
        />
      )}

      {showPreviewModal && microrrutaSeleccionada && (
        <UsuariosPreviewModal
          microrrutaNombre={microrrutaSeleccionada.nombre}
          usuarios={usuarios}
          onClose={() => setShowPreviewModal(false)}
          onChanged={refreshUsuarios}
        />
      )}
    </div>
  );
}
