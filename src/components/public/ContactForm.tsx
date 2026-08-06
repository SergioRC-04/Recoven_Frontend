import { useState, useEffect, type FormEvent } from "react";
import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaBuilding,
  FaWhatsapp,
  FaPaperPlane,
  FaLock,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { recovenApi } from "../../services/api";
import { useServicePreselect } from "../../hooks/useServicePreselect";

interface FormData {
  nombre: string;
  telefono: string;
  email: string;
  empresa: string;
  direccion: string;
  servicio: string;
  especialidad: string;
  mensaje: string;
}

interface SubmitStatus {
  type: "idle" | "success" | "error";
  message: string;
}

export default function ContactForm() {
  const { servicio: servicioPreselect, especialidad: especialidadPreselect } =
    useServicePreselect();

  // Inicializar estado con los valores de sessionStorage y URL
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    telefono: "",
    email: "",
    empresa: "",
    direccion: "",
    servicio: servicioPreselect || "",
    especialidad: especialidadPreselect || "",
    mensaje: "",
  });

  useEffect(() => {
    if (servicioPreselect && !formData.servicio) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData((prev) => ({ ...prev, servicio: servicioPreselect }));
    }
    if (especialidadPreselect && !formData.especialidad) {
      setFormData((prev) => ({ ...prev, especialidad: especialidadPreselect }));
    }
  }, [servicioPreselect, especialidadPreselect, formData.servicio, formData.especialidad]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>({
    type: "idle",
    message: "",
  });

  // No necesitamos useEffect para la preselección, ya que se hizo en la inicialización.
  // Solo un useEffect para limpiar la URL y sessionStorage si es necesario (ya lo hicimos en getInitialFormData).

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpiar error del campo cuando el usuario escribe
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    // Ocultar mensaje de éxito/error al editar
    if (submitStatus.type !== "idle") {
      setSubmitStatus({ type: "idle", message: "" });
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.nombre.trim()) newErrors.nombre = "El nombre es obligatorio";
    if (!formData.telefono.trim()) newErrors.telefono = "El teléfono es obligatorio";
    if (!formData.email.trim()) {
      newErrors.email = "El correo es obligatorio";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Correo electrónico inválido";
    }
    if (!formData.servicio) newErrors.servicio = "Seleccione un tipo de servicio";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitStatus({ type: "idle", message: "" });

    try {
      // Enviar al backend usando recovenApi
      await recovenApi.post("/leads/send-lead", {
        nombre: formData.nombre,
        telefono: formData.telefono,
        email: formData.email,
        empresa: formData.empresa || undefined,
        direccion: formData.direccion || undefined,
        servicio: formData.servicio,
        especialidad: formData.especialidad || undefined,
        mensaje: formData.mensaje || undefined,
      });

      // Éxito
      setSubmitStatus({
        type: "success",
        message: "¡Solicitud enviada con éxito! Nos pondremos en contacto pronto.",
      });

      // Resetear formulario
      setFormData({
        nombre: "",
        telefono: "",
        email: "",
        empresa: "",
        direccion: "",
        servicio: "",
        especialidad: "",
        mensaje: "",
      });
      // Limpiar errores
      setErrors({});
    } catch (error) {
      console.error("[ContactForm] Error:", error);
      setSubmitStatus({
        type: "error",
        message: "Hubo un error al procesar tu solicitud. Por favor, inténtalo de nuevo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contacto" className="bg-white py-20">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="reveal mb-12 text-center">
          <h3 className="text-3xl font-bold text-gray-800 md:text-4xl">Solicite su servicio</h3>
          <p className="mt-3 text-gray-600">
            Complete el formulario y nuestro equipo lo contactará en menos de 24 horas hábiles.
          </p>
        </div>

        <div className="grid items-start gap-12 lg:grid-cols-5">
          {/* Formulario */}
          <div className="reveal rounded-2xl bg-gray-50 p-6 shadow-lg md:p-8 lg:col-span-3">
            <form onSubmit={handleSubmit} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold">Nombre completo *</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej: María González"
                    className={`mt-1 w-full rounded-lg border p-3 transition focus:ring-2 focus:ring-green-600 focus:outline-none ${
                      errors.nombre ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold">Teléfono / WhatsApp *</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="300 000 0000"
                    className={`mt-1 w-full rounded-lg border p-3 transition focus:ring-2 focus:ring-green-600 focus:outline-none ${
                      errors.telefono ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.telefono && (
                    <p className="mt-1 text-xs text-red-500">{errors.telefono}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold">Correo electrónico *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ejemplo@correo.com"
                    className={`mt-1 w-full rounded-lg border p-3 transition focus:ring-2 focus:ring-green-600 focus:outline-none ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold">
                    Empresa / Conjunto (opcional)
                  </label>
                  <input
                    type="text"
                    name="empresa"
                    value={formData.empresa}
                    onChange={handleChange}
                    placeholder="Ej: Italcol S.A. o Conjunto Los Pinos"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-3 transition focus:ring-2 focus:ring-green-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold">Dirección / Zona de servicio</label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Ej: Calle 84 # 12-34, Barranquilla Norte..."
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 transition focus:ring-2 focus:ring-green-600 focus:outline-none"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold">Tipo de servicio *</label>
                <select
                  name="servicio"
                  value={formData.servicio}
                  onChange={handleChange}
                  className={`mt-1 w-full rounded-lg border p-3 transition focus:ring-2 focus:ring-green-600 focus:outline-none ${
                    errors.servicio ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Seleccione...</option>
                  <option value="Servicio Residencial">
                    Servicio Residencial (viviendas, conjuntos)
                  </option>
                  <option value="Servicio Industrial / Comercial">
                    Servicio Industrial / Comercial (fábricas, oficinas, zonas francas)
                  </option>
                </select>
                {errors.servicio && <p className="mt-1 text-xs text-red-500">{errors.servicio}</p>}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold">Especialidad del Servicio</label>
                <select
                  name="especialidad"
                  value={formData.especialidad}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 transition focus:ring-2 focus:ring-green-600 focus:outline-none"
                >
                  <option value="">Seleccione (opcional)...</option>
                  <option value="Gestión de Residuos Aprovechables">
                    Gestión de Residuos Aprovechables
                  </option>
                  <option value="Abonos & Sostenibilidad">Abonos & Sostenibilidad</option>
                  <option value="Saneamiento & Manejo Ambiental">
                    Saneamiento & Manejo Ambiental
                  </option>
                  <option value="Recolección y Disposición Final de Poda">
                    Recolección y Disposición Final de Poda
                  </option>
                  <option value="Gestión Ambiental Integral">Gestión Ambiental Integral</option>
                  <option value="Limpieza y Mantenimiento de Bermas">
                    Limpieza y Mantenimiento de Bermas
                  </option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold">
                  Detalles del servicio solicitado
                </label>
                <textarea
                  name="mensaje"
                  value={formData.mensaje}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-gray-300 p-3 transition focus:ring-2 focus:ring-green-600 focus:outline-none"
                  placeholder="Ej: Necesito un servicio de recolección de residuos..."
                />
              </div>

              {/* Mensaje de éxito/error */}
              {submitStatus.type === "success" && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  <FaCheckCircle className="text-green-500" />
                  {submitStatus.message}
                </div>
              )}
              {submitStatus.type === "error" && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <FaTimesCircle className="text-red-500" />
                  {submitStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`bg-primary-green hover:bg-opacity-90 mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-white shadow-md transition ${
                  isSubmitting ? "cursor-not-allowed opacity-70" : ""
                }`}
              >
                <FaPaperPlane />
                {isSubmitting ? "Enviando..." : "Enviar solicitud"}
              </button>

              <p className="mt-3 text-center text-xs text-gray-400">
                <FaLock className="mr-1 inline" /> Datos protegidos · Respuesta en menos de 24h
              </p>
            </form>
          </div>

          {/* Información de contacto */}
          <div className="reveal lg:order-2 lg:col-span-2">
            <div className="space-y-4">
              <div className="flex gap-3">
                <FaMapMarkerAlt className="text-primary-green mt-1" />
                <div>
                  <p className="font-semibold">Oficinas operativas</p>
                  <p className="text-sm text-gray-600">
                    Carrera 38 #123-45 Barranquilla
                    <br />
                    Calle 13 #13-56 Puerto Colombia
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <FaPhoneAlt className="text-primary-green" />
                <div>
                  <p className="font-semibold">Teléfono / WhatsApp</p>
                  <a href="tel:3046711126" className="hover:text-primary-green text-sm">
                    304 671 1126
                  </a>
                </div>
              </div>
              <div className="flex gap-3">
                <FaEnvelope className="text-primary-green" />
                <div>
                  <p className="font-semibold">Correo oficial</p>
                  <a
                    href="mailto:recovenecasasesp@gmail.com"
                    className="hover:text-primary-green text-sm break-all"
                  >
                    recovenecasasesp@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex gap-3">
                <FaBuilding className="text-primary-green" />
                <div>
                  <p className="font-semibold">NIT</p>
                  <p className="text-sm">901.427.170-6</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <a
                href="https://wa.me/573046711126?text=Hola%2C%20me%20interesa%20solicitar%20un%20servicio%20de%20RECOVEN%20ECA."
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-3 rounded-xl px-6 py-3 font-bold text-white transition hover:-translate-y-1 hover:opacity-90"
                style={{
                  background: "#25d366",
                  boxShadow: "0 6px 20px rgba(37, 211, 102, 0.35)",
                }}
              >
                <FaWhatsapp className="text-2xl" /> Chatear por WhatsApp ahora
              </a>
              <p className="mt-2 text-center text-xs text-gray-400">
                Respuesta inmediata en horario laboral
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
