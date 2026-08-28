// components/admin/RecyclersTable.tsx
import { FaEdit, FaUserSlash, FaUserCheck, FaSpinner, FaFilePdf } from "react-icons/fa";
import {
  CLASIFICACION_LABELS,
  CLASIFICACION_COLORS,
  type Recycler,
  type RecyclerTab,
} from "../../types/recycler";

interface RecyclersTableProps {
  recyclers: Recycler[];
  activeTab: RecyclerTab;
  togglingId: number | null;
  // id del reciclador cuyo certificado se está descargando (spinner en su
  // fila). null = ninguno en proceso.
  descargandoCertificadoId: number | null;
  onEdit: (recycler: Recycler) => void;
  onToggleCenso: (recycler: Recycler) => void;
  onDesvincular: (recycler: Recycler) => void;
  onReactivar: (recycler: Recycler) => void;
  onDescargarCertificado: (recycler: Recycler) => void;
}

export default function RecyclersTable({
  recyclers,
  activeTab,
  togglingId,
  descargandoCertificadoId,
  onEdit,
  onToggleCenso,
  onDesvincular,
  onReactivar,
  onDescargarCertificado,
}: RecyclersTableProps) {
  const isHistorico = activeTab === "desvinculados";

  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-sm ${
        isHistorico ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-gray-100 text-xs font-bold text-gray-500 uppercase">
            <tr>
              <th className="p-4">No.</th>
              <th className="p-4">Cédula</th>
              <th className="p-4">Nombre Completo</th>
              <th className="p-4">Clasificación</th>
              <th className="p-4">Barrios</th>
              <th className="p-4">Rutas</th>
              <th className="p-4 text-center">Censo</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recyclers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-400">
                  No hay recicladores en esta pestaña.
                </td>
              </tr>
            ) : (
              recyclers.map((r, index) => (
                <tr
                  key={r.id}
                  className={`transition ${isHistorico ? "text-gray-500" : "hover:bg-gray-50"}`}
                >
                  <td className="p-4 text-gray-400">{index + 1}</td>
                  <td className="p-4 font-mono text-xs font-bold text-gray-900">{r.cedula}</td>
                  <td className="p-4 font-medium text-gray-900">{r.nombreCompleto}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${CLASIFICACION_COLORS[r.clasificacion]}`}
                    >
                      {CLASIFICACION_LABELS[r.clasificacion]}
                    </span>
                  </td>
                  <td className="max-w-40 truncate p-4 text-xs text-gray-600">
                    {r.barrios.length > 0 ? (
                      r.barrios.map((b) => b.nombreBarrio || b.barrioId).join(", ")
                    ) : (
                      <span className="text-gray-300">Sin asignar</span>
                    )}
                  </td>
                  <td className="max-w-40 truncate p-4 text-xs text-gray-600">
                    {r.microrrutas.length > 0 ? (
                      r.microrrutas.map((m) => m.nombre).join(", ")
                    ) : (
                      <span className="text-gray-300">Sin asignar</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => onToggleCenso(r)}
                      disabled={isHistorico || togglingId === r.id}
                      title={r.censado ? "Censado" : "Sin censar"}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        r.censado ? "bg-emerald-600" : "bg-gray-300"
                      }`}
                    >
                      {togglingId === r.id ? (
                        <FaSpinner className="mx-auto animate-spin text-xs text-white" />
                      ) : (
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            r.censado ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      )}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-3">
                      {!isHistorico && (
                        <button
                          onClick={() => onEdit(r)}
                          title="Editar"
                          className="text-blue-600 transition hover:text-blue-800"
                        >
                          <FaEdit />
                        </button>
                      )}
                      <button
                        onClick={() => onDescargarCertificado(r)}
                        disabled={descargandoCertificadoId === r.id}
                        title="Descargar certificado de vinculación"
                        className="text-emerald-600 transition hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {descargandoCertificadoId === r.id ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaFilePdf />
                        )}
                      </button>
                      {isHistorico ? (
                        <button
                          onClick={() => onReactivar(r)}
                          title="Reactivar"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <FaUserCheck /> Reactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => onDesvincular(r)}
                          title="Desvincular"
                          className="text-red-600 transition hover:text-red-800"
                        >
                          <FaUserSlash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
