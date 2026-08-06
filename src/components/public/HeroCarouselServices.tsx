import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/navigation";
import "swiper/css/pagination";
import {
  FaIndustry,
  FaTint,
  FaFileAlt,
  FaLeaf,
  FaPlusCircle,
  FaPaperPlane,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { useServicePreselect } from "../../hooks/useServicePreselect";
import { useNavigate } from "react-router-dom";

const slides = [
  {
    image: "/assets/img/slide1.avif",
    icon: FaIndustry,
    title: "Gestión de Residuos Aprovechables",
    description:
      "Recolección, clasificación y aprovechamiento de residuos reciclables del sector industrial, comercial y residencial, garantizando manejo responsable y trazabilidad ambiental.",
    serviceParam: "Gestión de Residuos Aprovechables",
  },
  {
    image: "/assets/img/slide2.avif",
    icon: FaTint,
    title: "Abonos & Sostenibilidad",
    description:
      "Conversión de poda en abono orgánico, siembra de árboles y desarrollo de iniciativas ambientales orientadas a la sostenibilidad y economía circular.",
    serviceParam: "Abonos & Sostenibilidad",
  },
  {
    image: "/assets/img/slide3.avif",
    icon: FaFileAlt,
    title: "Saneamiento & Manejo Ambiental",
    description:
      "Drenaje de aguas pluviales y arroyos, además de evacuación, transporte y disposición de lodos y aguas residuales domésticas e industriales.",
    serviceParam: "Saneamiento & Manejo Ambiental",
  },
  {
    image: "/assets/img/slide4.webp",
    icon: FaLeaf,
    title: "Recolección y Disposición Final de Poda",
    description:
      "Soluciones eficientes para la recolección y disposición de material vegetal proveniente de podas urbanas, jardines y zonas verdes.",
    serviceParam: "Recolección y Disposición Final de Poda",
  },
];

export default function HeroCarouselServices() {
  const { setPreselect } = useServicePreselect();
  const navigate = useNavigate();

  return (
    <section
      id="hero-carousel-container"
      className="flex min-h-[80vh] flex-col bg-gray-50 md:flex-row"
    >
      {/* Columna Izquierda: Hero Fijo */}
      <div className="hero-column from-primary-green bg-primary-green relative flex w-full items-center justify-center overflow-hidden p-8 text-center md:w-[35%] md:p-12 md:text-left">
        <div className="hero-content relative z-10 max-w-[90%] text-left">
          <span className="hero-badge border-accent/50 mb-6 inline-block rounded-full border bg-white/20 px-5 py-2 text-xs font-semibold tracking-widest text-white uppercase backdrop-blur-sm">
            Gestión Ambiental Integral
          </span>
          <h1 className="hero-title mb-2 text-5xl leading-tight font-black tracking-[-1px] text-white lg:text-[3.5rem]">
            Nuestros Servicios
          </h1>
          <p className="hero-subtitle mb-4 text-lg font-semibold text-white/90">
            Soluciones ambientales integrales para tu negocio y comunidad
          </p>
          <p className="hero-description mb-8 max-w-[85%] text-base leading-relaxed text-white/80">
            Especialistas en gestión de residuos sólidos aprovechables para sector industrial,
            comercial y residencial.
          </p>
          <a
            href="#servicios-complementarios"
            className="text-accent inline-flex items-center gap-2 font-semibold transition hover:gap-3"
          >
            <FaPlusCircle /> Servicios Complementarios
          </a>
        </div>
      </div>

      {/* Columna Derecha: Carrusel */}
      <div className="carousel-column relative w-full md:w-[65%]">
        <Swiper
          modules={[Autoplay, EffectFade, Navigation, Pagination]}
          effect="fade"
          autoplay={{ delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
          navigation={{
            nextEl: ".carousel-nav-next",
            prevEl: ".carousel-nav-prev",
          }}
          pagination={{ el: ".carousel-pagination", clickable: true }}
          loop
          speed={800}
          className="h-full"
        >
          {slides.map((slide, index) => {
            const Icon = slide.icon;
            return (
              <SwiperSlide key={index}>
                <div
                  className="carousel-slide relative flex h-full items-end justify-center bg-cover bg-center md:justify-start"
                  style={{ backgroundImage: `url(${slide.image})` }}
                >
                  <div className="carousel-overlay absolute inset-0 bg-black/65"></div>
                  <div className="carousel-content relative z-10 w-full p-6 text-center text-white md:p-12 md:text-left">
                    <Icon className="carousel-icon text-accent mb-4 text-5xl" />
                    <h3 className="carousel-title mb-3 text-3xl font-bold">{slide.title}</h3>
                    <p className="carousel-description mx-auto max-w-2xl text-base leading-relaxed opacity-90 md:mx-0">
                      {slide.description}
                    </p>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault(); // Evita recarga
                        setPreselect(undefined, slide.serviceParam);
                        navigate("/#contacto"); // Navegación SPA
                      }}
                      className="carousel-cta-button text-primary-green bg-accent mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold shadow-lg transition hover:-translate-y-1 hover:opacity-90"
                    >
                      <FaPaperPlane /> Solicitar
                    </a>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}

          {/* Flechas de navegación */}
          <button className="carousel-nav carousel-nav-prev absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur-sm transition hover:bg-white/40">
            <FaChevronLeft />
          </button>
          <button className="carousel-nav carousel-nav-next absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur-sm transition hover:bg-white/40">
            <FaChevronRight />
          </button>

          {/* Paginación (puntos) */}
          <div className="carousel-pagination absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2"></div>
        </Swiper>
      </div>
    </section>
  );
}
