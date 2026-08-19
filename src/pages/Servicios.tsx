import { useEffect } from "react";
import HeroCarouselServices from "../components/public/HeroCarouselServices";
import CTASection from "../components/public/CTASection";
import MapaServicios from "../components/public/MapaServicios";
import { useServicePreselect } from "../hooks/useServicePreselect";
import { useNavigate } from "react-router-dom";

import {
  FaMapMarkedAlt,
  FaProjectDiagram,
  FaChalkboardTeacher,
  FaTractor,
  FaHardHat,
  FaCertificate,
  FaCogs,
  FaLeaf,
  FaRoad,
  FaCheckCircle,
  FaTruck,
  FaPlusCircle,
} from "react-icons/fa";

export default function Servicios() {
  const { setPreselect } = useServicePreselect();
  const navigate = useNavigate();

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
      <HeroCarouselServices />

      {/* Limpieza de Bermas */}
      <section className="bg-white py-20">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="reveal">
              <img
                src="/assets/img/limipieza_bermas.png"
                alt="Limpieza de bermas RECOVEN"
                className="h-72 w-full rounded-2xl object-cover shadow-lg"
              />
            </div>
            <div className="reveal">
              <span className="text-primary-green text-sm font-bold tracking-wide uppercase">
                <FaRoad className="mr-1 inline" /> Infraestructura vial
              </span>
              <h2 className="mt-2 text-3xl font-bold text-gray-800 md:text-4xl">
                Limpieza y Mantenimiento de Bermas
              </h2>
              <p className="mt-5 leading-relaxed text-gray-600">
                RECOVEN SAS presta el servicio de limpieza y mantenimiento de bermas, áreas verdes y
                zonas perimetrales, contribuyendo a la conservación del entorno, la seguridad vial y
                el control de residuos sólidos en espacios públicos y privados.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3">
                  <FaCheckCircle className="text-primary-green" />
                  <span className="text-gray-700">Limpieza de zonas perimetrales</span>
                </li>
                <li className="flex items-center gap-3">
                  <FaCheckCircle className="text-primary-green" />
                  <span className="text-gray-700">Mantenimiento de áreas verdes</span>
                </li>
                <li className="flex items-center gap-3">
                  <FaCheckCircle className="text-primary-green" />
                  <span className="text-gray-700">Control de residuos en vías públicas</span>
                </li>
                <li className="flex items-center gap-3">
                  <FaCheckCircle className="text-primary-green" />
                  <span className="text-gray-700">Conservación del entorno y seguridad vial</span>
                </li>
              </ul>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault(); // Evita recarga
                  setPreselect(undefined, "Limpieza y Mantenimiento de Bermas");
                  navigate("/#contacto"); // Navegación SPA
                }}
                className="bg-primary-green hover:bg-opacity-90 mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3 font-bold text-white shadow-md transition hover:-translate-y-0.5"
              >
                <FaTruck /> Solicitar este servicio
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios Complementarios */}
      <section id="servicios-complementarios" className="bg-gray-50 py-20">
        <div className="container mx-auto px-6">
          <div className="reveal mx-auto mb-12 max-w-2xl text-center">
            <span className="text-primary-green inline-flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
              <FaPlusCircle /> Más servicios
            </span>
            <h2 className="mt-2 text-3xl font-bold text-gray-800 md:text-4xl">
              Servicios Complementarios
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-gray-600">
              Ampliamos nuestra oferta para cubrir todas las necesidades ambientales de su
              organización.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: FaMapMarkedAlt,
              title: "Planes Parciales de Desarrollo",
              desc: "Formulación de planes parciales de desarrollo municipal, regional y nacional.",
              bg: "bg-green-100",
              color: "text-primary-green",
            },
            {
              icon: FaProjectDiagram,
              title: "Proyectos Ambientales",
              desc: "Formulación de proyectos ambientales municipales, departamentales y nacionales.",
              bg: "bg-green-100",
              color: "text-primary-green",
            },
            {
              icon: FaChalkboardTeacher,
              title: "Educación y Cultura Ambiental",
              desc: "Proyectos de educación y cultura ambiental.",
              bg: "bg-green-100",
              color: "text-primary-green",
            },
            {
              icon: FaTractor,
              title: "Proyectos Agropecuarios",
              desc: "Diseño y asistencia en proyectos agropecuarios y agroindustriales sostenibles.",
              bg: "bg-green-100",
              color: "text-primary-green",
            },
            {
              icon: FaHardHat,
              title: "Residuos en Obras Civiles",
              desc: "Gestión de residuos sólidos aprovechables para construcciones, viviendas y obras civiles.",
              bg: "bg-green-100",
              color: "text-primary-green",
            },
            {
              icon: FaCertificate,
              title: "Certificados de Disposición Final",
              desc: "Emisión de certificados de disposición final de residuos aprovechables.",
              bg: "bg-yellow-50",
              color: "text-yellow-600",
            },
            {
              icon: FaCogs,
              title: "Asesoría en PGIRS",
              desc: "Asesoría en implementación y actualización de PGIRS.",
              bg: "bg-green-100",
              color: "text-primary-green",
            },
            {
              icon: FaLeaf,
              title: "Gestión Ambiental Integral",
              desc: "Soluciones ambientales para empresas y comunidades mediante programas de limpieza, aprovechamiento de residuos y fortalecimiento de prácticas sostenibles.",
              bg: "bg-green-100",
              color: "text-primary-green",
            },
          ].map((service, idx) => {
            const Icon = service.icon;
            return (
              <div
                key={idx}
                className="reveal flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${service.bg}`}
                >
                  <Icon className={`text-lg ${service.color}`} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">{service.title}</h4>
                  <p className="mt-1 text-xs text-gray-500">{service.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mapa de Servicios */}
      <MapaServicios />

      {/* Código de Colores */}
      <section className="bg-gray-50 py-16 text-gray-800">
        <div className="container mx-auto max-w-5xl px-6">
          {/* Encabezado */}
          <div className="reveal mb-12 text-center">
            <span className="rounded-full border border-emerald-200 bg-emerald-100/80 px-3 py-1 text-xs font-bold tracking-wider text-emerald-700 uppercase">
              Resolución 2184 de 2019
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-gray-900 md:text-4xl">
              Código de Colores
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-base text-gray-600">
              Más que una obligación, reciclar es una necesidad. Conoce la separación adecuada de
              residuos en la fuente.
            </p>
          </div>

          {/* Grid de Tarjetas */}
          <div className="reveal grid gap-8 md:grid-cols-3">
            {/* Blanco - Residuos Aprovechables */}
            <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <div>
                <div className="mb-4 flex h-48 w-full items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <img
                    src="/assets/contenedor-blanco.svg"
                    alt="Contenedor blanco reciclaje"
                    className="h-full w-full object-contain"
                  />
                </div>
                <h4 className="mb-3 text-lg font-bold text-gray-900">Residuos Aprovechables</h4>
                <ul className="m-0 list-none space-y-1.5 p-0 text-sm text-gray-600">
                  <li>Plástico</li>
                  <li>Cartón</li>
                  <li>Vidrio</li>
                  <li>Papel</li>
                  <li>Metales</li>
                </ul>
              </div>
              <div className="mt-6 rounded-lg bg-gray-100 py-2 text-xs font-bold tracking-wider text-gray-700 uppercase">
                Caneca Blanca
              </div>
            </div>

            {/* Verde - Residuos Orgánicos */}
            <div className="flex flex-col justify-between rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <div>
                <div className="mb-4 flex h-48 w-full items-center justify-center rounded-xl border border-emerald-100/60 bg-emerald-50/50 p-4">
                  <img
                    src="/assets/contenedor-verde.svg"
                    alt="Contenedor verde reciclaje"
                    className="h-full w-full object-contain"
                  />
                </div>
                <h4 className="mb-3 text-lg font-bold text-gray-900">Orgánicos Aprovechables</h4>
                <ul className="m-0 list-none space-y-1.5 p-0 text-sm text-gray-600">
                  <li>Restos de comida</li>
                  <li>Desechos agrícolas</li>
                  <li>Cáscaras y frutas</li>
                </ul>
              </div>
              <div className="mt-6 rounded-lg bg-emerald-100/70 py-2 text-xs font-bold tracking-wider text-emerald-800 uppercase">
                Caneca Verde
              </div>
            </div>

            {/* Negro - Residuos No Aprovechables */}
            <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <div>
                <div className="mb-4 flex h-48 w-full items-center justify-center rounded-xl border border-gray-200/60 bg-gray-100/60 p-4">
                  <img
                    src="/assets/contenedor-negro.svg"
                    alt="Contenedor negro reciclaje"
                    className="h-full w-full object-contain"
                  />
                </div>
                <h4 className="mb-3 text-lg font-bold text-gray-900">No Aprovechables</h4>
                <ul className="m-0 list-none space-y-1.5 p-0 text-sm text-gray-600">
                  <li>Papel higiénico</li>
                  <li>Servilletas usadas</li>
                  <li>Papeles contaminados</li>
                  <li>Empaques metalizados</li>
                </ul>
              </div>
              <div className="mt-6 rounded-lg bg-gray-800 py-2 text-xs font-bold tracking-wider text-white uppercase">
                Caneca Negra
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
