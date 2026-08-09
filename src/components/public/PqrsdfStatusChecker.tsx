// components/public/PqrsdfStatusChecker.tsx
import { useState, type FormEvent } from "react";
import { consultarPqrsdf } from "../../services/pqrsdf";
import type { Pqrsdf } from "../../types/pqrsdf";
import { TIPO_LABELS, ESTADO_LABELS, ESTADO_COLORS } from "../../types/pqrsdf";
import {
  FaSearch,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaFileAlt,
} from "react-icons/fa";

export default function PqrsdfStatusChecker() {
  const [radicado, setRadicado] = useState("");
  const [numeroIdentificacion, setNumeroIdentificacion] = useState("");
  const [resultado, setResultado] = useState<Pqrsdf | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultado(null);
    if (!radicado || !numeroIdentificacion) {
      setError("Complete ambos campos.");
      return;
    }
    setLoading(true);
    try {
      const data = await consultarPqrsdf({ radicado, numeroIdentificacion });
      setResultado(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se encontró el radicado. Verifique los datos.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "RECIBIDO":
        return <FaClock className="text-blue-500" />;
      case "EN_TRAMITE":
        return <FaSpinner className="animate-spin text-yellow-500" />;
      case "RESUELTO":
        return <FaCheckCircle className="text-green-500" />;
      case "RECHAZADO":
        return <FaTimesCircle className="text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-bold text-gray-700">Número de radicado *</label>
            <input
              type="text"
              value={radicado}
              onChange={(e) => setRadicado(e.target.value)}
              placeholder="Ej: PQRS-202608-A1B2"
              required
              className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">
              Número de identificación *
            </label>
            <input
              type="text"
              value={numeroIdentificacion}
              onChange={(e) => setNumeroIdentificacion(e.target.value)}
              placeholder="Ej: 123456789"
              required
              className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-70"
        >
          {loading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
          Consultar estado
        </button>
      </form>

      {error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}

      {resultado && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Radicado</p>
              <p className="text-xl font-bold text-gray-900">{resultado.radicado}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estado</p>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${
                  ESTADO_COLORS[resultado.estado]
                }`}
              >
                {getEstadoIcon(resultado.estado)}
                {ESTADO_LABELS[resultado.estado]}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha de radicación</p>
              <p className="font-medium text-gray-900">
                {new Date(resultado.createdAt).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-sm font-bold text-gray-700">Asunto</p>
            <p className="text-gray-800">{resultado.asunto}</p>
            <p className="mt-2 text-sm font-bold text-gray-700">Tipo</p>
            <p className="text-gray-800">{TIPO_LABELS[resultado.tipo]}</p>
          </div>

          {resultado.estado === "RESUELTO" && resultado.respuesta && (
            <div className="mt-4 rounded-xl border-l-4 border-emerald-500 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-800">Respuesta oficial</p>
              <p className="mt-1 whitespace-pre-wrap text-gray-800">{resultado.respuesta}</p>
              {resultado.urlRespuesta && (
                <a
                  href={resultado.urlRespuesta}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:underline"
                >
                  <FaFileAlt /> Descargar documento de respuesta
                </a>
              )}
              {resultado.fechaRespuesta && (
                <p className="mt-2 text-xs text-gray-500">
                  Respondido el:{" "}
                  {new Date(resultado.fechaRespuesta).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
