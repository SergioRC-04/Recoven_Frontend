// pages/PqrsdfPage.tsx
import { useEffect, useState } from "react";
import PqrsdfForm from "../components/public/PqrsdfForm";
import PqrsdfStatusChecker from "../components/public/PqrsdfStatusChecker";
import PrivacyPolicyModal from "../components/public/PrivacyPolicyModal";
import {
  FaBalanceScale,
  FaFileSignature,
  FaRegClock,
  FaWhatsapp,
  FaCheck,
  FaCopy,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";

export default function PqrsdfPage() {
  const [copied, setCopied] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [successRadicado, setSuccessRadicado] = useState<string | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("recovenecasasesp@gmail.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleFormSuccess = (radicado: string) => {
    setSuccessRadicado(radicado);
    setShowSuccessAlert(true);
    // Ocultar automáticamente después de 8 segundos
    setTimeout(() => {
      setShowSuccessAlert(false);
    }, 8000);
  };

  return (
    <main>
      {/* HERO */}
      <section
        className="relative bg-cover bg-center py-20 md:py-28"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(30, 90, 60, 0.88), rgba(20, 60, 40, 0.92)), url(/assets/img/hero-reciclaje.avif)",
          backgroundSize: "cover",
        }}
      >
        <div className="container mx-auto px-6 text-center text-white">
          <h1 className="text-4xl leading-tight font-extrabold md:text-5xl lg:text-6xl">
            Atención al Usuario
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">
            Radique su Petición, Queja, Reclamo, Sugerencia, Denuncia o Felicitación y haga
            seguimiento a su trámite.
          </p>
        </div>
      </section>

      {/* SECCIÓN A: Marco Legal */}
      <section className="bg-gray-50 py-12 md:py-16">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="reveal text-center">
            <h2 className="text-2xl font-bold text-gray-800 md:text-3xl">
              Marco Legal y Garantías
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-gray-600">
              RECOVEN ECA ESP actúa bajo el estricto cumplimiento de la normativa colombiana para
              servicios públicos.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="reveal rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <FaBalanceScale className="text-3xl text-emerald-600" />
              <h3 className="mt-3 text-lg font-bold text-gray-800">Ley 142 de 1994</h3>
              <p className="mt-1 text-sm text-gray-600">
                Régimen de Servicios Públicos Domiciliarios. Establece los derechos y deberes de los
                usuarios y las empresas prestadoras.
              </p>
            </div>
            <div className="reveal rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <FaRegClock className="text-3xl text-emerald-600" />
              <h3 className="mt-3 text-lg font-bold text-gray-800">Ley 1755 de 2015</h3>
              <p className="mt-1 text-sm text-gray-600">
                Términos para resolver las peticiones. La empresa cuenta con{" "}
                <strong>15 días hábiles</strong> para dar respuesta definitiva.
              </p>
            </div>
            <div className="reveal rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <FaFileSignature className="text-3xl text-emerald-600" />
              <h3 className="mt-3 text-lg font-bold text-gray-800">Ley 1581 de 2012</h3>
              <p className="mt-1 text-sm text-gray-600">
                Protección de Datos Personales (Habeas Data). Sus datos serán tratados con
                confidencialidad y seguridad.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN B: Formulario de Radicación */}
      <section className="bg-white py-12 md:py-16">
        <div className="container mx-auto max-w-4xl px-6">
          <div className="reveal text-center">
            <h2 className="text-2xl font-bold text-gray-800 md:text-3xl">Radicar PQRSDF</h2>
            <p className="mx-auto mt-2 max-w-2xl text-gray-600">
              Diligencie el formulario para enviar su solicitud. Recibirá un número de radicado para
              hacer seguimiento.
            </p>
          </div>
          <div className="reveal mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-md md:p-8">
            {/* Alerta de éxito */}
            {showSuccessAlert && successRadicado && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <FaCheckCircle className="mt-0.5 text-xl text-emerald-600" />
                <div className="flex-1">
                  <p className="font-bold text-emerald-800">¡Radicado exitoso!</p>
                  <p className="text-sm text-emerald-700">
                    Su solicitud ha sido radicada con el número:{" "}
                    <strong className="font-mono">{successRadicado}</strong>
                  </p>
                  <p className="mt-1 text-xs text-emerald-600">
                    Hemos enviado una copia de confirmación a su correo electrónico. Guarde el
                    número de radicado para hacer seguimiento.
                  </p>
                </div>
                <button
                  onClick={() => setShowSuccessAlert(false)}
                  className="text-emerald-500 hover:text-emerald-700"
                >
                  <FaTimes />
                </button>
              </div>
            )}
            <PqrsdfForm
              onSuccess={handleFormSuccess}
              onOpenPrivacyModal={() => setShowPrivacyModal(true)}
            />
          </div>
        </div>
      </section>

      {/* SECCIÓN C: Buscador de Estado */}
      <section className="bg-gray-50 py-12 md:py-16">
        <div className="container mx-auto max-w-4xl px-6">
          <div className="reveal text-center">
            <h2 className="text-2xl font-bold text-gray-800 md:text-3xl">
              Consultar Estado de Radicado
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-gray-600">
              Ingrese su número de radicado y su número de identificación para ver el estado actual
              de su solicitud.
            </p>
          </div>
          <div className="reveal mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-md md:p-8">
            <PqrsdfStatusChecker />
          </div>
        </div>
      </section>

      {/* CTA final (opcional, similar a otras páginas) */}
      <section className="bg-primary-green py-12">
        <div className="container mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-extrabold">¿Necesitas ayuda adicional?</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg">
            Comunícate con nuestro equipo de atención al usuario a través de nuestros canales
            oficiales.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button
              onClick={handleCopyEmail}
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-6 py-3 font-bold text-white transition hover:bg-white/25"
            >
              {copied ? (
                <>
                  <FaCheck /> ¡Copiado!
                </>
              ) : (
                <>
                  <FaCopy /> Copiar correo
                </>
              )}
            </button>
            <a
              href="https://wa.me/573046711126"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-6 py-3 font-bold transition hover:bg-white/25"
            >
              <FaWhatsapp className="text-xl" /> WhatsApp
            </a>
          </div>
        </div>
      </section>
      {/* Modal de política de privacidad (a nivel de página) */}
      <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
    </main>
  );
}
