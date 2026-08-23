// components/admin/MicrorrutasTable.tsx
import {
  FaEdit,
  FaTrash,
  FaDrawPolygon,
  FaCheckCircle,
  FaFilePdf,
  FaSpinner,
} from "react-icons/fa";
import {
  TIPO_MICRORRUTA_LABELS,
  TIPO_BARRIDO_LABELS,
  type MicrorrutaProperties,
} from "../../types/microrruta";

interface MicrorrutasTableProps {
  microrrutas: MicrorrutaProperties[];
  editingGeometriaId: number | null;
  disabled: boolean;
  // id de la microrruta cuyo PDF se está generando actualmente (muestra un
  // spinner en su fila). null = ninguna en proceso.
  generandoReporteId: number | null;
  onEdit: (microrruta: MicrorrutaProperties) => void;
  onEditGeometria: (microrruta: MicrorrutaProperties) => void;
  onDelete: (microrruta: MicrorrutaProperties) => void;
  onGenerarReporte: (microrruta: MicrorrutaProperties) => void;
}

export default function MicrorrutasTable({
  microrrutas,
  editingGeometriaId,
  disabled,
  generandoReporteId,
  onEdit,
  onEditGeometria,
  onDelete,
  onGenerarReporte,
}: MicrorrutasTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
            <tr>
              <th className="p-4">Nombre</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Barrido</th>
              <th className="p-4">Fecha</th>
              <th className="p-4">Frecuencia</th>
              <th className="p-4 text-right">Longitud</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {microrrutas.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400">
                  No hay microrrutas registradas con este filtro.
                </td>
              </tr>
            ) : (
              microrrutas.map((mr) => {
                const isEditingThis = editingGeometriaId === mr.id;
                return (
                  <tr
                    key={mr.id}
                    className={`transition ${isEditingThis ? "bg-amber-50/70" : "hover:bg-gray-50"}`}
                  >
                    <td className="p-4 font-bold text-gray-900">{mr.nombre}</td>
                    <td className="p-4">
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                        {TIPO_MICRORRUTA_LABELS[mr.tipo] ?? mr.tipo}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">
                      {TIPO_BARRIDO_LABELS[mr.tipoBarrido] ?? mr.tipoBarrido}
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {new Date(mr.fechaOperacion).toLocaleDateString("es-CO")}
                    </td>
                    <td className="p-4 text-gray-600">
                      {mr.frecuencia}x — {mr.diasFrecuencia}
                    </td>
                    <td className="p-4 text-right font-mono text-xs text-gray-500">
                      {mr.longitudKm != null
                        ? `${parseFloat(String(mr.longitudKm)).toFixed(2)} km`
                        : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => onEdit(mr)}
                          disabled={disabled}
                          title="Editar datos"
                          className="text-blue-600 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => onEditGeometria(mr)}
                          disabled={disabled}
                          title="Editar trazo en el mapa"
                          className={`transition hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-40 ${
                            isEditingThis ? "text-amber-700" : "text-amber-500"
                          }`}
                        >
                          {isEditingThis ? <FaCheckCircle /> : <FaDrawPolygon />}
                        </button>
                        <span className="text-xs text-gray-300">|</span>
                        <button
                          onClick={() => onDelete(mr)}
                          disabled={disabled}
                          title="Eliminar"
                          className="text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <FaTrash />
                        </button>
                        <span className="text-xs text-gray-300">|</span>
                        <button
                          onClick={() => onGenerarReporte(mr)}
                          disabled={disabled || generandoReporteId === mr.id}
                          title="Generar hoja de ruta (PDF)"
                          className="text-emerald-600 transition hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {generandoReporteId === mr.id ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <FaFilePdf />
                          )}
                        </button>
                        {/* Espacio reservado para el segundo documento exportable
                            (pendiente de definir). Agregar aquí un botón más,
                            mismo patrón que el de arriba. */}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
