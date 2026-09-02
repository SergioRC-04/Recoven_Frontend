import { useEffect, useState, useCallback } from "react";
import { fetchMetrics, saveMetric, deleteMetric } from "../../services/metrics";
import type { Metric, MetricPayload } from "../../types/metric";
import { FaEdit, FaTrash, FaPlus, FaSync } from "react-icons/fa";

const MONTHS_ORDER = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

type CampoMetrica = "aprovechamiento" | "rechazo";

export default function MetricsManager() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [editing, setEditing] = useState<{
    id: number;
    field: CampoMetrica;
    value: number;
  } | null>(null);
  // Borrador del formulario "agregar próximo mes", por sede — reemplaza los
  // inputs sin controlar que antes se leían con document.getElementById.
  // Hacía falta este cambio porque la tabla (desktop) y las tarjetas
  // (mobile) ahora coexisten en el DOM al mismo tiempo — una oculta con
  // CSS, no eliminada — así que no podían compartir el mismo id.
  const [nuevoMes, setNuevoMes] = useState<
    Record<string, { aprovechamiento: string; rechazo: string }>
  >({});

  const years = [2027, 2026, 2025, 2024];

  // ✅ Memorizar loadMetrics para que su referencia no cambie en cada render
  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMetrics();
      setMetrics(data.filter((m) => m.year === selectedYear));
    } catch (error) {
      console.error("Error cargando métricas:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  // ✅ Ahora loadMetrics es la dependencia, no selectedYear directamente
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMetrics();
  }, [loadMetrics]);

  const getSedeData = (sede: string) => {
    return metrics
      .filter((m) => m.sede === sede)
      .sort((a, b) => MONTHS_ORDER.indexOf(a.mes) - MONTHS_ORDER.indexOf(b.mes));
  };

  const handleSave = async (metric: Metric, field: CampoMetrica, value: number) => {
    try {
      const payload: MetricPayload = {
        year: metric.year,
        mes: metric.mes,
        sede: metric.sede,
        aprovechamiento: field === "aprovechamiento" ? value : metric.aprovechamiento,
        rechazo: field === "rechazo" ? value : metric.rechazo,
      };
      await saveMetric(payload);
      await loadMetrics();
      setEditing(null);
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Error al guardar los datos.");
    }
  };

  const handleDelete = async (metric: Metric) => {
    if (
      !confirm(
        `¿Eliminar los datos de ${metric.mes} (${metric.sede === "BARRANQUILLA" ? "Barranquilla" : "Puerto Colombia"})?`
      )
    )
      return;
    try {
      await deleteMetric(metric.sede, metric.mes, metric.year);
      await loadMetrics();
    } catch (error) {
      console.error("Error eliminando:", error);
      alert("Error al eliminar los datos.");
    }
  };

  const getNextMonth = (lastMonth: string | null) => {
    if (!lastMonth) return "Enero";
    const idx = MONTHS_ORDER.indexOf(lastMonth);
    if (idx === -1 || idx === MONTHS_ORDER.length - 1) return null;
    return MONTHS_ORDER[idx + 1];
  };

  const actualizarNuevoMes = (sede: string, campo: CampoMetrica, valor: string) => {
    setNuevoMes((prev) => ({
      ...prev,
      [sede]: { ...(prev[sede] ?? { aprovechamiento: "", rechazo: "" }), [campo]: valor },
    }));
  };

  const handleAgregarSiguienteMes = async (sede: string, nextMonth: string) => {
    const draft = nuevoMes[sede];
    const aprovechamiento = parseFloat(draft?.aprovechamiento ?? "");
    const rechazo = parseFloat(draft?.rechazo ?? "");
    if (isNaN(aprovechamiento) || isNaN(rechazo)) {
      alert("Complete ambos valores numéricos.");
      return;
    }
    await handleSave(
      {
        id: 0,
        mes: nextMonth,
        year: selectedYear,
        sede,
        aprovechamiento,
        rechazo,
        createdAt: "",
        updatedAt: "",
      } as Metric,
      "aprovechamiento",
      aprovechamiento
    );
    // Limpia el borrador solo de esta sede tras el intento de guardar.
    setNuevoMes((prev) => ({ ...prev, [sede]: { aprovechamiento: "", rechazo: "" } }));
  };

  const renderTable = (sede: string, label: string) => {
    const data = getSedeData(sede);
    const nextMonth = getNextMonth(data.length > 0 ? data[data.length - 1].mes : null);
    const draft = nuevoMes[sede] ?? { aprovechamiento: "", rechazo: "" };

    // Muestra el valor o el input de edición — usado tanto por la celda de
    // la tabla (desktop) como por la tarjeta (mobile), para no duplicar
    // esta lógica en dos lugares.
    const renderValorCampo = (metric: Metric, field: CampoMetrica) => {
      if (editing?.id === metric.id && editing.field === field) {
        return (
          <input
            type="number"
            step="0.01"
            defaultValue={metric[field]}
            onBlur={(e) => handleSave(metric, field, parseFloat(e.target.value))}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              handleSave(metric, field, parseFloat((e.target as HTMLInputElement).value))
            }
            className="w-full rounded border border-gray-300 px-2 py-1 text-right"
            autoFocus
          />
        );
      }
      return <span>{metric[field].toLocaleString("es-ES", { minimumFractionDigits: 2 })}</span>;
    };

    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-4">
          <h2 className="text-lg font-bold text-emerald-800">
            <i className="fas fa-building mr-2"></i> {label}
          </h2>
        </div>

        {/* Tabla normal — solo desde md hacia arriba */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Mes</th>
                <th className="px-4 py-3 text-right">Aprovechamiento (Ton)</th>
                <th className="px-4 py-3 text-right">Rechazo (Ton)</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">
                    No hay datos para este año
                  </td>
                </tr>
              ) : (
                data.map((metric) => (
                  <tr key={metric.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{metric.mes}</td>
                    <td className="px-4 py-3 text-right">
                      {renderValorCampo(metric, "aprovechamiento")}
                    </td>
                    <td className="px-4 py-3 text-right">{renderValorCampo(metric, "rechazo")}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          setEditing({
                            id: metric.id,
                            field: "aprovechamiento",
                            value: metric.aprovechamiento,
                          })
                        }
                        className="mr-2 text-blue-600 transition hover:text-blue-800"
                      >
                        <FaEdit />
                      </button>
                      <span className="text-xs text-gray-300">|</span>
                      <button
                        onClick={() => handleDelete(metric)}
                        className="ml-2 text-red-600 transition hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="border-t border-gray-200 bg-gray-50">
              <tr>
                <td className="px-4 py-3 font-medium text-gray-700">{nextMonth || "Completado"}</td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={draft.aprovechamiento}
                    onChange={(e) => actualizarNuevoMes(sede, "aprovechamiento", e.target.value)}
                    placeholder="Toneladas"
                    disabled={!nextMonth}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1 text-right text-sm focus:ring-emerald-500 disabled:opacity-50"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={draft.rechazo}
                    onChange={(e) => actualizarNuevoMes(sede, "rechazo", e.target.value)}
                    placeholder="Rechazo"
                    disabled={!nextMonth}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1 text-right text-sm focus:ring-emerald-500 disabled:opacity-50"
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => nextMonth && handleAgregarSiguienteMes(sede, nextMonth)}
                    disabled={!nextMonth}
                    className="text-emerald-600 transition hover:text-emerald-800 disabled:opacity-50"
                  >
                    <FaPlus className="text-xl" />
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Tarjetas — solo en mobile. Todas las columnas quedan visibles de
            entrada, sin scroll horizontal que esconda nada. */}
        <div className="divide-y divide-gray-100 md:hidden">
          {data.length === 0 ? (
            <p className="px-4 py-6 text-center text-gray-400">No hay datos para este año</p>
          ) : (
            data.map((metric) => (
              <div key={metric.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">{metric.mes}</span>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() =>
                        setEditing({
                          id: metric.id,
                          field: "aprovechamiento",
                          value: metric.aprovechamiento,
                        })
                      }
                      className="text-blue-600 transition hover:text-blue-800"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(metric)}
                      className="text-red-600 transition hover:text-red-800"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[11px] font-bold tracking-wide text-gray-400 uppercase">
                      Aprovechamiento (Ton)
                    </span>
                    {renderValorCampo(metric, "aprovechamiento")}
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold tracking-wide text-gray-400 uppercase">
                      Rechazo (Ton)
                    </span>
                    {renderValorCampo(metric, "rechazo")}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Tarjeta para agregar el próximo mes */}
          <div className="bg-gray-50 p-4">
            <p className="mb-2 text-sm font-bold text-gray-700">{nextMonth || "Completado"}</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.01"
                value={draft.aprovechamiento}
                onChange={(e) => actualizarNuevoMes(sede, "aprovechamiento", e.target.value)}
                placeholder="Aprovechamiento"
                disabled={!nextMonth}
                className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm disabled:opacity-50"
              />
              <input
                type="number"
                step="0.01"
                value={draft.rechazo}
                onChange={(e) => actualizarNuevoMes(sede, "rechazo", e.target.value)}
                placeholder="Rechazo"
                disabled={!nextMonth}
                className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => nextMonth && handleAgregarSiguienteMes(sede, nextMonth)}
              disabled={!nextMonth}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <FaPlus /> Agregar
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="py-10 text-center">Cargando métricas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-black text-gray-900">Actualizar Datos de Operaciones</h1>
        <p className="text-sm text-gray-500">
          Visualice y agregue métricas mensuales de toneladas aprovechadas y rechazadas.
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700">Año:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={loadMetrics}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-300"
        >
          <FaSync /> Refrescar
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {renderTable("BARRANQUILLA", "Barranquilla RECOVEN")}
        {renderTable("PUERTO COLOMBIA", "Puerto Colombia RECOVEN")}
      </div>
    </div>
  );
}
