import { useEffect, useRef } from "react";
import { FaTimes } from "react-icons/fa";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={modalRef}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <button
          onClick={onClose}
          className="sticky top-0 z-10 float-right rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
          aria-label="Cerrar"
        >
          <FaTimes className="text-lg" />
        </button>

        <div className="clear-both">
          <article className="prose prose-sm max-w-none text-gray-800">
            <h1 className="mb-4 text-2xl font-bold text-gray-900">
              Política de tratamiento y protección de datos personales
            </h1>
            <p className="text-sm text-gray-600">
              RECOVEN ECA SAS ESP — En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013
            </p>

            <section className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800">
                1. Identificación del responsable del tratamiento
              </h2>
              <p className="text-sm leading-relaxed">
                Razón Social: RECOVEN ECA SAS ESP. Naturaleza: Empresa de Servicios Públicos (ESP) /
                Estación de Clasificación y Aprovechamiento (ECA). Domicilio Principal:
                Barranquilla, Atlántico, Colombia. Correo de Protección de Datos:{" "}
                <a href="mailto:recovenecasasesp@gmail.com" className="text-blue-600 underline">
                  recovenecasasesp@gmail.com
                </a>
                . Sitio Web:{" "}
                <a
                  href="https://recovenesp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  https://recovenesp.com
                </a>
                .
              </p>
            </section>

            <section className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800">2. Marco legal aplicable</h2>
              <p className="text-sm leading-relaxed">
                Esta política se rige por la Ley Estatutaria 1581 de 2012 (protección de datos
                personales), el Decreto 1377 de 2013 (reglamentación parcial), la Ley 142 de 1994
                (régimen de servicios públicos), la Ley 1755 de 2015 (derecho de petición), la Ley
                1712 de 2014 (transparencia) y el Decreto 1078 de 2015 (TIC).
              </p>
            </section>

            <section className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800">3. Finalidad del tratamiento</h2>
              <p className="text-sm leading-relaxed">
                Los datos recolectados se utilizan para la gestión de PQRSDF (recepción, radicación,
                trámite, respuesta y seguimiento), cumplimiento normativo ante la SSPD, envío de
                notificaciones oficiales, coordinación operativa de rutas y servicios, mantenimiento
                de trazabilidad y auditoría, así como para análisis estadísticos y mejora continua.
              </p>
            </section>

            <section className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800">
                4. Derechos del titular (Habeas Data)
              </h2>
              <p className="text-sm leading-relaxed">
                El titular tiene derecho a conocer, actualizar, rectificar y suprimir sus datos, así
                como a solicitar prueba de la autorización, ser informado sobre el uso de sus datos,
                revocar la autorización y presentar quejas ante la Superintendencia de Industria y
                Comercio (SIC). El acceso a los datos es gratuito.
              </p>
            </section>

            <section className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800">
                5. Datos sensibles y de menores
              </h2>
              <p className="text-sm leading-relaxed">
                RECOVEN ECA SAS ESP no condiciona la atención de servicios ni la gestión de PQRSDF a
                la entrega de datos sensibles o de menores. Si el usuario adjunta voluntariamente
                documentos con esta información, serán tratados con estricta confidencialidad y
                seguridad.
              </p>
            </section>

            <section className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800">
                6. Procedimiento para ejercer los derechos
              </h2>
              <p className="text-sm leading-relaxed">
                Para consultar, actualizar, rectificar o solicitar la supresión de sus datos, el
                titular debe enviar un correo a{" "}
                <a href="mailto:recovenecasasesp@gmail.com" className="text-blue-600 underline">
                  recovenecasasesp@gmail.com
                </a>{" "}
                incluyendo nombre completo, número de identificación, correo de contacto y una
                descripción clara de la solicitud. La respuesta se dará en un plazo máximo de 10
                días hábiles para consultas y 15 días hábiles para reclamos.
              </p>
            </section>

            <section className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800">
                7. Seguridad de la información
              </h2>
              <p className="text-sm leading-relaxed">
                Se implementan medidas técnicas, administrativas y humanas para garantizar la
                seguridad de los registros, evitando adulteración, pérdida, consulta o acceso no
                autorizado, mediante arquitectura segura en la nube y protocolos criptográficos.
              </p>
            </section>

            <section className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800">8. Periodo de conservación</h2>
              <p className="text-sm leading-relaxed">
                Los datos se conservarán durante el tiempo necesario para cumplir con las
                finalidades descritas, de acuerdo con la Ley 594 de 2000 (archivística) y la
                normativa de servicios públicos. Una vez finalizada la relación, podrán conservarse
                hasta 5 años adicionales para atender obligaciones legales o requerimientos de
                autoridades.
              </p>
            </section>

            <section className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800">
                9. Transferencia y transmisión de datos
              </h2>
              <p className="text-sm leading-relaxed">
                RECOVEN ECA SAS ESP no transfiere ni transmite datos personales a terceros países
                sin el consentimiento del titular, salvo en los casos previstos por la ley, como
                contratos de servicios tecnológicos que impliquen almacenamiento en la nube, siempre
                que se garanticen estándares de protección equivalentes.
              </p>
            </section>

            <section className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800">
                10. Vigencia y actualizaciones
              </h2>
              <p className="text-sm leading-relaxed">
                Esta política entra en vigor a partir de su publicación en el sitio web
                institucional. Nos reservamos el derecho de modificarla para adaptarla a cambios
                normativos; la versión actualizada se publicará en este portal y se considerará
                aceptada si el titular continúa usando nuestros servicios.
              </p>
            </section>

            <footer className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
              <p>
                © {new Date().getFullYear()} RECOVEN ECA SAS ESP — Todos los derechos reservados.
              </p>
              <p className="mt-1">
                Esta política es vinculante y refleja nuestro compromiso con la protección de sus
                datos.
              </p>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}
