// components/admin/ExportarRecyclersModal.tsx
import { useState } from "react";
import { FaTimes, FaFileExcel, FaSpinner } from "react-icons/fa";
import { exportarRecyclers } from "../../services/recyclers";
import { TIPOS_EXPORT_RECYCLERS, type TipoExportRecyclers } from "../../types/recycler";

interface ExportarRecyclersModalProps {
  onClose: () => void;
}

/**
 * Modal con los 6 reportes de recicladores exportables en Excel (con
 * colores de Censo/Rutas/Clasificación aplicados en el backend). Cada
 * botón dispara su propia descarga; se bloquean entre sí mientras una está
 * en curso, para no lanzar varias generaciones de Excel a la vez.
 */
export default function ExportarRecyclersModal({ onClose }: ExportarRecyclersModalProps) {
  const [exportando, setExportando] = useState<TipoExportRecyclers | null>(null);

  const handleExportar = async (tipo: TipoExportRecyclers) => {
    setExportando(tipo);
    try {
      const blob = await exportarRecyclers(tipo);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recicladores-${tipo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error exportando recicladores (${tipo}):`, error);
      alert("No se pudo generar el archivo.");
    } finally {
      setExportando(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Exportar recicladores</h2>
            <p className="mt-1 text-xs text-gray-500">Descarga en Excel, con colores por estado.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {TIPOS_EXPORT_RECYCLERS.map((op) => (
            <button
              key={op.tipo}
              onClick={() => handleExportar(op.tipo)}
              disabled={exportando !== null}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exportando === op.tipo ? <FaSpinner className="animate-spin" /> : <FaFileExcel />}
              {op.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
