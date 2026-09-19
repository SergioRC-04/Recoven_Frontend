// components/admin/AdminRecyclers.tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaRoute,
  FaBan,
  FaPlus,
  FaSearch,
  FaEraser,
  FaFileExcel,
  FaIdCard,
  FaSpinner,
} from "react-icons/fa";
import {
  getRecyclers,
  toggleCenso,
  desvincularRecycler,
  reactivarRecycler,
  exportarCertificado,
  obtenerEstadoCertificadosGeneral,
} from "../../services/recyclers";
import { getBarriosList } from "../../services/geo";
import { descargarBlob } from "../../lib/descargarBlob";
import { CLASIFICACION_LABELS, type Recycler, type Clasificacion } from "../../types/recycler";
import type { Barrio, Municipio } from "../../types/geo";
import RecyclersTable from "./RecyclersTable";
import RecyclerFormModal from "./RecyclerFormModal";
import ExportarRecyclersModal from "./ExportarRecyclersModal";

interface KpiCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  accent: string;
}

function KpiCard({ label, value, icon, accent }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold tracking-wider text-gray-400 uppercase">{label}</p>
          <p className="mt-1 text-3xl font-black text-gray-900">{value}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full text-lg ${accent}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

type EditingState = Recycler | "new" | null;
type EstadoFiltro = "activos" | "desvinculados";
type RutasFiltro = "" | "con_ruta" | "sin_ruta";
type CensoFiltro = "todos" | "censados" | "no_censados";

// Sondeo del estado del certificado general tras una mutación — cada
// cuánto se pregunta, y cuántas veces como máximo antes de rendirse (tope
// de seguridad si algo quedara atascado del lado del backend).
const CERTIFICADOS_POLL_INTERVAL_MS = 1500;
const CERTIFICADOS_POLL_MAX_INTENTOS = 20; // ~30s

export default function AdminRecyclers() {
  // Cinco dimensiones de filtro, independientes y combinables entre sí —
  // reemplazan a las antiguas pestañas (una sola, excluyente) por
  // selects, tal como se pidió. "" o "todos" significa "sin filtrar por
  // esta dimensión".
  // El filtro más amplio de los seis, y el primero visualmente — mismo
  // concepto Y mismo estilo (pestañas, siempre una activa, sin "Todas")
  // que en AdminMicrorrutas.tsx: Barranquilla se divide en localidades/
  // barrios; Puerto Colombia hoy es una sola "localidad" que cubre todo
  // el municipio, así que combinar ambas ciudades no aporta una vista
  // coherente igual que allá.
  // "SIN_CIUDAD": un reciclador no tiene ciudad propia, se deduce de sus
  // barrios (Recycler -> RecyclerBarrio -> Barrio -> Localidad.municipio),
  // así que los que no tienen ningún barrio no caen en ninguna ciudad y
  // se ven en esta pestaña aparte.
  const [ciudadFiltro, setCiudadFiltro] = useState<Municipio | "SIN_CIUDAD">("BARRANQUILLA");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("activos");
  const [rutasFiltro, setRutasFiltro] = useState<RutasFiltro>("");
  const [clasificacionFiltro, setClasificacionFiltro] = useState<Clasificacion | "">("");
  const [censoFiltro, setCensoFiltro] = useState<CensoFiltro>("todos");
  const [barrioFiltro, setBarrioFiltro] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Barrios para el select de filtro — carga única al montar, igual que
  // en AdminMicrorrutas.tsx.
  const [barrios, setBarrios] = useState<Barrio[]>([]);

  // null = cargando, [] o array con datos = cargado.
  const [recyclers, setRecyclers] = useState<Recycler[] | null>(null);
  const loading = recyclers === null;

  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [descargandoCertificadoId, setDescargandoCertificadoId] = useState<number | null>(null);
  const [editingRecycler, setEditingRecycler] = useState<EditingState>(null);
  const [mostrarExportar, setMostrarExportar] = useState(false);

  const [urlCertificadosGeneral, setUrlCertificadosGeneral] = useState<string | null>(null);
  const [actualizandoCertificados, setActualizandoCertificados] = useState(false);
  const certificadosPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const certificadosPollIntentosRef = useRef(0);

  // Contador de refresco — incrementar fuerza una recarga de la tabla sin
  // pasar una función async como dependencia de useEffect. Ya no hace
  // falta un contador aparte para KPIs: se calculan derivados de
  // `recyclers` (ver más abajo), así que se actualizan solos cada vez que
  // la tabla lo hace.
  const [tableKey, setTableKey] = useState(0);
  const refresh = () => setTableKey((k) => k + 1);

  // Cambiar de ciudad limpia barrioFiltro, en el mismo evento (no en un
  // efecto aparte) — un barrio de Barranquilla no existe al ver Puerto
  // Colombia y viceversa. Mismo criterio que handleLocalidadChange en
  // AdminMicrorrutas.tsx: la derivación es síncrona, así que vive en el
  // handler que la origina, no en un useEffect.
  const handleCiudadChange = (value: Municipio | "SIN_CIUDAD") => {
    setCiudadFiltro(value);
    setBarrioFiltro("");
  };

  const tableRequestIdRef = useRef(0);

  // Debounce del campo de búsqueda (400 ms).
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Barrios para el filtro — se recarga al cambiar de ciudad. En
  // "SIN_CIUDAD" no se pide nada: por definición esos recicladores no
  // tienen barrios, y el select de barrio se deshabilita más abajo.
  useEffect(() => {
    if (ciudadFiltro === "SIN_CIUDAD") return;
    getBarriosList(undefined, ciudadFiltro)
      .then((data) => {
        const ordenados = [...data].sort((a, b) =>
          a.nombre_barrio.localeCompare(b.nombre_barrio, "es")
        );
        setBarrios(ordenados);
      })
      .catch((err) => console.error("Error cargando barrios para el filtro:", err));
  }, [ciudadFiltro]);

  // Tabla de recicladores — se recarga al cambiar cualquiera de las cinco
  // dimensiones de filtro o tableKey. Las cinco viajan combinadas en la
  // misma consulta (AND), no una a la vez como las pestañas antiguas.
  useEffect(() => {
    const requestId = ++tableRequestIdRef.current;

    getRecyclers({
      desvinculados: estadoFiltro === "desvinculados",
      rutas: rutasFiltro || undefined,
      clasificacion: clasificacionFiltro || undefined,
      censado: censoFiltro === "todos" ? undefined : censoFiltro === "censados",
      barrioId: barrioFiltro || undefined,
      municipio: ciudadFiltro,
      search: search || undefined,
    })
      .then((data) => {
        if (tableRequestIdRef.current !== requestId) return; // respuesta obsoleta, se ignora
        setRecyclers(data);
      })
      .catch((err) => {
        if (tableRequestIdRef.current !== requestId) return;
        console.error("Error cargando recicladores:", err);
        setRecyclers([]);
      });

    return () => {
      setRecyclers(null); // → loading = true durante el siguiente fetch
    };
  }, [
    ciudadFiltro,
    estadoFiltro,
    rutasFiltro,
    clasificacionFiltro,
    censoFiltro,
    barrioFiltro,
    search,
    tableKey,
  ]);

  // KPIs derivados de la lista YA filtrada — no un fetch aparte. Esto es
  // justamente lo que hace que "obedezcan a los filtros": si el filtro
  // activo deja 50 personas, recyclers tiene 50 elementos, y estos cinco
  // números salen de contar sobre ese mismo array. Se recalculan solos
  // cada vez que recyclers cambia (incluida la actualización local
  // optimista de handleToggleCenso), sin necesidad de un refresco aparte.
  const kpis = {
    total: recyclers?.length ?? 0,
    censados: recyclers?.filter((r) => r.censado).length ?? 0,
    noCensados: recyclers?.filter((r) => !r.censado).length ?? 0,
    conRutas: recyclers?.filter((r) => r.microrrutas.length > 0).length ?? 0,
    sinRutas: recyclers?.filter((r) => r.microrrutas.length === 0).length ?? 0,
  };

  // Detiene el sondeo (si había uno en curso) — se llama tanto al
  // terminar exitosamente como al desmontar el componente.
  const detenerEscuchaCertificados = () => {
    if (certificadosPollRef.current) {
      clearInterval(certificadosPollRef.current);
      certificadosPollRef.current = null;
    }
  };

  // Una sola consulta de estado — la usa tanto la carga inicial (una vez,
  // sin sondeo) como cada "tick" del sondeo tras una mutación.
  const consultarEstadoCertificados = async () => {
    try {
      const estado = await obtenerEstadoCertificadosGeneral();
      if (estado.url) setUrlCertificadosGeneral(estado.url);
      if (!estado.actualizando) {
        setActualizandoCertificados(false);
        detenerEscuchaCertificados();
      }
    } catch (err) {
      console.error("Error consultando el estado del certificado general:", err);
    }
  };

  // Se llama justo después de CUALQUIER cambio a un reciclador (crear,
  // editar, censar, desvincular, reactivar) — no al apretar el botón de
  // exportar. Pone el botón "Exportar Certificados" en estado
  // "Actualizando..." y sondea el estado hasta que la regeneración en
  // segundo plano del backend termine — eso es "estar a la escucha" de
  // que terminó, sin que el propio botón dispare ni espere nada él mismo.
  const iniciarEscuchaCertificados = () => {
    setActualizandoCertificados(true);
    detenerEscuchaCertificados();
    certificadosPollIntentosRef.current = 0;

    certificadosPollRef.current = setInterval(() => {
      certificadosPollIntentosRef.current += 1;
      if (certificadosPollIntentosRef.current > CERTIFICADOS_POLL_MAX_INTENTOS) {
        setActualizandoCertificados(false);
        detenerEscuchaCertificados();
        return;
      }
      consultarEstadoCertificados();
    }, CERTIFICADOS_POLL_INTERVAL_MS);
  };

  // Estado inicial del certificado general al cargar la página — una sola
  // consulta, sin sondeo.
  useEffect(() => {
    // consultarEstadoCertificados es async y hace un await real (una
    // petición de red) antes de llamar a setState — no un setState
    // síncrono dentro del efecto. El linter no distingue esto porque la
    // función está definida aparte.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    consultarEstadoCertificados();
    return () => detenerEscuchaCertificados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleCenso = async (recycler: Recycler) => {
    setTogglingIds((prev) => new Set(prev).add(recycler.id));
    try {
      await toggleCenso(recycler.id);
      // Solo esa fila cambió — se actualiza en el estado local en vez de
      // recargar toda la tabla desde el backend. Los KPIs de censo se
      // recalculan solos, al ser derivados de este mismo array.
      setRecyclers(
        (prev) =>
          prev?.map((r) => (r.id === recycler.id ? { ...r, censado: !r.censado } : r)) ?? prev
      );
      iniciarEscuchaCertificados();
    } catch (error) {
      console.error("Error actualizando censo:", error);
      alert("No se pudo actualizar el estado de censo.");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(recycler.id);
        return next;
      });
    }
  };

  const handleDesvincular = async (recycler: Recycler) => {
    if (
      !confirm(
        `¿Desvincular a ${recycler.nombreCompleto}? Pasará al histórico y dejará de aparecer en las rutas activas.`
      )
    )
      return;
    try {
      await desvincularRecycler(recycler.id);
      refresh();
      iniciarEscuchaCertificados();
    } catch (error) {
      console.error("Error desvinculando reciclador:", error);
      alert("No se pudo desvincular al reciclador.");
    }
  };

  const handleReactivar = async (recycler: Recycler) => {
    if (!confirm(`¿Reactivar a ${recycler.nombreCompleto}?`)) return;
    try {
      await reactivarRecycler(recycler.id);
      refresh();
      iniciarEscuchaCertificados();
    } catch (error) {
      console.error("Error reactivando reciclador:", error);
      alert("No se pudo reactivar al reciclador.");
    }
  };

  const handleDescargarCertificado = async (recycler: Recycler) => {
    setDescargandoCertificadoId(recycler.id);
    try {
      const blob = await exportarCertificado(recycler.id);
      descargarBlob(blob, `certificado-${recycler.nombreCompleto.replace(/\s+/g, "_")}.pdf`);
    } catch (error) {
      console.error("Error descargando certificado:", error);
      alert("No se pudo descargar el certificado.");
    } finally {
      setDescargandoCertificadoId(null);
    }
  };

  const handleRecyclerSaved = () => {
    refresh();
    iniciarEscuchaCertificados();
  };

  const handleExportarCertificadosGeneral = () => {
    if (!urlCertificadosGeneral) return;
    window.open(urlCertificadosGeneral, "_blank");
  };

  const hayFiltrosActivos =
    estadoFiltro !== "activos" ||
    rutasFiltro !== "" ||
    clasificacionFiltro !== "" ||
    censoFiltro !== "todos" ||
    barrioFiltro !== "" ||
    searchInput !== "";

  const handleLimpiarFiltros = () => {
    setEstadoFiltro("activos");
    setRutasFiltro("");
    setClasificacionFiltro("");
    setCensoFiltro("todos");
    setBarrioFiltro("");
    setSearchInput("");
    setSearch("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Recicladores</h1>
          <p className="text-sm text-gray-500">
            Censo, clasificación y asignación de rutas de los recicladores de oficio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarExportar(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200"
          >
            <FaFileExcel /> Exportar Tablas
          </button>
          <button
            onClick={handleExportarCertificadosGeneral}
            disabled={actualizandoCertificados || !urlCertificadosGeneral}
            title={
              actualizandoCertificados
                ? "Regenerando el certificado general con el último cambio..."
                : "Descargar un solo PDF con el certificado de cada reciclador activo"
            }
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actualizandoCertificados ? <FaSpinner className="animate-spin" /> : <FaIdCard />}
            {actualizandoCertificados ? "Actualizando certificados..." : "Exportar Certificados"}
          </button>
          <button
            onClick={() => setEditingRecycler("new")}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <FaPlus /> Nuevo Reciclador
          </button>
        </div>
      </div>

      {mostrarExportar && <ExportarRecyclersModal onClose={() => setMostrarExportar(false)} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Total"
          value={kpis.total}
          icon={<FaUsers />}
          accent="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          label="Censados"
          value={kpis.censados}
          icon={<FaCheckCircle />}
          accent="bg-blue-50 text-blue-600"
        />
        <KpiCard
          label="No Censados"
          value={kpis.noCensados}
          icon={<FaTimesCircle />}
          accent="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Con Rutas"
          value={kpis.conRutas}
          icon={<FaRoute />}
          accent="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          label="Sin Rutas"
          value={kpis.sinRutas}
          icon={<FaBan />}
          accent="bg-red-50 text-red-600"
        />
      </div>

      {/* Ciudad — pestañas separadas del panel de filtros, mismo criterio
          y mismo estilo que en AdminMicrorrutas.tsx (y que el mapa
          público, MapaServicios.tsx): los datos de Barranquilla y Puerto
          Colombia nunca se mezclan, así que no es "un filtro más"
          combinable con los demás, sino una sección completa aparte.
          Siempre hay una ciudad activa. */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => handleCiudadChange("BARRANQUILLA")}
          disabled={loading}
          className={`rounded-t-xl px-6 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            ciudadFiltro === "BARRANQUILLA"
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
          }`}
        >
          📍 Barranquilla
        </button>
        <button
          type="button"
          onClick={() => handleCiudadChange("PUERTO_COLOMBIA")}
          disabled={loading}
          className={`rounded-t-xl px-6 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            ciudadFiltro === "PUERTO_COLOMBIA"
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
          }`}
        >
          ⚓ Puerto Colombia
        </button>
        <button
          type="button"
          onClick={() => handleCiudadChange("SIN_CIUDAD")}
          disabled={loading}
          title="Recicladores sin ningún barrio asignado"
          className={`rounded-t-xl px-6 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            ciudadFiltro === "SIN_CIUDAD"
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
          }`}
        >
          ❔ Sin ciudad
        </button>
      </div>

      {/* Filtros — cinco dimensiones independientes (select) + búsqueda de
          texto libre, en vez de las antiguas pestañas excluyentes. */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase">
            Estado
          </label>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as EstadoFiltro)}
            className="mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="activos">Activos</option>
            <option value="desvinculados">Desvinculados (Histórico)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase">
            Filtrar Rutas
          </label>
          <select
            value={rutasFiltro}
            onChange={(e) => setRutasFiltro(e.target.value as RutasFiltro)}
            className="mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">Todas</option>
            <option value="con_ruta">Con ruta</option>
            <option value="sin_ruta">Sin ruta</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase">
            Clasificación
          </label>
          <select
            value={clasificacionFiltro}
            onChange={(e) => setClasificacionFiltro(e.target.value as Clasificacion | "")}
            className="mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">Todas</option>
            {Object.entries(CLASIFICACION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase">
            Censo
          </label>
          <select
            value={censoFiltro}
            onChange={(e) => setCensoFiltro(e.target.value as CensoFiltro)}
            className="mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="todos">Todos</option>
            <option value="censados">Censados</option>
            <option value="no_censados">Sin censar</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase">
            Barrio
          </label>
          <select
            value={barrioFiltro}
            onChange={(e) => setBarrioFiltro(e.target.value)}
            disabled={ciudadFiltro === "SIN_CIUDAD" || barrios.length === 0}
            className="mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
          >
            <option value="">Todos</option>
            {(ciudadFiltro === "SIN_CIUDAD" ? [] : barrios).map((b) => (
              <option key={b.identificador} value={b.identificador}>
                {b.nombre_barrio}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase">
            Buscar
          </label>
          <FaSearch className="absolute top-1/2 left-3 mt-0.5 -translate-y-1/2 text-xs text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Nombre, cédula, barrio o ruta..."
            className="mt-1 rounded-xl border border-gray-300 py-2 pr-3 pl-8 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={handleLimpiarFiltros}
          disabled={!hayFiltrosActivos}
          title="Limpiar filtros"
          aria-label="Limpiar filtros"
          className="inline-flex items-center justify-center rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FaEraser />
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-400">Cargando recicladores...</div>
      ) : (
        <RecyclersTable
          recyclers={recyclers ?? []}
          isHistorico={estadoFiltro === "desvinculados"}
          togglingIds={togglingIds}
          descargandoCertificadoId={descargandoCertificadoId}
          onEdit={setEditingRecycler}
          onToggleCenso={handleToggleCenso}
          onDesvincular={handleDesvincular}
          onReactivar={handleReactivar}
          onDescargarCertificado={handleDescargarCertificado}
        />
      )}

      {editingRecycler === "new" && (
        <RecyclerFormModal
          mode="create"
          onClose={() => setEditingRecycler(null)}
          onSaved={handleRecyclerSaved}
        />
      )}
      {editingRecycler && editingRecycler !== "new" && (
        <RecyclerFormModal
          mode="edit"
          recycler={editingRecycler}
          onClose={() => setEditingRecycler(null)}
          onSaved={handleRecyclerSaved}
        />
      )}
    </div>
  );
}
