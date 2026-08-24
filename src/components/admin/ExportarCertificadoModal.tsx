// components/admin/ExportarCertificadoModal.tsx
import { useEffect, useState } from "react";
import { FaTimes, FaSearch, FaFilePdf, FaSpinner } from "react-icons/fa";
import { getRecyclersByTab, exportarCertificado } from "../../services/recyclers";
import type { Recycler } from "../../types/recycler";

interface ExportarCertificadoModalProps {
  onClose: () => void;
}

/**
 * Modal de búsqueda para descargar el certificado de un reciclador
 * cualquiera (no solo el recién creado) — se abre desde el botón
 * "Exportar certificado" junto a los demás exports.
 */
export default function ExportarCertificadoModal({ onClose }: ExportarCertificadoModalProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [resultados, setResultados] = useState<Recycler[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [descargandoId, setDescargandoId] = useState<number | null>(null);

  // Debounce de la búsqueda (400 ms), mismo patrón que la tabla principal.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!search) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    getRecyclersByTab("todos", search)
      .then(setResultados)
      .catch((err) => console.error("Error buscando recicladores:", err))
      .finally(() => setBuscando(false));
  }, [search]);

  const handleDescargar = async (recycler: Recycler) => {
    setDescargandoId(recycler.id);
    try {
      const blob = await exportarCertificado(recycler.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificado-${recycler.nombreCompleto.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando certificado:", error);
      alert("No se pudo descargar el certificado.");
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-900">Exportar certificado</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="relative mt-4">
          <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-400" />
          <input
            type="text"
            autoFocus
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre o cédula..."
            className="w-full rounded-xl border border-gray-300 py-2.5 pr-3 pl-9 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
          {!search && (
            <p className="py-6 text-center text-xs text-gray-400">
              Escribe un nombre o cédula para buscar.
            </p>
          )}
          {search && buscando && (
            <p className="py-6 text-center text-xs text-gray-400">Buscando...</p>
          )}
          {search && !buscando && resultados.length === 0 && (
            <p className="py-6 text-center text-xs text-gray-400">Sin resultados.</p>
          )}
          {resultados.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 p-2.5"
            >
              <div>
                <p className="text-sm font-bold text-gray-800">{r.nombreCompleto}</p>
                <p className="font-mono text-xs text-gray-400">{r.cedula}</p>
              </div>
              <button
                onClick={() => handleDescargar(r)}
                disabled={descargandoId !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {descargandoId === r.id ? <FaSpinner className="animate-spin" /> : <FaFilePdf />}
                Descargar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
