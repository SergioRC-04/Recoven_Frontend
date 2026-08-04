import { FaWhatsapp } from "react-icons/fa";

function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/573046711126?text=Hola%2C%20me%20interesa%20solicitar%20un%20servicio%20de%20RECOVEN%20ECA."
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="whatsapp-fab fixed right-6 bottom-6 z-50 flex items-center gap-2.5 rounded-full bg-[#25d366] px-6 py-4 text-base font-bold text-white no-underline shadow-[0_8px_24px] shadow-green-400/40 transition duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-lg"
    >
      <FaWhatsapp className="text-2xl" />
      <span className="hidden sm:inline">Escríbenos</span>
    </a>
  );
}

export default WhatsAppButton;
