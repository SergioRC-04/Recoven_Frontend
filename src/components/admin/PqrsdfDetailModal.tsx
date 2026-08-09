// components/admin/PqrsdfDetailModal.tsx
import { useState, type FormEvent } from "react";
import { actualizarPqrsdf } from "../../services/pqrsdf";
import type { Pqrsdf, EstadoPqrsdf } from "../../types/pqrsdf";
import { TIPO_LABELS, ESTADO_LABELS, ESTADO_COLORS } from "../../types/pqrsdf";
import { FaTimes, FaSpinner, FaFileAlt } from "react-icons/fa";

interface PqrsdfDetailModalProps {
  item: Pqrsdf;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PqrsdfDetailModal({ item, onClose, onUpdate }: PqrsdfDetailModalProps) {
  const [estado, setEstado] = useState<EstadoPqrsdf>(item.estado);
  const [respuesta, setRespuesta] = useState(item.respuesta || "");
  const [respuestaFile, setRespuestaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!respuesta.trim() && estado !== item.estado) {
      setError("Debe redactar una respuesta oficial.");
      return;
    }
    setLoading(true);
    try {
      // 👇 Pasar el archivo (si existe) como tercer argumento
      await actualizarPqrsdf(
        item.id,
        { estado, respuesta: respuesta.trim() },
        respuestaFile || undefined
      );
      setSuccess("Estado y respuesta actualizados correctamente.");
      onUpdate();
      setTimeout(() => onClose(), 1500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al actualizar.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Detalle de PQRSDF</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-bold text-gray-500">Radicado:</span>
              <span className="ml-2 font-mono text-gray-900">{item.radicado}</span>
            </div>
            <div>
              <span className="font-bold text-gray-500">Fecha:</span>
              <span className="ml-2 text-gray-900">
                {new Date(item.createdAt).toLocaleString("es-CO")}
              </span>
            </div>
            <div>
              <span className="font-bold text-gray-500">Tipo:</span>
              <span className="ml-2 text-gray-900">{TIPO_LABELS[item.tipo]}</span>
            </div>
            <div>
              <span className="font-bold text-gray-500">Estado actual:</span>
              <span
                className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${ESTADO_COLORS[item.estado]}`}
              >
                {ESTADO_LABELS[item.estado]}
              </span>
            </div>
          </div>

          <div>
            <span className="font-bold text-gray-500">Peticionario:</span>
            <span className="ml-2 text-gray-900">{item.nombreCompleto}</span>
          </div>
          <div>
            <span className="font-bold text-gray-500">Identificación:</span>
            <span className="ml-2 text-gray-900">
              {item.tipoIdentificacion} {item.numeroIdentificacion}
            </span>
          </div>
          <div>
            <span className="font-bold text-gray-500">Correo:</span>
            <span className="ml-2 text-gray-900">{item.email}</span>
          </div>
          {item.telefono && (
            <div>
              <span className="font-bold text-gray-500">Teléfono:</span>
              <span className="ml-2 text-gray-900">{item.telefono}</span>
            </div>
          )}
          {item.direccion && (
            <div>
              <span className="font-bold text-gray-500">Dirección:</span>
              <span className="ml-2 text-gray-900">{item.direccion}</span>
            </div>
          )}
          <div>
            <span className="font-bold text-gray-500">Asunto:</span>
            <span className="ml-2 text-gray-900">{item.asunto}</span>
          </div>
          <div>
            <span className="font-bold text-gray-500">Descripción:</span>
            <p className="mt-1 rounded-lg bg-gray-50 p-3 whitespace-pre-wrap text-gray-800">
              {item.descripcion}
            </p>
          </div>
          {item.urlArchivo && (
            <div>
              <span className="font-bold text-gray-500">Archivo adjunto:</span>
              <a
                href={item.urlArchivo}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-emerald-600 hover:underline"
              >
                <FaFileAlt /> Ver archivo
              </a>
            </div>
          )}
          {/* 👇 Mostrar archivo de respuesta si existe */}
          {item.urlRespuesta && (
            <div>
              <span className="font-bold text-gray-500">Documento de respuesta:</span>
              <a
                href={item.urlRespuesta}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-emerald-600 hover:underline"
              >
                <FaFileAlt className="mr-1 inline" /> Descargar
              </a>
            </div>
          )}
        </div>

        <hr className="my-4" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700">Cambiar estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoPqrsdf)}
              className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="RECIBIDO">Recibido</option>
              <option value="EN_TRAMITE">En trámite</option>
              <option value="RESUELTO">Resuelto</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700">Respuesta oficial *</label>
            <textarea
              rows={4}
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Redacte la respuesta que se enviará al usuario por correo..."
              className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500"
              required={estado !== item.estado}
            />
          </div>

          {/* 👇 NUEVO: Campo para subir archivo de respuesta */}
          <div>
            <label className="block text-sm font-bold text-gray-700">
              Documento de respuesta (opcional)
            </label>
            <input
              type="file"
              onChange={(e) => setRespuestaFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
            />
            {respuestaFile && (
              <p className="mt-1 text-xs text-gray-500">
                Archivo seleccionado: {respuestaFile.name}
              </p>
            )}
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {success && <div className="text-sm text-green-600">{success}</div>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gray-200 px-6 py-2 font-bold text-gray-700 transition hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2 font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-70"
            >
              {loading ? <FaSpinner className="animate-spin" /> : null}
              Guardar y Notificar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
