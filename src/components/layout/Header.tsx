import { useState, useEffect, useRef } from "react";
import { NavLink, Link } from "react-router-dom";
import { NAV_LINKS } from "../../constants/navigation";
import { FaCog, FaUserShield, FaTruck } from "react-icons/fa";

function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Cerrar el dropdown de ajustes al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white px-4 py-3 shadow-md md:px-6 lg:px-8 xl:px-16">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img
            src="/assets/img/logo.png"
            alt="RECOVEN ECA Logo"
            className="h-12 object-contain md:h-14"
          />
        </Link>

        {/* Navegación desktop */}
        <nav className="hidden space-x-4 font-semibold text-gray-700 md:flex lg:space-x-6">
          {NAV_LINKS.map((item) => {
            // "Contacto" no tiene estado activo (es un ancla)
            if (item.href === "/#contacto") {
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="hover:text-primary-green transition-colors duration-300"
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/"}
                className={({ isActive }) =>
                  `hover:text-primary-green transition-colors duration-300 ${
                    isActive ? "text-primary-green border-primary-green border-b-2" : ""
                  }`
                }
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Acciones desktop (CTA + Settings) */}
        <div className="hidden items-center space-x-4 md:flex">
          <a
            href="/#contacto"
            className="bg-primary-green hover:bg-opacity-90 flex items-center gap-2 rounded-full px-6 py-2 font-bold text-white shadow-md transition"
          >
            <FaTruck />
            Solicitar servicio
          </a>

          {/* Dropdown de configuración */}
          <div className="relative inline-block text-left" ref={settingsRef}>
            <button
              className="flex items-center justify-center rounded-full p-2 text-gray-500 transition-colors duration-300 hover:bg-gray-100 hover:text-emerald-600 focus:outline-none"
              aria-label="Configuración"
              aria-haspopup="true"
              aria-expanded={isSettingsOpen}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            >
              <FaCog className="text-xl transition-transform duration-300 hover:rotate-45" />
            </button>

            {isSettingsOpen && (
              <div
                className="animate-fadeIn absolute right-0 z-50 mt-2 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none"
                role="menu"
              >
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  <FaUserShield className="text-emerald-600" /> Panel Administrador
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Botón hamburguesa (móvil) */}
        <button
          className="flex flex-col gap-1.5 p-1 md:hidden"
          aria-label="Menú"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span
            className={`ham-line bg-primary-green block h-0.5 w-6 rounded transition-all duration-300 ${
              isMobileMenuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`ham-line bg-primary-green block h-0.5 w-6 rounded transition-all duration-300 ${
              isMobileMenuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`ham-line bg-primary-green block h-0.5 w-6 rounded transition-all duration-300 ${
              isMobileMenuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Menú móvil desplegable */}
      <div
        className={`mt-2 overflow-hidden border-t border-gray-100 bg-white px-4 transition-all duration-400 md:hidden ${
          isMobileMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col space-y-1 pt-3 pb-4">
          {NAV_LINKS.map((item) => {
            // "Contacto" no debe tener estado activo
            if (item.href === "/#contacto") {
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="rounded-lg px-2 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/"}
                className={({ isActive }) =>
                  `rounded-lg px-2 py-2 text-sm font-bold transition ${
                    isActive
                      ? "text-primary-green bg-green-50 font-bold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            );
          })}

          {/* Botón CTA en móvil */}
          <a
            href="/#contacto"
            className="bg-primary-green hover:bg-opacity-90 mt-2 flex items-center justify-center gap-2 rounded-full px-6 py-2 font-bold text-white shadow-md transition"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <FaTruck />
            Solicitar servicio
          </a>

          {/* Enlace a Panel Administrador en móvil */}
          <Link
            to="/dashboard"
            className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gray-50 p-3 text-sm font-bold text-gray-500 hover:text-emerald-700"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <FaUserShield className="text-emerald-600" /> Panel Administrador
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
