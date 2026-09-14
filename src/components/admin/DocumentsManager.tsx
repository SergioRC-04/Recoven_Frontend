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

// Un archivo en la cola de envío — cada uno lleva su propia empresa y
// tipo, a diferencia del modelo anterior (un solo archivo por envío).
interface ArchivoCertificado {
  id: string;
  file: File;
  empresaId: string;
  tipo: "PODA" | "RESIDUOS";
  estado: "pendiente" | "enviando" | "enviado" | "error";
  mensajeError?: string;
}

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
  // Cola de archivos pendientes de enviar — reemplaza a
  // selectedCustomerId/certType/file (un solo archivo a la vez). Cada
  // entrada trae su propia empresa, tipo y estado de envío.
  const [archivos, setArchivos] = useState<ArchivoCertificado[]>([]);
  // Progreso del lote en curso — null cuando no hay ningún envío activo.
  const [progreso, setProgreso] = useState<{ actual: number; total: number } | null>(null);
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

  // Agrega uno o más archivos a la cola — cada uno arranca sin empresa
  // asignada (el usuario la elige por fila) y con tipo PODA por defecto,
  // igual que el valor inicial del formulario de un solo archivo de antes.
  const agregarArchivos = (nuevos: FileList | File[]) => {
    const entradas: ArchivoCertificado[] = Array.from(nuevos).map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      empresaId: "",
      tipo: "PODA",
      estado: "pendiente",
    }));
    setArchivos((prev) => [...prev, ...entradas]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      agregarArchivos(e.target.files);
    }
    // Limpia el input para poder volver a elegir el mismo archivo después
    // de quitarlo de la cola — sin esto, el navegador no dispara onChange
    // si se selecciona exactamente el mismo archivo dos veces seguidas.
    e.target.value = "";
  };

  const actualizarArchivo = (id: string, cambios: Partial<ArchivoCertificado>) => {
    setArchivos((prev) => prev.map((a) => (a.id === id ? { ...a, ...cambios } : a)));
  };

  const quitarArchivo = (id: string) => {
    setArchivos((prev) => prev.filter((a) => a.id !== id));
  };

  // Envía la cola completa, un archivo a la vez (no en paralelo) — mismo
  // criterio que el resto de la app para lotes (ver
  // generarReporteMicrorrutas en el admin de microrrutas): evita saturar
  // el backend/Resend con varias subidas a la vez, y deja ver el progreso
  // archivo por archivo en vez de todo-o-nada. Los que ya se enviaron con
  // éxito en un intento anterior (por si se reintenta tras un error
  // parcial) no se vuelven a mandar.
  const handleEnviarLote = async () => {
    if (archivos.length === 0) return;

    const sinEmpresa = archivos.some((a) => !a.empresaId);
    if (sinEmpresa) {
      alert("Selecciona la empresa de cada archivo antes de enviar.");
      return;
    }

    const pendientes = archivos.filter((a) => a.estado !== "enviado");
    const confirmMsg =
      `¿Está seguro de registrar ${pendientes.length} certificado(s)?\n\n` +
      "⚠️ Esta acción NO es reversible.\n" +
      "📩 Se enviará un correo electrónico de forma inmediata a cada empresa cliente con el enlace al documento.";
    if (!window.confirm(confirmMsg)) return;

    setProgreso({ actual: 0, total: pendientes.length });

    let completados = 0;
    for (const archivo of pendientes) {
      actualizarArchivo(archivo.id, { estado: "enviando" });

      const formData = new FormData();
      formData.append("empresaId", archivo.empresaId);
      formData.append("tipo", archivo.tipo);
      formData.append("file", archivo.file);

      try {
        await uploadCertificate(formData);
        actualizarArchivo(archivo.id, { estado: "enviado" });
      } catch (error) {
        console.error("Error subiendo certificado:", error);
        actualizarArchivo(archivo.id, {
          estado: "error",
          // El mensaje del backend ya explica qué pasó (p. ej. "el
          // intento quedó registrado como fallido y se notificó por
          // correo") — se muestra tal cual, en vez de un genérico.
          mensajeError:
            error instanceof Error ? error.message : "No se pudo procesar el certificado.",
        });
      }

      completados += 1;
      setProgreso({ actual: completados, total: pendientes.length });
    }

    setProgreso(null);
    // Los que sí se enviaron desaparecen de la cola; los que fallaron se
    // quedan visibles, con su empresa/tipo ya elegidos, para reintentar
    // sin tener que volver a armarlos desde cero.
    setArchivos((prev) => prev.filter((a) => a.estado !== "enviado"));
    await loadHistory();
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // --- Piezas del historial compartidas entre la tabla (desktop) y las
  // tarjetas (mobile), para no duplicar la vista previa del correo (la
  // parte más grande) en dos lugares distintos.

  const renderBadgeTipo = (isPoda: boolean) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
        isPoda
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-blue-100 bg-blue-50 text-blue-700"
      }`}
    >
      {isPoda ? "🍃 PODA" : "📦 RESIDUOS"}
    </span>
  );

  const renderBadgeEstado = (cert: Certificate) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
        ESTADO_CERT_COLORS[cert.estado] ?? "border-gray-100 bg-gray-50 text-gray-600"
      }`}
    >
      {cert.estado === "PENDIENTE" && <FaSpinner className="animate-spin" />}
      {ESTADO_CERT_LABELS[cert.estado] ?? cert.estado}
    </span>
  );

  const renderDocumentoLink = (cert: Certificate) =>
    cert.urlArchivo ? (
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
    );

  const formatearFechaEnvio = (fechaEnvio: string) =>
    new Date(fechaEnvio).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const renderContenidoExpandido = (cert: Certificate, isPoda: boolean) => {
    if (cert.estado === "FALLIDO") {
      return (
        <div className="mx-auto my-2 max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-red-500 uppercase">
            <FaExclamationTriangle /> Este envío falló
          </div>
          <p className="text-sm text-red-800">
            {cert.errorDetalle ||
              "No se pudo completar el envío. Revisa el correo de alerta para más detalle."}
          </p>
        </div>
      );
    }

    if (cert.estado === "PENDIENTE") {
      return (
        <div className="mx-auto my-2 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-600 uppercase">
            <FaSpinner className="animate-spin" /> Este envío sigue en proceso
          </div>
          <p className="text-sm text-amber-800">
            Si lleva más de unos minutos así, probablemente el proceso se interrumpió — revisa si
            llegó un correo de alerta.
          </p>
        </div>
      );
    }

    return (
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
            Cordial saludo por parte del equipo técnico y administrativo de{" "}
            <strong>RECOVEN ECA SAS ESP</strong>.
          </p>
          <p className="mt-2 text-sm">
            De manera formal y en cumplimiento de los estándares operativos, ponemos a su
            disposición el{" "}
            <strong>
              {isPoda
                ? "Certificado de Manejo y Disposición Final de Residuos Orgánicos Aprovechables"
                : "Certificado de Manejo y Disposición Final de Residuos"}
            </strong>{" "}
            {isPoda
              ? "correspondiente a las actividades de poda ejecutadas en las zonas de recolección autorizadas."
              : "correspondiente a los proyectos corporativos especiales y de materiales diversos procesados en nuestras plantas de clasificación."}
          </p>
          <p className="mt-2 text-sm">
            {cert.urlArchivo ? (
              <>
                Aquí está el archivo:{" "}
                <a
                  href={cert.urlArchivo}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-emerald-600 underline"
                >
                  {cert.urlArchivo}
                </a>
              </>
            ) : (
              "Aquí está el archivo: (URL no disponible)"
            )}
          </p>
          <div className="my-5 rounded-lg border border-dashed border-emerald-500 bg-gray-50 p-5 text-center">
            <p className="m-0 mb-2.5 text-sm font-bold text-emerald-800">
              🔍 Verificación Digital con Código QR
            </p>
            <p className="m-0 mb-4 text-xs text-gray-600">
              También puede escanear el siguiente código QR con la cámara de su dispositivo móvil
              para acceder al documento:
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
          </div>
          <p className="mt-4 text-xs leading-relaxed text-gray-400">
            Agradecemos su confianza en nuestros servicios orientados al desarrollo de la economía
            circular, la transformación ecológica y la gestión ambiental responsable bajo el
            estricto cumplimiento de la normativa legal vigente de la República de Colombia.
          </p>
          <hr className="my-5 border-0 border-t border-gray-200" />
          <div className="space-y-1 text-center text-[11px] text-gray-400">
            <p className="m-0 font-bold text-gray-600">RECOVEN ECA SAS ESP</p>
            <p className="m-0">Barranquilla, Atlántico, Colombia</p>
            <p className="mt-2 font-medium text-amber-600">
              ⚠️ Por favor, no responda a este correo electrónico, es una notificación automatizada
              despachada por los sistemas centrales.
            </p>
          </div>
        </div>
      </>
    );
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

            {progreso && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <FaSpinner className="animate-spin text-lg" />
                <div>
                  <p className="font-bold">
                    Enviando {progreso.actual} de {progreso.total}...
                  </p>
                  <p className="mt-0.5 text-xs opacity-90">
                    Subiendo cada archivo y notificando a su empresa por correo — no cierres esta
                    ventana.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wider text-gray-700 uppercase">
                  Documentos del Certificado (.docx, .pdf)
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
                      agregarArchivos(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => document.getElementById("fileInput")?.click()}
                >
                  <input
                    type="file"
                    id="fileInput"
                    accept=".docx,.pdf"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-600 transition-transform group-hover:scale-110">
                    <FaCloudUploadAlt />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    Arrastra los archivos aquí o haz clic para explorar
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Puedes seleccionar varios a la vez — Word o PDF hasta 10MB cada uno
                  </p>
                </div>
              </div>

              {archivos.length > 0 && (
                <div className="space-y-3">
                  {archivos.map((a) => {
                    const bloqueado = a.estado === "enviando" || a.estado === "enviado";
                    return (
                      <div
                        key={a.id}
                        className={`rounded-xl border p-4 ${
                          a.estado === "error"
                            ? "border-red-200 bg-red-50"
                            : a.estado === "enviado"
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <FaFilePdf className="shrink-0 text-emerald-500" />
                            <span className="truncate text-sm font-semibold text-gray-800">
                              {a.file.name}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            {a.estado === "enviando" && (
                              <FaSpinner className="animate-spin text-blue-500" />
                            )}
                            {a.estado === "enviado" && (
                              <FaCheckCircle className="text-emerald-600" />
                            )}
                            {a.estado === "error" && (
                              <FaExclamationTriangle className="text-red-600" />
                            )}
                            {!bloqueado && (
                              <button
                                type="button"
                                onClick={() => quitarArchivo(a.id)}
                                className="text-gray-400 transition hover:text-red-600"
                                aria-label="Quitar archivo"
                              >
                                <FaTimes />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <select
                            value={a.empresaId}
                            onChange={(e) => actualizarArchivo(a.id, { empresaId: e.target.value })}
                            disabled={bloqueado}
                            required
                            className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-60"
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
                          <select
                            value={a.tipo}
                            onChange={(e) =>
                              actualizarArchivo(a.id, {
                                tipo: e.target.value as "PODA" | "RESIDUOS",
                              })
                            }
                            disabled={bloqueado}
                            required
                            className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-60"
                          >
                            <option value="PODA">🍃 Residuos de Poda</option>
                            <option value="RESIDUOS">📦 Residuos Aprovechables</option>
                          </select>
                        </div>
                        {a.estado === "error" && a.mensajeError && (
                          <p className="mt-2 text-xs font-medium text-red-700">{a.mensajeError}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleEnviarLote}
                  disabled={progreso !== null || archivos.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {progreso ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                  {progreso
                    ? "Enviando..."
                    : `Enviar ${archivos.length > 0 ? archivos.length : ""} Certificado${
                        archivos.length === 1 ? "" : "s"
                      }`}
                </button>
              </div>
            </div>
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
          {/* Tabla normal — solo desde md hacia arriba */}
          <div className="hidden overflow-x-auto md:block">
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
                          <td className="p-4">{renderBadgeTipo(isPoda)}</td>
                          <td className="p-4">{renderBadgeEstado(cert)}</td>
                          <td className="p-4 font-mono text-xs">{renderDocumentoLink(cert)}</td>
                          <td className="p-4 text-xs font-medium text-gray-500">
                            {formatearFechaEnvio(cert.fechaEnvio)}
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
                                {renderContenidoExpandido(cert, isPoda)}
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

          {/* Tarjetas — solo en mobile. Mismo contenido expandible que la
              tabla (renderContenidoExpandido), solo con otra disposición
              en la parte de arriba de cada tarjeta. */}
          <div className="divide-y divide-gray-100 md:hidden">
            {history.length === 0 ? (
              <p className="py-6 text-center text-gray-400">
                No se registran certificados emitidos recientemente.
              </p>
            ) : (
              history.map((cert) => {
                const isPoda = cert.tipo === "PODA";
                const isExpanded = expandedId === cert.id;
                return (
                  <div key={cert.id}>
                    <div className="cursor-pointer p-4" onClick={() => toggleExpand(cert.id)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-gray-900">{cert.empresa.nombre}</p>
                          <p className="truncate text-xs text-gray-400">{cert.empresa.correo}</p>
                        </div>
                        <button className="shrink-0 text-gray-400" aria-label="Ver detalle">
                          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {renderBadgeTipo(isPoda)}
                        {renderBadgeEstado(cert)}
                      </div>
                      <div className="mt-2 font-mono text-xs">{renderDocumentoLink(cert)}</div>
                      <div className="mt-1 text-xs font-medium text-gray-500">
                        {formatearFechaEnvio(cert.fechaEnvio)}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-4">
                        {renderContenidoExpandido(cert, isPoda)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
