import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaBriefcase,
  FaHardHat,
  FaShip,
  FaIndustry,
  FaShieldAlt,
  FaGlobe,
  FaBolt,
  FaBuilding,
  FaCity,
  FaFlask,
  FaUtensils,
  FaUserShield,
  FaBalanceScale,
  FaHome,
  FaWater,
  FaWarehouse,
} from "react-icons/fa";

// Mapeo de nombres de iconos (sin el prefijo "fas ") a componentes React
const iconMap: Record<string, React.ElementType> = {
  "fa-briefcase": FaBriefcase,
  "fa-hard-hat": FaHardHat,
  "fa-ship": FaShip,
  "fa-industry": FaIndustry,
  "fa-shield-alt": FaShieldAlt,
  "fa-globe": FaGlobe,
  "fa-bolt": FaBolt,
  "fa-building": FaBuilding,
  "fa-city": FaCity,
  "fa-flask": FaFlask,
  "fa-utensils": FaUtensils,
  "fa-user-shield": FaUserShield,
  "fa-balance-scale": FaBalanceScale,
  "fa-home": FaHome,
  "fa-water": FaWater,
  "fa-warehouse": FaWarehouse,
};

// Datos de clientes (igual que en carousel.js)
const CLIENTS = [
  { icon: "fa-briefcase", label: "INSERMAS S.A.S" },
  { icon: "fa-hard-hat", label: "FSCR INGENIERÍA SAS NIT: 900160091-0" },
  { icon: "fa-ship", label: "SOCIEDAD PORTUARIA RIVERPOR NIT:830147612" },
  { icon: "fa-industry", label: "ITALCOL" },
  { icon: "fa-shield-alt", label: "ESCUELA ANTONIO NARIÑO POLICÍA NACIONAL" },
  { icon: "fa-globe", label: "COMERCIO EXTERIOR NUVIAS MILES" },
  { icon: "fa-bolt", label: "AIR-E" },
  { icon: "fa-building", label: "EDIFICIO TOLEDO" },
  { icon: "fa-city", label: "EDIFICIO MIRAMAR" },
  { icon: "fa-flask", label: "COSMETICO PINEDA" },
  { icon: "fa-utensils", label: "PRODISABOR" },
  { icon: "fa-user-shield", label: "HOLDING DE SEGURIDAD" },
  { icon: "fa-balance-scale", label: "CONSEJO SUPERIOR DE LA JUDICATURA" },
  { icon: "fa-home", label: "VILLAS DE SAN MARINO" },
  { icon: "fa-water", label: "VISTA DEL MAR" },
  { icon: "fa-building", label: "CONINSA" },
  { icon: "fa-warehouse", label: "MADRIGAL IV" },
];

export default function ClientsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentX, setCurrentX] = useState(0);
  const [halfWidth, setHalfWidth] = useState(0);
  const animationId = useRef<number | null>(null);

  // Refs para valores que cambian frecuentemente (evitan re-render)
  const pausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const speedRef = useRef(window.innerWidth < 768 ? 0.5 : 0.7);

  // Refs para arrastre
  const dragStartX = useRef(0);
  const positionBeforeDrag = useRef(0);

  // Duplicar array para loop infinito
  const allClients = [...CLIENTS, ...CLIENTS];

  // Función de animación (llamada recursiva con requestAnimationFrame)
  useEffect(() => {
    const animate = () => {
      if (!pausedRef.current && !isDraggingRef.current && halfWidth > 0) {
        setCurrentX((prev) => {
          let newX = prev + speedRef.current;
          if (newX >= halfWidth) {
            newX = 0;
          }
          return newX;
        });
      }
      animationId.current = requestAnimationFrame(animate);
    };

    animationId.current = requestAnimationFrame(animate);

    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
    };
  }, [halfWidth]); // Solo se reinicia si halfWidth cambia

  // Calcular halfWidth cuando el track esté montado
  useEffect(() => {
    if (trackRef.current) {
      const totalWidth = trackRef.current.scrollWidth;
      setHalfWidth(totalWidth / 2);
    }
  }, []);

  // Aplicar transformación al track
  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${currentX}px)`;
    }
  }, [currentX]);

  // ===== EVENTOS DE ARRASTRE =====
  const handleDragStart = useCallback(
    (clientX: number) => {
      isDraggingRef.current = true;
      dragStartX.current = clientX;
      positionBeforeDrag.current = currentX;
      pausedRef.current = true;
    },
    [currentX]
  );

  const handleDragMove = useCallback(
    (clientX: number) => {
      if (!isDraggingRef.current) return;

      const dragDelta = clientX - dragStartX.current;
      const newX = (positionBeforeDrag.current - dragDelta + halfWidth * 100) % halfWidth;

      setCurrentX(newX);
    },
    [halfWidth]
  );

  const handleDragEnd = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      pausedRef.current = false;
    }
  }, []);

  // Eventos mouse
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onMouseDown = (e: MouseEvent) => {
      handleDragStart(e.clientX);
      track.classList.add("cursor-grabbing");
      track.classList.remove("cursor-grab");
    };

    const onMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };

    const onMouseUp = () => {
      handleDragEnd();
      track.classList.remove("cursor-grabbing");
      track.classList.add("cursor-grab");
    };

    const onMouseLeave = () => {
      if (isDraggingRef.current) {
        handleDragEnd();
        track.classList.remove("cursor-grabbing");
        track.classList.add("cursor-grab");
      }
    };

    track.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    track.addEventListener("mouseleave", onMouseLeave);

    return () => {
      track.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      track.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  // Eventos touch
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onTouchStart = (e: TouchEvent) => {
      handleDragStart(e.touches[0].clientX);
      pausedRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      handleDragMove(e.touches[0].clientX);
    };

    const onTouchEnd = () => {
      handleDragEnd();
      pausedRef.current = false;
    };

    track.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      track.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  // Pausa en hover (desktop)
  const handleMouseEnter = () => {
    if (!isDraggingRef.current) pausedRef.current = true;
  };

  const handleMouseLeave = () => {
    if (!isDraggingRef.current) pausedRef.current = false;
  };

  return (
    <div className="carousel-container relative w-full overflow-hidden">
      <div
        ref={trackRef}
        className="flex w-max cursor-grab gap-8 select-none"
        style={{ willChange: "transform" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {allClients.map((client, index) => {
          const IconComponent = iconMap[client.icon];
          return (
            <div
              key={index}
              className="carousel-slide flex w-40 shrink-0 flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-2 py-4 shadow-sm md:w-44"
            >
              {IconComponent ? (
                <IconComponent className="text-primary-green mb-2 text-[2.5rem]" />
              ) : (
                <span className="text-4xl">🔵</span>
              )}
              <span className="text-center text-xs font-semibold text-gray-900">
                {client.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
