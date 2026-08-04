import { useEffect } from "react";
import { Link } from "react-router-dom";
import { FaHome, FaIndustry, FaLeaf, FaCertificate, FaArrowRight } from "react-icons/fa";
import ClientsCarousel from "../components/public/ClientsCarousel";
import ContactForm from "../components/public/ContactForm";

function Home() {
  // Efecto para la animación "reveal"
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

  return (
    <main>
      {/* HERO */}
      <section
        id="inicio"
        className="relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "linear-gradient(115deg, rgba(0, 0, 0, 0.65), rgba(0, 40, 20, 0.7)), url(/assets/img/hero-reciclaje.avif)",
        }}
      >
        <div className="container mx-auto px-6 py-24 md:py-32 lg:py-40">
          <div className="reveal max-w-2xl">
            <h2 className="text-4xl leading-tight font-extrabold text-white md:text-5xl lg:text-6xl">
              Recolección de residuos para
              <span className="text-accent"> hogares e industrias</span>
            </h2>
            <p className="mt-5 text-lg font-light text-gray-200">
              Ofrecemos servicio de recolección de residuos sólidos aprovechables y no
              aprovechables, con cobertura en Barranquilla, Puerto Colombia y próximamente más
              zonas.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#tipos-servicio"
                className="bg-primary-green hover:bg-opacity-90 relative inline-flex items-center gap-2 rounded-full px-7 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5 active:opacity-90"
                data-service="Servicio Residencial"
              >
                <FaHome /> Servicio Residencial
              </a>
              <a
                href="#tipos-servicio"
                className="border-accent hover:bg-accent relative inline-flex items-center gap-2 rounded-full border-2 px-7 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:text-gray-900 active:opacity-90"
                data-service="Servicio Industrial / Comercial"
              >
                <FaIndustry /> Servicio Industrial
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* EMPRESA MINI */}
      <section id="empresa-mini" className="overflow-hidden bg-gray-50 py-16 md:py-24">
        <div className="reveal container mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="relative w-full md:mx-auto md:max-w-md lg:col-span-5 lg:max-w-none">
              <div className="bg-primary-green/10 absolute -top-4 -left-4 -z-10 h-2/3 w-2/3 rounded-2xl transition-transform duration-300 hover:scale-105"></div>
              <div className="bg-accent/10 absolute -right-4 -bottom-4 -z-10 h-1/2 w-1/2 rounded-2xl"></div>

              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
                <img
                  src="/assets/img/empresa_mini.webp"
                  alt="Operación de Economía Circular RECOVEN"
                  className="h-75 w-full object-cover object-center transition-transform duration-500 hover:scale-105 md:h-95"
                  loading="lazy"
                />
              </div>

              <div className="absolute -right-2 bottom-6 flex max-w-55 items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-lg md:-right-6">
                <div className="bg-primary-green/10 text-primary-green flex shrink-0 items-center justify-center rounded-lg p-3 text-xl">
                  <FaCertificate />
                </div>
                <div>
                  <p className="text-xs leading-tight font-bold text-gray-900">Empresa ESP</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Regulada y certificada oficialmente
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 text-left lg:col-span-7">
              <div>
                <span className="text-primary-green inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-bold tracking-wider uppercase">
                  <FaLeaf className="text-xs" /> Nuestra empresa
                </span>
                <h2 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight text-gray-900 md:text-4xl">
                  Soluciones ambientales con
                  <span className="text-primary-green font-black"> responsabilidad social</span>
                </h2>
              </div>

              <div className="space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  Somos <strong className="font-semibold text-gray-900">RECOVEN ECA SAS ESP</strong>
                  , empresa prestadora del servicio público de aseo dedicada a brindar soluciones
                  ambientales integrales.
                </p>
                <p>
                  Especialistas en la gestión de residuos sólidos no peligrosos aprovechables con
                  énfasis estratégico en el
                  <strong className="font-semibold text-gray-900">
                    sector agroquímico y zonas francas
                  </strong>
                  . Promovemos activamente la dignificación del reciclador de oficio, la inclusión
                  social y el aprovechamiento responsable de los recursos de nuestra región.
                </p>
              </div>

              <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:gap-6">
                <Link
                  to="/empresa"
                  className="text-primary-green group hover:border-primary-green inline-flex items-center gap-2 border-b-2 border-transparent py-0.5 text-sm font-bold transition-all duration-200 md:text-base"
                >
                  Conoce más sobre nosotros
                  <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
                </Link>
                <span className="hidden text-gray-300 sm:inline">|</span>
                <Link
                  to="/servicios"
                  className="text-primary-green group hover:border-primary-green inline-flex items-center gap-2 border-b-2 border-transparent py-0.5 text-sm font-bold transition-all duration-200 md:text-base"
                >
                  Conoce nuestros servicios
                  <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TIPOS DE SERVICIO */}
      <section id="tipos-servicio" className="bg-white py-16">
        <div className="container mx-auto px-6">
          <div className="reveal mb-10 text-center">
            <span className="text-primary-green text-sm font-semibold tracking-wider uppercase">
              ¿Qué necesitas?
            </span>
            <h2 className="mt-2 text-3xl font-bold text-gray-800 md:text-4xl">
              Elige el servicio para ti
            </h2>
            <p className="mt-2 text-gray-500">
              Soluciones para el hogar y para el sector empresarial.
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            <div className="reveal border-primary-green rounded-[1.25rem] border-t-4 bg-white px-6 py-8 text-center shadow-md transition-all duration-250 hover:-translate-y-1 hover:shadow-2xl">
              <FaHome className="text-primary-green mx-auto mb-4 text-5xl" />
              <h3 className="mb-2 text-xl font-bold text-gray-800">Servicio Residencial</h3>
              <p className="mb-6 text-sm text-gray-600">
                Recolección en viviendas, conjuntos residenciales y urbanizaciones. Frecuencias
                flexibles (2 o 3 veces por semana) con altos estándares de limpieza.
              </p>
              <a
                href="#contacto"
                className="bg-primary-green hover:bg-opacity-90 relative block w-full rounded-xl px-6 py-3 font-bold text-white transition active:opacity-90"
                data-service="Servicio Residencial"
              >
                Solicitar servicio residencial →
              </a>
            </div>
            <div className="reveal border-accent rounded-[1.25rem] border-t-4 bg-white px-6 py-8 text-center shadow-md transition-all duration-250 hover:-translate-y-1 hover:shadow-2xl">
              <FaIndustry className="mx-auto mb-4 text-5xl" style={{ color: "#e4b363" }} />
              <h3 className="mb-2 text-xl font-bold text-gray-800">
                Servicio Industrial / Comercial
              </h3>
              <p className="mb-6 text-sm text-gray-600">
                Para fábricas, bodegas, centros comerciales, oficinas y zonas francas. Gestión de
                residuos aprovechables, no aprovechables y especiales.
              </p>
              <a
                href="#contacto"
                className="relative block w-full rounded-xl px-6 py-3 font-bold text-white transition hover:opacity-90 active:opacity-90"
                style={{ backgroundColor: "#e4b363" }}
                data-service="Servicio Industrial / Comercial"
              >
                Solicitar servicio industrial →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CLIENTES - CARRUSEL DINÁMICO */}
      <section id="clientes" className="bg-white py-16">
        <div className="container mx-auto px-6">
          <div className="reveal mb-8 text-center">
            <h3 className="text-2xl font-bold text-gray-800">Empresas que confían en RECOVEN</h3>
            <p className="text-gray-500">Aliados estratégicos en la gestión sostenible</p>
          </div>
          <ClientsCarousel />
        </div>
      </section>

      {/* CONTACTO - FORMULARIO */}
      <ContactForm />
    </main>
  );
}

export default Home;
