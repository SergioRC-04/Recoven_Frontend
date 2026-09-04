// components/admin/AdminRecyclers.tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  FaUsers,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserSlash,
  FaPlus,
  FaSearch,
  FaFileExcel,
  FaIdCard,
  FaSpinner,
} from "react-icons/fa";
import {
  getRecyclersByTab,
  toggleCenso,
  desvincularRecycler,
  reactivarRecycler,
  exportarCertificado,
  obtenerEstadoCertificadosGeneral,
  obtenerKpisRecyclers,
} from "../../services/recyclers";
import { descargarBlob } from "../../lib/descargarBlob";
import { RECYCLER_TABS, type Recycler, type RecyclerTab } from "../../types/recycler";
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

// Sondeo del estado del certificado general tras una mutación — cada
// cuánto se pregunta, y cuántas veces como máximo antes de rendirse (tope
// de seguridad si algo quedara atascado del lado del backend).
const CERTIFICADOS_POLL_INTERVAL_MS = 1500;
const CERTIFICADOS_POLL_MAX_INTENTOS = 20; // ~30s

export default function AdminRecyclers() {
  const [activeTab, setActiveTab] = useState<RecyclerTab>("todos");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  // "todos" no envía el parámetro censado; "censados"/"no_censados" sí,
  // como true/false — independiente de activeTab, los dos filtros se
  // combinan (p. ej. "Con ruta" + "Sin censar" a la vez).
  const [censoFilter, setCensoFilter] = useState<"todos" | "censados" | "no_censados">("todos");

  // null = cargando, [] o array con datos = cargado.
  // loading se deriva de recyclers === null para no llamar setState en el cuerpo del efecto.
  const [recyclers, setRecyclers] = useState<Recycler[] | null>(null);
  const loading = recyclers === null;

  // Conjunto de ids con el censo en proceso de cambiar — no un solo id,
  // para que tocar una fila mientras otra sigue en vuelo no le "robe" el
  // spinner a la primera (antes, con un solo togglingId, el segundo clic
  // sobrescribía al primero).
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [descargandoCertificadoId, setDescargandoCertificadoId] = useState<number | null>(null);
  const [editingRecycler, setEditingRecycler] = useState<EditingState>(null);
  const [mostrarExportar, setMostrarExportar] = useState(false);

  // Certificado general (combinado): urlCertificadosGeneral es la última
  // URL conocida — el botón "Exportar Certificados" solo la usa tal cual,
  // sin volver a pedir nada al backend en el momento del clic.
  // actualizandoCertificados se enciende justo después de CUALQUIER
  // cambio a un reciclador (crear, editar, censar, desvincular,
  // reactivar) — no al apretar el botón de exportar — y se sondea el
  // estado hasta que la regeneración en segundo plano del backend
  // termine. Ver iniciarEscuchaCertificados más abajo.
  const [urlCertificadosGeneral, setUrlCertificadosGeneral] = useState<string | null>(null);
  const [actualizandoCertificados, setActualizandoCertificados] = useState(false);
  const certificadosPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const certificadosPollIntentosRef = useRef(0);

  // KPIs derivados de "todos" + "desvinculados".
  const [kpis, setKpis] = useState({ total: 0, censados: 0, sinCensar: 0, desvinculados: 0 });

  // Contadores de refresco — incrementar para forzar una recarga sin pasar
  // funciones async como dependencias de useEffect.
  const [tableKey, setTableKey] = useState(0);
  const [kpisKey, setKpisKey] = useState(0);

  const refreshTable = () => setTableKey((k) => k + 1);
  const refreshKpis = () => setKpisKey((k) => k + 1);
  const refreshAll = () => {
    refreshTable();
    refreshKpis();
  };

  // Guardas contra respuestas obsoletas: como recovenApi.get no acepta un
  // AbortSignal, un AbortController no cancela la petición real — solo
  // marcaría un signal que nadie lee. En su lugar, cada efecto se identifica
  // con un número de "petición vigente"; si la respuesta llega después de
  // que el efecto ya cambió (otra pestaña, otra búsqueda, etc.), se descarta.
  const tableRequestIdRef = useRef(0);
  const kpisRequestIdRef = useRef(0);

  // Debounce del campo de búsqueda (400 ms).
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Tabla de recicladores — se recarga al cambiar tab, censoFilter, search
  // o tableKey. El orden estable (por nombre, no por updatedAt) lo
  // garantiza el backend (recyclers.service.ts findAll: orderBy
  // nombreCompleto asc) — así un refresh completo tras activar/desactivar
  // el censo no reordena la lista ni manda el registro tocado al principio.
  useEffect(() => {
    const requestId = ++tableRequestIdRef.current;
    const censado = censoFilter === "todos" ? undefined : censoFilter === "censados";

    getRecyclersByTab(activeTab, search || undefined, censado)
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
  }, [activeTab, search, censoFilter, tableKey]);

  // KPIs — se recargan al montar y cuando kpisKey cambia. Un solo
  // endpoint liviano (COUNT, sin barrios/microrrutas anidados) en vez de
  // las dos consultas completas que se usaban antes solo para contar —
  // esto es lo que hacía sentir lento cada toggle de censo: cada clic
  // disparaba la consulta de la tabla Y estas dos consultas pesadas a la
  // vez.
  useEffect(() => {
    const requestId = ++kpisRequestIdRef.current;

    obtenerKpisRecyclers()
      .then((data) => {
        if (kpisRequestIdRef.current !== requestId) return;
        setKpis(data);
      })
      .catch((err) => {
        if (kpisRequestIdRef.current !== requestId) return;
        console.error("Error cargando KPIs de recicladores:", err);
      });
  }, [kpisKey]);

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
  // segundo plano del backend termine (ver dispararRegeneracionReporteCertificados
  // en recyclers.service.ts) — eso es "estar a la escucha" de que
  // terminó, sin que el propio botón dispare ni espere nada él mismo.
  const iniciarEscuchaCertificados = () => {
    setActualizandoCertificados(true);
    detenerEscuchaCertificados();
    certificadosPollIntentosRef.current = 0;

    certificadosPollRef.current = setInterval(() => {
      certificadosPollIntentosRef.current += 1;
      if (certificadosPollIntentosRef.current > CERTIFICADOS_POLL_MAX_INTENTOS) {
        // Tope de seguridad: si algo quedó atascado del lado del backend
        // (el marcador nunca se quitó), no dejamos el botón bloqueado
        // para siempre — se reactiva igual, con la última URL conocida.
        setActualizandoCertificados(false);
        detenerEscuchaCertificados();
        return;
      }
      consultarEstadoCertificados();
    }, CERTIFICADOS_POLL_INTERVAL_MS);
  };

  // Estado inicial del certificado general al cargar la página — una sola
  // consulta, sin sondeo (no hay ninguna mutación en curso todavía). El
  // cleanup detiene cualquier sondeo que hubiera quedado activo si el
  // componente se desmonta a mitad de uno.
  useEffect(() => {
    // consultarEstadoCertificados es async y hace un await real (una
    // petición de red) antes de llamar a setState — es exactamente el
    // patrón "llamar a setState en un callback cuando el estado externo
    // cambia" que React recomienda para efectos que cargan datos, no un
    // setState síncrono dentro del efecto. El linter no distingue esto
    // porque la función está definida aparte y no puede rastrear que el
    // setState queda después del await.
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
      // recargar toda la tabla desde el backend (que sigue siendo
      // necesario cuando cambia un FILTRO, porque ahí sí cambia cuáles
      // filas deberían aparecer; aquí no cambia nada de eso).
      setRecyclers(
        (prev) =>
          prev?.map((r) => (r.id === recycler.id ? { ...r, censado: !r.censado } : r)) ?? prev
      );
      // Censados/Sin Censar sí cambian — pero esto ya es liviano
      // (obtenerKpisRecyclers), así que no hace falta evitarlo también.
      refreshKpis();
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
      refreshAll();
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
      refreshAll();
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

  // Se llama cuando el formulario (crear o editar) guarda con éxito —
  // además del refresh de siempre, "escucha" la regeneración del
  // certificado general que esa creación/edición disparó en el backend.
  const handleRecyclerSaved = () => {
    refreshAll();
    iniciarEscuchaCertificados();
  };

  // El botón solo abre la URL que ya se conoce (de la última consulta o
  // sondeo) — no llama al backend en el momento del clic. Mientras
  // actualizandoCertificados es true el botón está deshabilitado, así que
  // esto nunca se ejecuta con una URL a medio regenerar.
  const handleExportarCertificadosGeneral = () => {
    if (!urlCertificadosGeneral) return;
    window.open(urlCertificadosGeneral, "_blank");
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Activos"
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
          label="Sin Censar"
          value={kpis.sinCensar}
          icon={<FaExclamationTriangle />}
          accent="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Desvinculados"
          value={kpis.desvinculados}
          icon={<FaUserSlash />}
          accent="bg-red-50 text-red-600"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {RECYCLER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={censoFilter}
            onChange={(e) => setCensoFilter(e.target.value as "todos" | "censados" | "no_censados")}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="todos">Censo: todos</option>
            <option value="censados">Censados</option>
            <option value="no_censados">Sin censar</option>
          </select>
          <div className="relative">
            <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre o cédula..."
              className="rounded-xl border border-gray-300 py-2 pr-3 pl-8 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-400">Cargando recicladores...</div>
      ) : (
        <RecyclersTable
          recyclers={recyclers ?? []}
          activeTab={activeTab}
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
