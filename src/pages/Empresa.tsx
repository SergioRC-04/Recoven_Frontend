import { useEffect, useState } from "react";
import {
  FaRecycle,
  FaChalkboard,
  FaHandHoldingHeart,
  FaFileSignature,
  FaBuilding,
  FaQuoteLeft,
  FaChartLine,
  FaCheckCircle,
  FaHandshake,
  FaLeaf,
  FaUsers,
  FaCity,
  FaBriefcase,
  FaGlobeAmericas,
  FaGavel,
  FaFileInvoice,
  FaScroll,
  FaBalanceScale,
  FaLandmark,
  FaBook,
  FaPaste,
  FaClipboardList,
  FaStar,
  FaCogs,
  FaWarehouse,
  FaIndustry,
  FaHome,
  FaCheck,
} from "react-icons/fa";
import CTASection from "../components/public/CTASection";

function Empresa() {
  // Estado para tabs de Misión / Visión
  const [activeTab, setActiveTab] = useState<"mision" | "vision">("mision");

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
      {/* HERO BANNER */}
      <section
        className="relative bg-cover bg-center py-20 md:py-32"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(30, 90, 60, 0.88), rgba(20, 60, 40, 0.92)), url(/assets/img/hero-reciclaje.avif)",
          backgroundSize: "cover",
        }}
      >
        <div className="reveal container mx-auto px-6 text-center text-white">
          <span className="mb-5 inline-block rounded-full border border-white/30 bg-white/20 px-4 py-1.5 text-xs font-bold tracking-widest text-white uppercase">
            NIT 901.427.170-6
          </span>
          <h1 className="text-4xl leading-tight font-extrabold md:text-6xl">RECOVEN ECA SAS ESP</h1>
          <p className="mx-auto mt-4 max-w-xl text-xl opacity-90">
            Compromiso ambiental, desarrollo sostenible y responsabilidad social
          </p>
        </div>
      </section>

      {/* QUIÉNES SOMOS (versión completa) */}
      <section id="quienes-somos" className="bg-gray-50 py-20">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid items-start gap-12 md:grid-cols-2">
            {/* Columna texto */}
            <div className="reveal">
              <span className="text-primary-green text-sm font-bold tracking-wide uppercase">
                <FaRecycle className="mr-1 inline" /> Quiénes Somos
              </span>
              <h2 className="mt-2 text-3xl font-bold text-gray-800 md:text-4xl">
                Compromiso con la sostenibilidad y el desarrollo social
              </h2>
              <p className="mt-5 leading-relaxed text-gray-600">
                Somos una empresa legalmente constituida y prestadora del servicio público de aseo,
                dedicada a brindar soluciones ambientales integrales mediante planes, programas y
                proyectos orientados a la protección del medio ambiente, el desarrollo sostenible y
                el fortalecimiento de la economía circular.
              </p>
              <p className="mt-4 leading-relaxed text-gray-600">
                Nuestra labor se basa en la importancia de mantener espacios limpios y saludables,
                aportando al bienestar colectivo y a la sostenibilidad territorial. Nos
                especializamos en la gestión y aprovechamiento de residuos sólidos no peligrosos
                aprovechables, garantizando procesos de segregación adecuada y trazabilidad,
                facilitando el cumplimiento normativo de empresas del sector agroquímico ubicadas en
                zonas francas.
              </p>
              <p className="mt-4 leading-relaxed text-gray-600">
                Promovemos la dignificación del reciclador de oficio, la inclusión social y el
                aprovechamiento responsable de los recursos, posicionándonos como aliados
                estratégicos para el sector empresarial.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <FaChalkboard className="text-primary-green text-2xl" />
                  <span className="text-gray-700">Asesoría PGIRS y normatividad</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaHandHoldingHeart className="text-primary-green text-2xl" />
                  <span className="text-gray-700">Impacto social: jóvenes recicladores</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaFileSignature className="text-primary-green text-2xl" />
                  <span className="text-gray-700">Certificado disposición final</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaBuilding className="text-primary-green text-2xl" />
                  <span className="text-gray-700">Aliados zonas francas</span>
                </div>
              </div>
            </div>

            {/* TABS Misión / Visión */}
            <div className="reveal rounded-2xl bg-white p-6 shadow-xl md:p-8">
              <div className="flex space-x-2 border-b border-gray-200 pb-2">
                <button
                  onClick={() => setActiveTab("mision")}
                  className={`rounded-t-lg px-6 py-2 font-bold transition ${
                    activeTab === "mision"
                      ? "bg-primary-green border-accent border-b-2 text-white"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  📌 Misión
                </button>
                <button
                  onClick={() => setActiveTab("vision")}
                  className={`rounded-t-lg px-6 py-2 font-bold transition ${
                    activeTab === "vision"
                      ? "bg-primary-green border-accent border-b-2 text-white"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  🔭 Visión
                </button>
              </div>
              <div className="mt-6">
                {activeTab === "mision" && (
                  <div className="animate-fadeTab">
                    <FaQuoteLeft className="text-primary-green text-3xl opacity-30" />
                    <p className="mt-3 leading-relaxed text-gray-700 italic">
                      Nuestra misión es brindar el servicio de recolección a los ciudadanos del
                      sector industrial, comercial, público y de la salud a través del desarrollo
                      sostenible y sustentable, en el cual prestaremos de nuestros servicios
                      ambientales como parte fundamental al aprovechamiento en mercados en la
                      inclusión social, transformación, concientización, renovación y búsqueda de
                      alternativas más limpias y ecológicamente aceptables dentro de los procesos de
                      la manera como concientizar al ser humano en las practicas eco ambientales.
                    </p>
                  </div>
                )}
                {activeTab === "vision" && (
                  <div className="animate-fadeTab">
                    <FaChartLine className="text-primary-green text-3xl opacity-30" />
                    <p className="mt-3 leading-relaxed text-gray-700">
                      RECOVEN ECA SAS ESP busca ubicarse en el primer lugar entre las organizaciones
                      de su género, apoyados en la fortaleza del recurso humano, los deseos y
                      capacidad de sacar adelante los procesos que acometemos, buscando la
                      eficiencia, eficacia y calidad de los mismos que su vez repercuten en un
                      mejoramiento de las condiciones de vida de los ciudadanos y concientización en
                      torno a la protección del medio ambiente.
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-8 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FaCheckCircle className="text-primary-green" />
                  Certificados de cumplimiento ambiental – Resolución 1407/2018
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NUESTRO COMPROMISO CON EL RECICLAJE */}
      <section className="border-y border-gray-100 bg-linear-to-br from-gray-100 to-gray-50 py-20">
        <div className="container mx-auto px-6">
          <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
            {/* Imagen */}
            <div className="reveal">
              <div className="relative overflow-hidden rounded-3xl shadow-xl">
                <img
                  src="/assets/img/recycling-hands.avif"
                  alt="Jóvenes recicladores RECOVEN"
                  className="h-72 w-full object-cover md:h-96"
                />
              </div>
            </div>

            {/* Texto */}
            <div className="reveal">
              <span className="text-primary-green text-sm font-bold tracking-wide uppercase">
                <FaHandHoldingHeart className="mr-1 inline" /> Nuestro compromiso
              </span>
              <h2 className="mt-2 text-3xl font-bold text-gray-800 md:text-4xl">
                Con el Reciclaje
              </h2>
              <div className="border-primary-green mt-5 rounded-2xl border-l-4 bg-white p-6 shadow-md">
                <p className="leading-relaxed text-gray-700">
                  Estamos contribuyendo a un impacto positivo en la vida de muchos jóvenes con bajos
                  recursos, hijos de recicladores de oficio. Cada botella reciclada, cada papel
                  reutilizado y cada acción sostenible que realizamos se traduce en oportunidades
                  para que estos jóvenes puedan perseguir sus sueños de estudiar.
                </p>
                <p className="mt-4 leading-relaxed text-gray-700">
                  Juntos, estamos construyendo un futuro más brillante y sostenible.
                </p>
              </div>
              <p className="text-primary-green mt-5 text-lg font-bold">
                ¡Gracias por ser parte de esta causa!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ALIANZA PARA EL DESARROLLO SOSTENIBLE */}
      <section className="bg-white py-20">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Texto */}
            <div className="reveal">
              <span className="text-primary-green text-sm font-bold tracking-wide uppercase">
                <FaHandshake className="mr-1 inline" /> Alianzas estratégicas
              </span>
              <h2 className="mt-2 text-3xl font-bold text-gray-800 md:text-4xl">
                Alianza para el Desarrollo Sostenible
              </h2>
              <p className="mt-5 leading-relaxed text-gray-600">
                En RECOVEN creemos en el valor del trabajo conjunto entre las empresas y las
                comunidades como una herramienta para generar un impacto real y sostenible. Por
                ello, establecemos convenios con las
                <strong className="text-gray-800">Juntas de Acción Comunal</strong> que permiten
                desarrollar iniciativas enfocadas en:
              </p>
              <ul className="mt-5 space-y-3">
                <li className="flex items-start gap-3">
                  <FaLeaf className="text-primary-green mt-1 flex shrink-0" />
                  <span className="text-gray-600">El cuidado del medio ambiente</span>
                </li>
                <li className="flex items-start gap-3">
                  <FaRecycle className="text-primary-green mt-1 flex shrink-0" />
                  <span className="text-gray-600">
                    El aprovechamiento responsable de los residuos
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <FaUsers className="text-primary-green mt-1 flex shrink-0" />
                  <span className="text-gray-600">
                    El fortalecimiento social de los territorios
                  </span>
                </li>
              </ul>
              <p className="mt-5 leading-relaxed text-gray-600">
                A través de nuestros servicios, ayudamos a que las empresas puedan materializar sus
                compromisos de
                <strong className="text-gray-800">Responsabilidad Social Empresarial</strong>,
                participando activamente en proyectos que no solo aportan al desarrollo ambiental,
                sino que también benefician directamente a las comunidades y promueven una cultura
                de sostenibilidad y compromiso colectivo.
              </p>
            </div>

            {/* Tarjetas de impacto */}
            <div className="reveal grid grid-cols-1 gap-5">
              <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100">
                  <FaCity className="text-primary-green text-xl" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">Convenios con JAC</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Trabajo conjunto con Juntas de Acción Comunal para iniciativas de impacto
                    territorial real.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100">
                  <FaBriefcase className="text-primary-green text-xl" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">RSE Empresarial</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Materializamos los compromisos de Responsabilidad Social de tus aliados
                    corporativos.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100">
                  <FaGlobeAmericas className="text-primary-green text-xl" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">Cultura de sostenibilidad</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Promovemos el compromiso colectivo con el ambiente en comunidades y empresas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bodegas */}
      <section className="bg-primary-green border-t border-emerald-800/40 py-20 text-white">
        <div className="container mx-auto max-w-5xl px-6">
          {/* Encabezado */}
          <div className="reveal mb-12 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-[#16452e] px-4 py-1.5 text-xs font-semibold tracking-wider text-emerald-200 uppercase backdrop-blur-sm">
              <FaWarehouse className="mr-1 text-emerald-300" /> Infraestructura propia
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Nuestras Bodegas ECA
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-emerald-100/80">
              Contamos con instalaciones propias para la clasificación, acopio y disposición final
              de residuos sólidos.
            </p>
          </div>

          {/* Grid de Tarjetas */}
          <div className="grid gap-8 md:grid-cols-2">
            {/* Bodega 1 */}
            <div className="reveal overflow-hidden rounded-2xl border border-emerald-600/30 bg-[#16452e]/90 shadow-2xl backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1">
              <div
                className="relative flex h-48 items-center justify-center overflow-hidden"
                style={{
                  background: "url(/assets/img/bodega1.webp) center/cover",
                }}
              >
                {/* Overlay oscuro para garantizar contraste del texto sobre la foto */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-black/30" />

                <div className="relative z-10 text-center text-white">
                  <FaHome className="mx-auto mb-2 text-5xl drop-shadow-lg" />
                  <div className="text-xl font-extrabold tracking-wider text-white uppercase drop-shadow-md">
                    Bodega 1
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-white">
                  ECA de Residuos Aprovechables Residenciales
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-emerald-100/80">
                  Estación de Clasificación y Aprovechamiento especializada en el manejo de residuos
                  sólidos aprovechables provenientes del sector residencial: viviendas, conjuntos y
                  urbanizaciones.
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-emerald-50">
                  <li className="flex items-center gap-2.5">
                    <FaCheck className="shrink-0 text-amber-400" />
                    <span>Clasificación y segregación de materiales</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <FaCheck className="shrink-0 text-amber-400" />
                    <span>Plástico, cartón, vidrio, papel y metales</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <FaCheck className="shrink-0 text-amber-400" />
                    <span>Emisión de certificado de aprovechamiento</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bodega 2 */}
            <div className="reveal overflow-hidden rounded-2xl border border-emerald-600/30 bg-[#16452e]/90 shadow-2xl backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1">
              <div
                className="relative flex h-48 items-center justify-center overflow-hidden"
                style={{
                  background: "url(/assets/img/bodega2.webp) center/cover",
                }}
              >
                {/* Overlay oscuro para garantizar contraste del texto sobre la foto */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-black/30" />

                <div className="relative z-10 text-center text-white">
                  <FaIndustry className="mx-auto mb-2 text-5xl drop-shadow-lg" />
                  <div className="text-xl font-extrabold tracking-wider text-white uppercase drop-shadow-md">
                    Bodega 2
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-white">
                  Disposición Final de Residuos Industriales
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-emerald-100/80">
                  Instalación especializada en la recepción, clasificación y disposición final de
                  residuos industriales aprovechables, con capacidad para grandes volúmenes y
                  vehículos de carga pesada.
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-emerald-50">
                  <li className="flex items-center gap-2.5">
                    <FaCheck className="shrink-0 text-amber-400" />
                    <span>Residuos industriales aprovechables</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <FaCheck className="shrink-0 text-amber-400" />
                    <span>Materiales ferrosos y no ferrosos</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <FaCheck className="shrink-0 text-amber-400" />
                    <span>Certificado de Disposición Final empresarial</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PARA RECICLAR — SECCIÓN EDUCATIVA */}
      <section className="border-b border-gray-100 bg-linear-to-br from-gray-100 to-white py-20">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="reveal text-center">
            <span className="text-primary-green text-sm font-semibold tracking-wider uppercase">
              <FaRecycle className="mr-1 inline" /> Separa para reciclar
            </span>
            <h2 className="mt-2 text-3xl font-bold text-gray-800 md:text-4xl">Para Reciclar</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-gray-600">
              En RECOVEN SAS promovemos la correcta separación en la fuente como base fundamental
              del aprovechamiento de residuos. Una adecuada clasificación permite:
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="reveal rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <FaChartLine className="text-primary-green text-2xl" />
              </div>
              <h4 className="font-bold text-gray-800">Más material reciclable</h4>
              <p className="mt-2 text-sm text-gray-500">
                Aumenta el porcentaje de residuos que pueden volver al ciclo productivo.
              </p>
            </div>
            <div className="reveal rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <FaLeaf className="text-primary-green text-2xl" />
              </div>
              <h4 className="font-bold text-gray-800">Menos contaminación</h4>
              <p className="mt-2 text-sm text-gray-500">
                Reduce el impacto ambiental negativo en suelos, agua y aire.
              </p>
            </div>
            <div className="reveal rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <FaStar className="text-primary-green text-2xl" />
              </div>
              <h4 className="font-bold text-gray-800">Mejor calidad</h4>
              <p className="mt-2 text-sm text-gray-500">
                Mejora la calidad del material aprovechado para su reutilización.
              </p>
            </div>
            <div className="reveal rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <FaCogs className="text-primary-green text-2xl" />
              </div>
              <h4 className="font-bold text-gray-800">Optimiza la ECA</h4>
              <p className="mt-2 text-sm text-gray-500">
                Optimiza los procesos de la Estación de Clasificación y Aprovechamiento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* NORMATIVIDAD */}
      <section className="border-t border-b border-gray-100 bg-gray-50 py-16">
        <div className="container mx-auto px-6">
          <div className="reveal mb-10 text-center">
            <span className="text-primary-green text-sm font-semibold tracking-wider uppercase">
              <FaGavel className="mr-1 inline" /> Marco legal
            </span>
            <h2 className="mt-2 text-2xl font-bold text-gray-800 md:text-3xl">
              Cumplimos con la normatividad ambiental vigente
            </h2>
            <p className="mt-2 text-gray-500">
              Certificamos operaciones bajo estrictos marcos legales colombianos.
            </p>
          </div>
          <div className="reveal flex flex-wrap justify-center gap-3">
            <span className="hover:text-primary-green inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-green-100">
              <FaFileInvoice className="text-primary-green" />
              Resolución 3933 de 2025
            </span>
            <span className="hover:text-primary-green inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-green-100">
              <FaGavel className="text-primary-green" />
              Decreto 0271 del 17 de marzo de 2026
            </span>
            <span className="hover:text-primary-green inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-green-100">
              <FaScroll className="text-primary-green" />
              Resolución 1407 de 2018
            </span>
            <span className="hover:text-primary-green inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-green-100">
              <FaBalanceScale className="text-primary-green" />
              Decreto 596 de 2016
            </span>
            <span className="hover:text-primary-green inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-green-100">
              <FaLandmark className="text-primary-green" />
              Ley 142 de 1994
            </span>
            <span className="hover:text-primary-green inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-green-100">
              <FaBook className="text-primary-green" />
              Ley 1753 del 2015
            </span>
            <span className="hover:text-primary-green inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-green-100">
              <FaPaste className="text-primary-green" />
              Decreto 2412 de 2018
            </span>
            <span className="hover:text-primary-green inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-green-100">
              <FaClipboardList className="text-primary-green" />
              Resolución 2490
            </span>
          </div>
          <p className="mt-6 text-center text-sm text-gray-400">
            <FaCheckCircle className="text-primary-green mr-1 inline" />
            RECOVEN ECA E.S.P. desarrolla sus actividades bajo los lineamientos legales y
            ambientales exigidos por la normativa colombiana.
          </p>
        </div>
      </section>

      {/* CTA FINAL */}
      <CTASection />
    </main>
  );
}

export default Empresa;
