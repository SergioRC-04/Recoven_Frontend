// components/admin/UsuariosPreviewModal.tsx
//
// Previsualización de todas las direcciones/pólizas (UsuarioMicrorruta) de
// la microrruta activa. En móvil ocupa toda la pantalla (no un modal chico:
// el personal de campo la usa caminando, con poco espacio para tocar un
// modal pequeño) — en desktop es un panel centrado más convencional.
import { useState } from "react";
import { FaTimes, FaEdit, FaTrash, FaMapMarkerAlt, FaSpinner } from "react-icons/fa";
import { deleteUsuarioMicrorruta } from "../../services/usuarios";
import UsuarioMicrorrutaFormModal from "./UsuarioMicrorrutaFormModal";
import type { UsuarioMicrorrutaProperties } from "../../types/usuario";

interface UsuariosPreviewModalProps {
  microrrutaNombre: string;
  usuarios: UsuarioMicrorrutaProperties[];
  onClose: () => void;
  onChanged: () => void;
}

export default function UsuariosPreviewModal({
  microrrutaNombre,
  usuarios,
  onClose,
  onChanged,
}: UsuariosPreviewModalProps) {
  const [editando, setEditando] = useState<UsuarioMicrorrutaProperties | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (u: UsuarioMicrorrutaProperties) => {
    if (!confirm(`¿Eliminar la dirección "${u.direccion}"? Esta acción no se puede deshacer.`))
      return;
    setError(null);
    setEliminandoId(u.id);
    try {
      await deleteUsuarioMicrorruta(u.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el registro.");
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white sm:items-center sm:justify-center sm:bg-black/50 sm:p-4">
      <div className="flex h-full w-full flex-col bg-white sm:h-[85vh] sm:max-w-2xl sm:overflow-hidden sm:rounded-2xl sm:shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-4 sm:p-6 sm:pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 sm:text-xl">
              <FaMapMarkerAlt className="text-emerald-600" />
              Direcciones y pólizas
            </h2>
            <p className="mt-1 text-sm text-gray-500">{microrrutaNombre}</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600">
            <FaTimes className="text-xl" />
          </button>
        </div>

        {error && (
          <div className="border-b border-gray-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 sm:px-6">
            {error}
          </div>
        )}

        <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
          {usuarios.length === 0 ? (
            <p className="py-10 text-center text-gray-400">
              No hay direcciones ni pólizas registradas todavía en esta microrruta.
            </p>
          ) : (
            usuarios.map((u) => (
              <div key={u.id} className="p-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900">{u.direccion}</p>
                    <p className="mt-0.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Póliza: <span className="font-mono normal-case">{u.poliza}</span>
                    </p>
                    {u.detalles && (
                      <p className="mt-2 text-sm whitespace-pre-wrap text-gray-600">{u.detalles}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      onClick={() => setEditando(u)}
                      title="Editar"
                      className="text-blue-600 transition hover:text-blue-800"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={eliminandoId === u.id}
                      title="Eliminar"
                      className="text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {eliminandoId === u.id ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-100 p-4 sm:p-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>

      {editando && (
        <UsuarioMicrorrutaFormModal
          mode="edit"
          usuario={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
