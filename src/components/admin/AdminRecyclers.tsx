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
} from "react-icons/fa";
import {
  getRecyclersByTab,
  toggleCenso,
  desvincularRecycler,
  reactivarRecycler,
} from "../../services/recyclers";
import { RECYCLER_TABS, type Recycler, type RecyclerTab } from "../../types/recycler";
import RecyclersTable from "./RecyclersTable";
import RecyclerFormModal from "./RecyclerFormModal";
import ExportarRecyclersModal from "./ExportarRecyclersModal";
import ExportarCertificadoModal from "./ExportarCertificadoModal";

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

export default function AdminRecyclers() {
  const [activeTab, setActiveTab] = useState<RecyclerTab>("todos");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // null = cargando, [] o array con datos = cargado.
  // loading se deriva de recyclers === null para no llamar setState en el cuerpo del efecto.
  const [recyclers, setRecyclers] = useState<Recycler[] | null>(null);
  const loading = recyclers === null;

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [editingRecycler, setEditingRecycler] = useState<EditingState>(null);
  const [mostrarExportar, setMostrarExportar] = useState(false);
  const [mostrarExportarCertificado, setMostrarExportarCertificado] = useState(false);

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

  // Tabla de recicladores — se recarga al cambiar tab, search o tableKey.
  // El orden estable (por nombre, no por updatedAt) lo garantiza el
  // backend (recyclers.service.ts findAll: orderBy nombreCompleto asc) —
  // así un refresh completo tras activar/desactivar el censo no reordena
  // la lista ni manda el registro tocado al principio.
  useEffect(() => {
    const requestId = ++tableRequestIdRef.current;

    getRecyclersByTab(activeTab, search || undefined)
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
  }, [activeTab, search, tableKey]);

  // KPIs — se recargan al montar y cuando kpisKey cambia.
  useEffect(() => {
    const requestId = ++kpisRequestIdRef.current;

    Promise.all([getRecyclersByTab("todos"), getRecyclersByTab("desvinculados")])
      .then(([todos, desvinculados]) => {
        if (kpisRequestIdRef.current !== requestId) return;
        const censados = todos.filter((r) => r.censado).length;
        setKpis({
          total: todos.length,
          censados,
          sinCensar: todos.length - censados,
          desvinculados: desvinculados.length,
        });
      })
      .catch((err) => {
        if (kpisRequestIdRef.current !== requestId) return;
        console.error("Error cargando KPIs de recicladores:", err);
      });
  }, [kpisKey]);

  const handleToggleCenso = async (recycler: Recycler) => {
    setTogglingId(recycler.id);
    try {
      await toggleCenso(recycler.id);
      refreshAll();
    } catch (error) {
      console.error("Error actualizando censo:", error);
      alert("No se pudo actualizar el estado de censo.");
    } finally {
      setTogglingId(null);
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
    } catch (error) {
      console.error("Error reactivando reciclador:", error);
      alert("No se pudo reactivar al reciclador.");
    }
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
            <FaFileExcel /> Exportar
          </button>
          <button
            onClick={() => setMostrarExportarCertificado(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200"
          >
            <FaIdCard /> Exportar certificado
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
      {mostrarExportarCertificado && (
        <ExportarCertificadoModal onClose={() => setMostrarExportarCertificado(false)} />
      )}

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

      {loading ? (
        <div className="py-10 text-center text-gray-400">Cargando recicladores...</div>
      ) : (
        <RecyclersTable
          recyclers={recyclers ?? []}
          activeTab={activeTab}
          togglingId={togglingId}
          onEdit={setEditingRecycler}
          onToggleCenso={handleToggleCenso}
          onDesvincular={handleDesvincular}
          onReactivar={handleReactivar}
        />
      )}

      {editingRecycler === "new" && (
        <RecyclerFormModal
          mode="create"
          onClose={() => setEditingRecycler(null)}
          onSaved={refreshAll}
        />
      )}
      {editingRecycler && editingRecycler !== "new" && (
        <RecyclerFormModal
          mode="edit"
          recycler={editingRecycler}
          onClose={() => setEditingRecycler(null)}
          onSaved={refreshAll}
        />
      )}
    </div>
  );
}
