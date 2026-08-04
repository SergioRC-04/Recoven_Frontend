import { Link } from "react-router-dom";
import {
  FaRecycle,
  FaPhoneAlt,
  FaEnvelope,
  FaMapPin,
  FaWhatsapp,
  FaInstagram,
  FaFacebook,
} from "react-icons/fa";

function Footer() {
  return (
    <footer className="bg-gray-900 py-12 text-gray-300">
      <div className="container mx-auto grid gap-8 px-6 md:grid-cols-4">
        {/* Columna 1: Logo y descripción */}
        <div>
          <FaRecycle className="text-primary-green text-2xl" />
          <h4 className="mt-2 text-lg font-bold text-white">RECOVEN ECA E.S.P</h4>
          <p className="mt-1 text-sm">
            Soluciones ambientales con certificación y responsabilidad social.
          </p>
        </div>

        {/* Columna 2: Páginas */}
        <div>
          <h5 className="font-semibold text-white">Páginas</h5>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Link
                to="/"
                className="transition-colors duration-300 ease-in-out hover:text-green-900"
              >
                Inicio
              </Link>
            </li>
            <li>
              <Link
                to="/empresa"
                className="transition-colors duration-300 ease-in-out hover:text-green-900"
              >
                Nosotros
              </Link>
            </li>
            <li>
              <Link
                to="/servicios"
                className="transition-colors duration-300 ease-in-out hover:text-green-900"
              >
                Servicios
              </Link>
            </li>
            <li>
              <Link
                to="/#contacto"
                className="transition-colors duration-300 ease-in-out hover:text-green-900"
              >
                Contacto
              </Link>
            </li>
          </ul>
        </div>

        {/* Columna 3: Contacto directo + redes sociales */}
        <div>
          <h5 className="font-semibold text-white">Contacto directo</h5>
          <p className="mt-2 text-sm">
            <FaPhoneAlt className="mr-2 inline" />
            304 671 1126
            <br />
            <FaEnvelope className="mr-2 inline" />
            recovenecasasesp@gmail.com
            <br />
            <FaMapPin className="mr-2 inline" />
            Barranquilla / Puerto Colombia
          </p>
          <a
            href="https://wa.me/573046711126"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 text-sm font-semibold"
            style={{ color: "#25d366" }}
          >
            <FaWhatsapp className="text-lg" /> WhatsApp directo
          </a>
          <a
            href="https://www.instagram.com/recoveneca"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 text-sm font-semibold"
            style={{ color: "#e1306c" }}
          >
            <FaInstagram className="text-lg" /> @recoveneca
          </a>
          <a
            href="https://www.facebook.com/recoveneca"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 text-sm font-semibold"
            style={{ color: "#1877f2" }}
          >
            <FaFacebook className="text-lg" /> @recoveneca
          </a>
        </div>

        {/* Columna 4: Certificaciones */}
        <div>
          <h5 className="font-semibold text-white">Certificaciones</h5>
          <p className="mt-2 text-sm">
            ✔️ Registro como ECA
            <br />
            ✔️ Cumplimiento Res. 2184/2019
            <br />
            ✔️ Alianza sector zonas francas
          </p>
        </div>
      </div>

      {/* Línea de copyright */}
      <div className="mt-8 border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
        © 2026 RECOVEN ECA SAS ESP — Economía Circular y Desarrollo Sostenible.
      </div>
    </footer>
  );
}

export default Footer;
