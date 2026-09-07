// components/admin/AsignarTrabajadorModal.tsx
import { useMemo, useState } from "react";
import { FaTimes, FaSpinner, FaUserCheck, FaSearch } from "react-icons/fa";
import { asignarMicrorrutaARecycler } from "../../services/recyclers";
import type { Recycler } from "../../types/recycler";
import type { MicrorrutaProperties } from "../../types/microrruta";

interface AsignarTrabajadorModalProps {
  microrruta: MicrorrutaProperties;
  // Lista completa de recicladores activos — la misma que ya carga
  // AdminMicrorrutas.tsx para la columna "Trabajador" de la tabla, no una
  // petición aparte.
  recyclers: Recycler[];
  onClose: () => void;
  // Se llama tras asignar con éxito — el padre refresca los datos para
  // que la columna "Trabajador" de la tabla recoja la nueva asignación.
  onAssigned: () => void;
}

export default function AsignarTrabajadorModal({
  microrruta,
  recyclers,
  onClose,
  onAssigned,
}: AsignarTrabajadorModalProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [asignando, setAsignando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recyclersFiltrados = useMemo(() => {
    const ordenados = [...recyclers].sort((a, b) =>
      a.nombreCompleto.localeCompare(b.nombreCompleto, "es")
    );
    if (!search.trim()) return ordenados;
    const q = search.trim().toLowerCase();
    return ordenados.filter(
      (r) => r.nombreCompleto.toLowerCase().includes(q) || r.cedula.includes(q)
    );
  }, [recyclers, search]);

  const handleAsignar = async () => {
    if (selectedId === null) return;
    setAsignando(true);
    setError(null);
    try {
      await asignarMicrorrutaARecycler(selectedId, microrruta.id);
      onAssigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar el trabajador.");
    } finally {
      setAsignando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-6 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <FaUserCheck className="text-emerald-600" />
              ¿Asignar un trabajador?
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              La microrruta <span className="font-semibold text-gray-700">{microrruta.nombre}</span>{" "}
              se creó correctamente. Elige quién la va a recorrer, o cierra esta ventana para
              hacerlo más tarde.
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600">
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="border-b border-gray-100 p-4">
          <div className="relative">
            <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o cédula..."
              className="w-full rounded-xl border border-gray-300 py-2 pr-3 pl-8 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {recyclersFiltrados.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No se encontró ningún reciclador con ese criterio.
            </p>
          ) : (
            <ul className="space-y-1">
              {recyclersFiltrados.map((r) => {
                const isSelected = selectedId === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        isSelected
                          ? "bg-emerald-50 ring-1 ring-emerald-400 ring-inset"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          isSelected ? "border-emerald-600 bg-emerald-600" : "border-gray-300"
                        }`}
                      >
                        {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-800">
                          {r.nombreCompleto}
                        </span>
                        <span className="block font-mono text-xs text-gray-400">{r.cedula}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <div className="border-t border-gray-100 px-6 py-2 text-sm text-red-600">{error}</div>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={asignando}
            className="rounded-xl bg-gray-200 px-5 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-300 disabled:opacity-60"
          >
            Ahora no
          </button>
          <button
            type="button"
            onClick={handleAsignar}
            disabled={selectedId === null || asignando}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {asignando ? <FaSpinner className="animate-spin" /> : <FaUserCheck />}
            Asignar
          </button>
        </div>
      </div>
    </div>
  );
}
