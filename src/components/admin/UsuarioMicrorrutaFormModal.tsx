// components/admin/UsuarioMicrorrutaFormModal.tsx
import { useState, type FormEvent } from "react";
import { FaTimes, FaSpinner, FaMapMarkerAlt, FaWifi } from "react-icons/fa";
import { createUsuarioMicrorruta, updateUsuarioMicrorruta } from "../../services/usuarios";
import {
  toUsuarioMicrorrutaFormValues,
  type UsuarioMicrorrutaFormValues,
  type UsuarioMicrorrutaProperties,
} from "../../types/usuario";

const DETALLES_MAX = 500;

const EMPTY_VALUES: UsuarioMicrorrutaFormValues = {
  direccion: "",
  poliza: "",
  detalles: "",
};

type UsuarioMicrorrutaFormModalProps =
  | {
      mode: "create";
      microrrutaId: number;
      onClose: () => void;
      onSaved: () => void;
    }
  | {
      mode: "edit";
      usuario: UsuarioMicrorrutaProperties;
      onClose: () => void;
      onSaved: () => void;
    };

// Detecta si el error vino de una petición que ni siquiera llegó al
// servidor (sin señal en este tramo de la ruta) para mostrar un aviso claro
// y distinto de un error de validación del backend — y, sobre todo, sin
// cerrar el formulario ni perder lo que el usuario ya escribió, para que
// pueda reintentar apenas recupere señal.
function esErrorDeConexion(err: unknown): boolean {
  if (!navigator.onLine) return true;
  return err instanceof TypeError;
}

export default function UsuarioMicrorrutaFormModal(props: UsuarioMicrorrutaFormModalProps) {
  const { mode, onClose, onSaved } = props;
  const initial = mode === "edit" ? toUsuarioMicrorrutaFormValues(props.usuario) : EMPTY_VALUES;

  const [values, setValues] = useState<UsuarioMicrorrutaFormValues>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sinConexion, setSinConexion] = useState(false);

  const update = <K extends keyof UsuarioMicrorrutaFormValues>(
    key: K,
    value: UsuarioMicrorrutaFormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSinConexion(false);
    setLoading(true);
    try {
      if (mode === "edit") {
        await updateUsuarioMicrorruta(props.usuario.id, values);
      } else {
        await createUsuarioMicrorruta({ ...values, microrrutaId: props.microrrutaId });
      }
      onSaved();
      onClose();
    } catch (err) {
      if (esErrorDeConexion(err)) {
        setSinConexion(true);
        setError(
          "Sin conexión a internet — no se pudo guardar. Tus datos siguen aquí en el formulario: revisa tu señal e inténtalo de nuevo."
        );
      } else {
        setError(err instanceof Error ? err.message : "Error al guardar la dirección y póliza.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-6 pb-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <FaMapMarkerAlt className="text-emerald-600" />
            {mode === "edit" ? "Editar dirección y póliza" : "Añadir dirección y póliza"}
          </h2>
          <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600">
            <FaTimes className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700">Dirección</label>
              <input
                type="text"
                required
                value={values.direccion}
                onChange={(e) => update("direccion", e.target.value)}
                placeholder="Calle 45 # 43-10"
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Póliza</label>
              <input
                type="text"
                required
                value={values.poliza}
                onChange={(e) => update("poliza", e.target.value)}
                placeholder="Número de póliza"
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-700">Detalles</label>
                <span className="text-xs text-gray-400">
                  {values.detalles.length}/{DETALLES_MAX}
                </span>
              </div>
              <textarea
                value={values.detalles}
                maxLength={DETALLES_MAX}
                onChange={(e) => update("detalles", e.target.value)}
                rows={4}
                placeholder="Observaciones sobre la dirección (opcional)"
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div
              className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                sinConexion ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"
              }`}
            >
              {sinConexion && <FaWifi className="mt-0.5 shrink-0" />}
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl bg-gray-200 px-6 py-2 font-bold text-gray-700 transition hover:bg-gray-300 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2 font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-70 sm:w-auto"
            >
              {loading ? <FaSpinner className="animate-spin" /> : null}
              {mode === "edit" ? "Guardar Cambios" : "Añadir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
