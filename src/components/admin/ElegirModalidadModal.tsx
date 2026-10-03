// components/admin/ElegirModalidadModal.tsx
//
// Primer paso tras terminar de trazar una microrruta nueva: a pie o en
// camión. Hace falta saberlo antes de poder sugerir el nombre (las rutas
// en camión tienen su propia familia de nombres, ver
// sugerirNombreMicrorruta en AdminMicrorrutas.tsx) — por eso va primero,
// antes de "¿asignar trabajador?" y del formulario.
import { FaWalking, FaTruck, FaTimes } from "react-icons/fa";
import { MODALIDAD_MICRORRUTA_LABELS, type ModalidadMicrorruta } from "../../types/microrruta";

interface ElegirModalidadModalProps {
  onElegir: (modalidad: ModalidadMicrorruta) => void;
  // Descarta el trazo recién dibujado por completo, sin crear nada.
  onCancelar: () => void;
}

export default function ElegirModalidadModal({
  onElegir,
  onCancelar,
}: ElegirModalidadModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-900">¿A pie o en camión?</h2>
          <button onClick={onCancelar} className="shrink-0 text-gray-400 hover:text-gray-600">
            <FaTimes className="text-xl" />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Antes de continuar con el formulario, dinos si esta microrruta se recorre a pie o
          en camión.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onElegir("A_PIE")}
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-5 text-sm font-bold text-gray-700 transition hover:border-emerald-400 hover:bg-emerald-50"
          >
            <FaWalking className="text-3xl text-emerald-600" />
            {MODALIDAD_MICRORRUTA_LABELS.A_PIE}
          </button>
          <button
            type="button"
            onClick={() => onElegir("CAMION")}
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-5 text-sm font-bold text-gray-700 transition hover:border-blue-400 hover:bg-blue-50"
          >
            <FaTruck className="text-3xl text-blue-600" />
            {MODALIDAD_MICRORRUTA_LABELS.CAMION}
          </button>
        </div>

        <button
          type="button"
          onClick={onCancelar}
          className="mt-4 w-full text-center text-xs font-semibold text-gray-400 hover:text-gray-600"
        >
          Cancelar trazo
        </button>
      </div>
    </div>
  );
}
