// components/public/PqrsdfForm.tsx
import { useState, type FormEvent } from "react";
import { crearPqrsdf } from "../../services/pqrsdf";
import type { TipoPqrsdf } from "../../types/pqrsdf";
import { TIPO_LABELS } from "../../types/pqrsdf";
import { FaCheckCircle, FaSpinner, FaTimes } from "react-icons/fa";

interface PqrsdfFormProps {
  onSuccess?: (radicado: string) => void;
  onOpenPrivacyModal: () => void;
}

export default function PqrsdfForm({ onSuccess, onOpenPrivacyModal }: PqrsdfFormProps) {
  const [tipo, setTipo] = useState<TipoPqrsdf>("PETICION");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [tipoIdentificacion, setTipoIdentificacion] = useState("CC");
  const [numeroIdentificacion, setNumeroIdentificacion] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [aceptarTerminos, setAceptarTerminos] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setTipo("PETICION");
    setNombreCompleto("");
    setTipoIdentificacion("CC");
    setNumeroIdentificacion("");
    setEmail("");
    setTelefono("");
    setDireccion("");
    setAsunto("");
    setDescripcion("");
    setFile(null);
    setAceptarTerminos(false);
    setSuccess(null);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!aceptarTerminos) {
      setError("Debe aceptar la política de tratamiento de datos.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        tipo,
        nombreCompleto,
        tipoIdentificacion,
        numeroIdentificacion,
        email,
        telefono,
        direccion,
        asunto,
        descripcion,
      };

      const response = await crearPqrsdf(payload, file || undefined);

      // Mostrar mensaje de éxito local
      setSuccess(`Radicado #${response.radicado} creado exitosamente.`);

      // Notificar al padre
      if (onSuccess) {
        onSuccess(response.radicado);
      }

      // Resetear formulario después de éxito
      resetForm();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al radicar la solicitud.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tipo de solicitud */}
      <div>
        <label className="block text-sm font-bold text-gray-700">Tipo de solicitud *</label>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(Object.keys(TIPO_LABELS) as TipoPqrsdf[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTipo(key)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                tipo === key
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {TIPO_LABELS[key]}
            </button>
          ))}
        </div>
      </div>
      {/* Datos personales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-bold text-gray-700">
            Nombre completo / Razón social *
          </label>
          <input
            type="text"
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700">Correo electrónico *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700">Tipo de identificación</label>
          <select
            value={tipoIdentificacion}
            onChange={(e) => setTipoIdentificacion(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="CC">Cédula de Ciudadanía</option>
            <option value="NIT">NIT</option>
            <option value="CE">Cédula de Extranjería</option>
            <option value="Pasaporte">Pasaporte</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700">
            Número de identificación *
          </label>
          <input
            type="text"
            value={numeroIdentificacion}
            onChange={(e) => setNumeroIdentificacion(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700">Teléfono</label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700">Dirección</label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Asunto y descripción */}
      <div>
        <label className="block text-sm font-bold text-gray-700">Asunto *</label>
        <input
          type="text"
          value={asunto}
          onChange={(e) => setAsunto(e.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700">Descripción detallada *</label>
        <textarea
          rows={4}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Archivo adjunto */}
      <div>
        <label className="block text-sm font-bold text-gray-700">Archivo adjunto (opcional)</label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
          />
          {file && <span className="max-w-xs truncate text-sm text-gray-600">{file.name}</span>}
        </div>
      </div>

      {/* Términos y condiciones */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="terminos"
          checked={aceptarTerminos}
          onChange={(e) => setAceptarTerminos(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        <label htmlFor="terminos" className="text-sm text-gray-600">
          Acepto la{" "}
          <button
            type="button"
            onClick={onOpenPrivacyModal} // 👈 Usar prop
            className="text-emerald-600 hover:underline focus:outline-none"
          >
            política de tratamiento de datos personales
          </button>{" "}
          (Ley 1581 de 2012) y autorizo a RECOVEN ECA ESP a usar mis datos para la gestión de mi
          solicitud.
        </label>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-700">
          <FaTimes className="text-red-500" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-green-700">
          <FaCheckCircle className="text-green-500" />
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-70"
      >
        {loading ? <FaSpinner className="animate-spin" /> : null}
        Radicar solicitud
      </button>
    </form>
  );
}
