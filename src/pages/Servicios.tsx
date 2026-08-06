import { useEffect } from "react";
import HeroCarouselServices from "../components/public/HeroCarouselServices";
import StatisticsSection from "../components/public/StatisticsSection";
import CTASection from "../components/public/CTASection";
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
  FaWarehouse,
  FaIndustry,
  FaHome,
  FaCheck,
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

      {/* Código de Colores */}
      <section className="bg-gray-900 py-16">
        <div className="container mx-auto max-w-4xl px-6">
          <div className="reveal mb-10 text-center">
            <span className="text-sm font-bold tracking-wider text-gray-400 uppercase">
              Resolución 2184 de 2019
            </span>
            <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">Código de Colores</h2>
            <p className="mt-2 text-gray-400">Más que una obligación, reciclar es una necesidad.</p>
          </div>
          <div className="reveal grid gap-6 md:grid-cols-3">
            {/* Blanco */}
            <div
              className="rounded-lg p-6 text-center text-white"
              style={{ background: "#3f4d61" }}
            >
              <div className="mb-3 h-48 w-full">
                <img
                  src="/assets/contenedor-blanco.svg"
                  alt="Contenedor blanco reciclaje"
                  className="h-full w-full object-contain"
                />
              </div>
              <h4 className="mb-2 text-base font-bold">Residuos Aprovechables</h4>
              <ul className="m-0 list-none p-0 text-sm opacity-90">
                <li>Plástico</li>
                <li>Cartón</li>
                <li>Vidrio</li>
                <li>Papel</li>
                <li>Metales</li>
              </ul>
              <div className="mt-3 text-xs font-bold tracking-widest uppercase opacity-70">
                Caneca blanca o gris
              </div>
            </div>
            {/* Verde */}
            <div
              className="rounded-lg p-6 text-center text-white"
              style={{ background: "#3f4d61" }}
            >
              <div className="mb-3 h-48 w-full">
                <img
                  src="/assets/contenedor-verde.svg"
                  alt="Contenedor verde reciclaje"
                  className="h-full w-full object-contain"
                />
              </div>
              <h4 className="mb-2 text-base font-bold">Residuos Orgánicos Aprovechables</h4>
              <ul className="m-0 list-none p-0 text-sm opacity-90">
                <li>Restos de comida</li>
                <li>Desechos agrícolas</li>
              </ul>
              <div className="mt-3 text-xs font-bold tracking-widest uppercase opacity-70">
                Caneca verde
              </div>
            </div>
            {/* Negro */}
            <div
              className="rounded-lg p-6 text-center text-white"
              style={{ background: "#3f4d61" }}
            >
              <div className="mb-3 h-48 w-full">
                <img
                  src="/assets/contenedor-negro.svg"
                  alt="Contenedor negro reciclaje"
                  className="h-full w-full object-contain"
                />
              </div>
              <h4 className="mb-2 text-base font-bold">Residuos No Aprovechables</h4>
              <ul className="m-0 list-none p-0 text-sm opacity-90">
                <li>Papel higiénico</li>
                <li>Servilletas</li>
                <li>Papeles contaminados</li>
                <li>Papeles metalizados</li>
              </ul>
              <div className="mt-3 text-xs font-bold tracking-widest uppercase opacity-70">
                Caneca negra
              </div>
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

      {/* Bodegas */}
      <section className="bg-white py-20">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="reveal mb-12 text-center">
            <span className="text-primary-green inline-flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
              <FaWarehouse className="mr-1" /> Infraestructura propia
            </span>
            <h2 className="mt-2 text-3xl font-bold text-gray-800 md:text-4xl">
              Nuestras Bodegas ECA
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-gray-600">
              Contamos con instalaciones propias para la clasificación y disposición final de
              residuos.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Bodega 1 */}
            <div className="reveal overflow-hidden rounded-2xl border border-gray-100 shadow-lg">
              <div
                className="flex h-48 items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(30, 90, 60, 0.75), rgba(45, 122, 80, 0.75)), url(/assets/img/bodega1.webp) center/cover",
                }}
              >
                <div className="text-center text-white">
                  <FaHome className="mx-auto mb-2 text-5xl opacity-80"></FaHome>
                  <div className="text-xl font-extrabold tracking-wide uppercase">Bodega 1</div>
                </div>
              </div>
              <div className="bg-white p-6">
                <h3 className="text-xl font-bold text-gray-800">
                  ECA de Residuos Aprovechables Residenciales
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  Estación de Clasificación y Aprovechamiento especializada en el manejo de residuos
                  sólidos aprovechables provenientes del sector residencial: viviendas, conjuntos y
                  urbanizaciones.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-primary-green"></FaCheck>Clasificación y segregación de
                    materiales
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-primary-green"></FaCheck>Plástico, cartón, vidrio,
                    papel y metales
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-primary-green"></FaCheck>Emisión de certificado de
                    aprovechamiento
                  </li>
                </ul>
              </div>
            </div>

            {/* Bodega 2 */}
            <div className="reveal overflow-hidden rounded-2xl border border-gray-100 shadow-lg">
              <div
                className="flex h-48 items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(146, 64, 14, 0.75), rgba(180, 83, 9, 0.75)), url(/assets/img/bodega2.webp) center/cover",
                }}
              >
                <div className="text-center text-white">
                  <FaIndustry className="mx-auto mb-2 text-5xl opacity-80"></FaIndustry>
                  <div className="text-xl font-extrabold tracking-wide uppercase">Bodega 2</div>
                </div>
              </div>
              <div className="bg-white p-6">
                <h3 className="text-xl font-bold text-gray-800">
                  Disposición Final de Residuos Industriales
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  Instalación especializada en la recepción, clasificación y disposición final de
                  residuos industriales aprovechables, con capacidad para grandes volúmenes y
                  vehículos de carga pesada.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <FaCheck style={{ color: "#b45309" }}></FaCheck>Residuos industriales
                    aprovechables
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck style={{ color: "#b45309" }}></FaCheck>Materiales ferrosos y no
                    ferrosos
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck style={{ color: "#b45309" }}></FaCheck>Certificado de Disposición Final
                    empresarial
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StatisticsSection />

      <CTASection />
    </main>
  );
}
