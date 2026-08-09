// components/admin/PqrsdfTable.tsx
import { useEffect, useState } from "react";
import { listarPqrsdf } from "../../services/pqrsdf";
import type { Pqrsdf, EstadoPqrsdf } from "../../types/pqrsdf";
import { TIPO_LABELS, ESTADO_LABELS, ESTADO_COLORS } from "../../types/pqrsdf";
import { FaEye } from "react-icons/fa";
import PqrsdfDetailModal from "./PqrsdfDetailModal";

export default function PqrsdfTable() {
  const [data, setData] = useState<Pqrsdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Pqrsdf | null>(null);
  const [filterEstado, setFilterEstado] = useState<EstadoPqrsdf | "TODOS">("TODOS");

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await listarPqrsdf();
      setData(list);
    } catch (error) {
      console.error("Error cargando PQRSDF:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const filteredData =
    filterEstado === "TODOS" ? data : data.filter((item) => item.estado === filterEstado);

  if (loading) {
    return <div className="py-10 text-center">Cargando solicitudes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Gestión de PQRSDF</h1>
          <p className="text-sm text-gray-500">Audite y responda las solicitudes ciudadanas.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700">Filtrar por estado:</label>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as EstadoPqrsdf | "TODOS")}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="TODOS">Todos</option>
            <option value="RECIBIDO">Recibido</option>
            <option value="EN_TRAMITE">En trámite</option>
            <option value="RESUELTO">Resuelto</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
              <tr>
                <th className="p-4">Radicado</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Peticionario</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Asunto</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-400">
                    No hay solicitudes registradas con este filtro.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="transition hover:bg-gray-50">
                    <td className="p-4 font-mono text-xs font-bold text-gray-900">
                      {item.radicado}
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString("es-CO")}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{item.nombreCompleto}</div>
                      <div className="text-xs text-gray-400">{item.numeroIdentificacion}</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                        {TIPO_LABELS[item.tipo]}
                      </span>
                    </td>
                    <td className="max-w-40 truncate p-4 text-gray-700">{item.asunto}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${ESTADO_COLORS[item.estado]}`}
                      >
                        {ESTADO_LABELS[item.estado]}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <FaEye /> Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedItem && (
        <PqrsdfDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
