import { Fragment, useEffect, useState } from "react";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../../services/customers";
import { getCertificateHistory, uploadCertificate } from "../../services/certificates";
import type { Customer } from "../../types/customer";
import type { Certificate } from "../../types/certificate";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaPaperPlane,
  FaCloudUploadAlt,
  FaFilePdf,
  FaHistory,
  FaChevronDown,
  FaChevronUp,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";

// Estado del envío en curso — reemplaza el booleano "uploading" de antes.
// Con tipo/mensaje explícitos se puede mostrar un banner distinto para
// cada caso, en vez de un solo alert() genérico para todo.
type EstadoEnvio =
  | { tipo: "idle" }
  | { tipo: "enviando" }
  | { tipo: "exito"; mensaje: string }
  | { tipo: "error"; mensaje: string };

const ESTADO_CERT_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ENVIADO: "Enviado",
  FALLIDO: "Fallido",
};

const ESTADO_CERT_COLORS: Record<string, string> = {
  PENDIENTE: "border-amber-100 bg-amber-50 text-amber-700",
  ENVIADO: "border-emerald-100 bg-emerald-50 text-emerald-700",
  FALLIDO: "border-red-100 bg-red-50 text-red-700",
};

export default function DocumentsManager() {
  // Customers state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Certificates state
  const [history, setHistory] = useState<Certificate[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [certType, setCertType] = useState<"PODA" | "RESIDUOS">("PODA");
  const [file, setFile] = useState<File | null>(null);
  const [estadoEnvio, setEstadoEnvio] = useState<EstadoEnvio>({ tipo: "idle" });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error("Error cargando clientes:", error);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await getCertificateHistory();
      setHistory(data);
    } catch (error) {
      console.error("Error cargando historial:", error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCustomers();
    loadHistory();
  }, []);

  // El banner de éxito/error se retira solo después de un rato — el de
  // "enviando" se retira naturalmente cuando la petición termina, así que
  // no necesita temporizador.
  useEffect(() => {
    if (estadoEnvio.tipo !== "exito" && estadoEnvio.tipo !== "error") return;
    const timeout = setTimeout(() => setEstadoEnvio({ tipo: "idle" }), 8000);
    return () => clearTimeout(timeout);
  }, [estadoEnvio]);

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail) return;
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, { nombre: customerName, correo: customerEmail });
        setEditingCustomer(null);
      } else {
        await createCustomer({ nombre: customerName, correo: customerEmail });
      }
      setCustomerName("");
      setCustomerEmail("");
      await loadCustomers();
    } catch (error) {
      console.error("Error guardando cliente:", error);
      alert("Error al guardar el cliente.");
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm("¿Eliminar esta empresa?")) return;
    try {
      await deleteCustomer(id);
      await loadCustomers();
    } catch (error) {
      console.error("Error eliminando cliente:", error);
      alert("No se pudo eliminar la empresa teniendo certificados asociados.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !certType || !file) {
      setEstadoEnvio({
        tipo: "error",
        mensaje: "Completa todos los campos y selecciona un archivo antes de enviar.",
      });
      return;
    }
    const confirmMsg =
      "¿Está seguro de registrar este certificado?\n\n" +
      "⚠️ Esta acción NO es reversible.\n" +
      "📩 Se enviará un correo electrónico de forma inmediata y directa a la empresa cliente con el documento adjunto.";
    if (!window.confirm(confirmMsg)) return;

    const empresaSeleccionada = customers.find((c) => String(c.id) === selectedCustomerId);

    setEstadoEnvio({ tipo: "enviando" });
    const formData = new FormData();
    formData.append("empresaId", selectedCustomerId);
    formData.append("tipo", certType);
    formData.append("file", file);

    try {
      await uploadCertificate(formData);
      setEstadoEnvio({
        tipo: "exito",
        // La subida/petición ya terminó en este punto — lo que puede
        // tardar más es la entrega final a la bandeja del destinatario
        // (sobre todo en correos institucionales con filtros de
        // seguridad), así que la advertencia de tiempo va aquí, no en el
        // estado "enviando" (que sí es rápido, son solo unos segundos).
        mensaje: empresaSeleccionada
          ? `El certificado fue enviado correctamente a ${empresaSeleccionada.nombre}. Puede tardar unos minutos en llegar a su bandeja, especialmente si es un correo institucional o corporativo con filtros de seguridad propios.`
          : "El certificado fue enviado correctamente. Puede tardar unos minutos en llegar a la bandeja del destinatario.",
      });
      setFile(null);
      setSelectedCustomerId("");
      setCertType("PODA");
      await loadHistory();
    } catch (error) {
      console.error("Error subiendo certificado:", error);
      setEstadoEnvio({
        tipo: "error",
        // El mensaje del backend ya explica qué pasó (p. ej. "el intento
        // quedó registrado como fallido y se notificó por correo") — se
        // muestra tal cual, en vez de un genérico, para no dejar dudas.
        mensaje:
          error instanceof Error
            ? error.message
            : "No se pudo procesar el certificado. Intenta de nuevo.",
      });
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-black text-gray-900">Certificados y Documentación</h1>
        <p className="text-sm text-gray-500">
          Emisión de certificados de disposición final y gestión de empresas aliadas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Formulario de carga */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <FaPaperPlane className="text-emerald-600" /> Emitir Nuevo Certificado
            </h2>

            {estadoEnvio.tipo !== "idle" && (
              <div
                className={`mb-4 flex items-start gap-3 rounded-xl border p-4 text-sm ${
                  estadoEnvio.tipo === "enviando"
                    ? "border-blue-200 bg-blue-50 text-blue-800"
                    : estadoEnvio.tipo === "exito"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                <div className="mt-0.5 text-lg">
                  {estadoEnvio.tipo === "enviando" && <FaSpinner className="animate-spin" />}
                  {estadoEnvio.tipo === "exito" && <FaCheckCircle />}
                  {estadoEnvio.tipo === "error" && <FaExclamationTriangle />}
                </div>
                <div className="flex-1">
                  <p className="font-bold">
                    {estadoEnvio.tipo === "enviando" && "Enviando certificado..."}
                    {estadoEnvio.tipo === "exito" && "Certificado enviado"}
                    {estadoEnvio.tipo === "error" && "Hubo un problema. Intenta de nuevo."}
                  </p>
                  <p className="mt-0.5 text-xs opacity-90">
                    {estadoEnvio.tipo === "enviando"
                      ? "Subiendo el archivo y notificando a la empresa por correo — no cierres esta ventana."
                      : estadoEnvio.mensaje}
                  </p>
                </div>
                {estadoEnvio.tipo !== "enviando" && (
                  <button
                    type="button"
                    onClick={() => setEstadoEnvio({ tipo: "idle" })}
                    className="text-current opacity-60 transition hover:opacity-100"
                    aria-label="Cerrar aviso"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-700 uppercase">
                    Seleccionar Empresa
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      Seleccione una empresa...
                    </option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-700 uppercase">
                    Tipo de Certificado
                  </label>
                  <select
                    value={certType}
                    onChange={(e) => setCertType(e.target.value as "PODA" | "RESIDUOS")}
                    required
                    className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="PODA">🍃 Residuos de Poda</option>
                    <option value="RESIDUOS">📦 Residuos Aprovechables</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wider text-gray-700 uppercase">
                  Documento del Certificado (.docx, .pdf)
                </label>
                <div
                  className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center transition hover:bg-gray-100"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("border-emerald-500", "bg-gray-100");
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-emerald-500", "bg-gray-100");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-emerald-500", "bg-gray-100");
                    if (e.dataTransfer.files.length > 0) {
                      setFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => document.getElementById("fileInput")?.click()}
                >
                  <input
                    type="file"
                    id="fileInput"
                    accept=".docx,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-600 transition-transform group-hover:scale-110">
                    <FaCloudUploadAlt />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    {file
                      ? `Archivo seleccionado: ${file.name}`
                      : "Arrastra el archivo aquí o haz clic para explorar"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Formatos permitidos: Word o PDF hasta 10MB
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={estadoEnvio.tipo === "enviando" || !file}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {estadoEnvio.tipo === "enviando" ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaPaperPlane />
                  )}
                  {estadoEnvio.tipo === "enviando" ? "Enviando..." : "Enviar Correo"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Lista de empresas */}
        <div className="space-y-6">
          <div className="flex h-full max-h-120 flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <FaEdit className="text-emerald-600" /> Registrar Empresa
            </h2>
            <form
              onSubmit={handleCustomerSubmit}
              className="space-y-3 border-b border-gray-100 pb-4"
            >
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                placeholder="Nombre de la empresa"
                className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
                placeholder="Correo electrónico institucional"
                className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-gray-900 py-2 text-sm font-bold text-white shadow transition hover:bg-gray-800"
              >
                <FaPlus className="mr-1 inline" />{" "}
                {editingCustomer ? "Actualizar Empresa" : "Agregar Empresa"}
              </button>
              {editingCustomer && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCustomer(null);
                    setCustomerName("");
                    setCustomerEmail("");
                  }}
                  className="w-full rounded-xl bg-gray-200 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-300"
                >
                  Cancelar edición
                </button>
              )}
            </form>
            <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
              {customers.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">
                  No hay empresas registradas.
                </p>
              ) : (
                customers.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3 transition hover:shadow-sm"
                  >
                    <div className="max-w-[70%] truncate">
                      <p className="truncate text-xs font-bold text-gray-900">{c.nombre}</p>
                      <p className="truncate text-[11px] text-gray-500">{c.correo}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingCustomer(c);
                          setCustomerName(c.nombre);
                          setCustomerEmail(c.correo);
                        }}
                        className="p-1 text-sm text-gray-400 transition hover:text-blue-600"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(c.id)}
                        className="p-1 text-sm text-gray-400 transition hover:text-red-600"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Historial de certificados */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-black text-gray-900">
          <FaHistory className="text-gray-700" /> Historial de Certificados Despachados
        </h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                  <th className="p-4">Empresa / Destinatario</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Documento Original</th>
                  <th className="p-4">Fecha de Envío</th>
                  <th className="w-12 p-4 text-center">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      No se registran certificados emitidos recientemente.
                    </td>
                  </tr>
                ) : (
                  history.map((cert) => {
                    const isPoda = cert.tipo === "PODA";
                    const isExpanded = expandedId === cert.id;
                    return (
                      <Fragment key={cert.id}>
                        <tr
                          className="group cursor-pointer transition hover:bg-gray-50/70"
                          onClick={() => toggleExpand(cert.id)}
                        >
                          <td className="p-4">
                            <div className="font-bold text-gray-900">{cert.empresa.nombre}</div>
                            <div className="text-xs text-gray-400">{cert.empresa.correo}</div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                                isPoda
                                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                  : "border-blue-100 bg-blue-50 text-blue-700"
                              }`}
                            >
                              {isPoda ? "🍃 PODA" : "📦 RESIDUOS"}
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                                ESTADO_CERT_COLORS[cert.estado] ??
                                "border-gray-100 bg-gray-50 text-gray-600"
                              }`}
                            >
                              {cert.estado === "PENDIENTE" && (
                                <FaSpinner className="animate-spin" />
                              )}
                              {ESTADO_CERT_LABELS[cert.estado] ?? cert.estado}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-xs">
                            {cert.urlArchivo ? (
                              <a
                                href={cert.urlArchivo}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 font-medium text-emerald-600 hover:underline"
                              >
                                <FaFilePdf className="text-sm text-emerald-500" />
                                <span className="max-w-90 truncate">{cert.nombreArchivo}</span>
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-gray-400">
                                <FaFilePdf className="text-sm text-gray-300" />
                                <span className="max-w-90 truncate">{cert.nombreArchivo}</span>
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-xs font-medium text-gray-500">
                            {new Date(cert.fechaEnvio).toLocaleDateString("es-CO", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="p-4 text-center">
                            <button className="text-gray-400 transition-transform duration-200 group-hover:text-gray-600 focus:outline-none">
                              {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50/40">
                            <td colSpan={6} className="border-t border-gray-100 p-0">
                              <div className="px-6 py-4">
                                {cert.estado === "FALLIDO" ? (
                                  <div className="mx-auto my-2 max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6">
                                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-red-500 uppercase">
                                      <FaExclamationTriangle /> Este envío falló
                                    </div>
                                    <p className="text-sm text-red-800">
                                      {cert.errorDetalle ||
                                        "No se pudo completar el envío. Revisa el correo de alerta para más detalle."}
                                    </p>
                                  </div>
                                ) : cert.estado === "PENDIENTE" ? (
                                  <div className="mx-auto my-2 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6">
                                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-600 uppercase">
                                      <FaSpinner className="animate-spin" /> Este envío sigue en
                                      proceso
                                    </div>
                                    <p className="text-sm text-amber-800">
                                      Si lleva más de unos minutos así, probablemente el proceso se
                                      interrumpió — revisa si llegó un correo de alerta.
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-400 uppercase">
                                      Vista previa del correo electrónico enviado
                                    </div>
                                    <div className="mx-auto my-2 max-w-2xl rounded-xl border border-gray-200 bg-white p-6 font-sans text-gray-800 shadow-sm">
                                      <div className="mb-6 text-center">
                                        <img
                                          src="https://recovenesp.com/assets/img/logo.png"
                                          alt="RECOVEN Logo"
                                          className="mx-auto w-36"
                                        />
                                      </div>
                                      <h2 className="mt-0 border-b-2 border-gray-100 pb-3 text-lg font-bold text-emerald-600">
                                        Emisión de Certificado Ambiental Oficial
                                      </h2>
                                      <p className="mt-4 text-sm">
                                        Estimado equipo de <strong>{cert.empresa.nombre}</strong>,
                                      </p>
                                      <p className="mt-2 text-sm">
                                        Cordial saludo por parte del equipo técnico y administrativo
                                        de <strong>RECOVEN ECA SAS ESP</strong>.
                                      </p>
                                      <p className="mt-2 text-sm">
                                        De manera formal y en cumplimiento de los estándares
                                        operativos, adjunto a este mensaje encontrará el{" "}
                                        <strong>
                                          {isPoda
                                            ? "Certificado de Manejo y Disposición Final de Residuos Orgánicos Aprovechables"
                                            : "Certificado de Manejo y Disposición Final de Residuos"}
                                        </strong>{" "}
                                        {isPoda
                                          ? "correspondiente a las actividades de poda ejecutadas en las zonas de recolección autorizadas."
                                          : "correspondiente a los proyectos corporativos especiales y de materiales diversos procesados en nuestras plantas de clasificación."}
                                      </p>
                                      <div className="my-5 rounded-lg border border-dashed border-emerald-500 bg-gray-50 p-5 text-center">
                                        <p className="m-0 mb-2.5 text-sm font-bold text-emerald-800">
                                          🔍 Verificación Digital con Código QR
                                        </p>
                                        <p className="m-0 mb-4 text-xs text-gray-600">
                                          Escanee el siguiente código QR con la cámara de su
                                          dispositivo móvil para acceder al documento oficial
                                          guardado en nuestro servidor seguro:
                                        </p>
                                        {cert.urlArchivo ? (
                                          <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=059669&data=${encodeURIComponent(cert.urlArchivo)}`}
                                            alt="Código QR del Certificado"
                                            width={180}
                                            height={180}
                                            className="mx-auto rounded-md border border-gray-200 bg-white p-1.5"
                                          />
                                        ) : (
                                          <p className="text-xs text-gray-400">
                                            (QR no disponible — no hay URL de archivo registrada)
                                          </p>
                                        )}
                                        {cert.urlArchivo && (
                                          <p className="mt-3 text-xs">
                                            <a
                                              href={cert.urlArchivo}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="font-medium text-emerald-600 underline"
                                            >
                                              O haga clic aquí para abrir/descargar el certificado
                                            </a>
                                          </p>
                                        )}
                                      </div>
                                      <div className="my-5 rounded-r border-l-4 border-emerald-500 bg-gray-50 p-4">
                                        <p className="m-0 text-xs font-medium text-gray-600">
                                          ℹ️ El documento oficial firmado ha sido anexado
                                          directamente a este correo electrónico como archivo
                                          adjunto en formato digital para su descarga, auditoría y
                                          almacenamiento local corporativo.
                                        </p>
                                      </div>
                                      <p className="mt-4 text-xs leading-relaxed text-gray-400">
                                        Agradecemos su confianza en nuestros servicios orientados al
                                        desarrollo de la economía circular, la transformación
                                        ecológica y la gestión ambiental responsable bajo el
                                        estricto cumplimiento de la normativa legal vigente de la
                                        República de Colombia.
                                      </p>
                                      <hr className="my-5 border-0 border-t border-gray-200" />
                                      <div className="space-y-1 text-center text-[11px] text-gray-400">
                                        <p className="m-0 font-bold text-gray-600">
                                          RECOVEN ECA SAS ESP
                                        </p>
                                        <p className="m-0">Barranquilla, Atlántico, Colombia</p>
                                        <p className="mt-2 font-medium text-amber-600">
                                          ⚠️ Por favor, no responda a este correo electrónico, es
                                          una notificación automatizada despachada por los sistemas
                                          centrales.
                                        </p>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
