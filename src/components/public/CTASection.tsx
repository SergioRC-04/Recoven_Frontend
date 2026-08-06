import { FaPaperPlane, FaWhatsapp } from "react-icons/fa";

export default function CTASection() {
  return (
    <section className="bg-primary-green py-16">
      <div className="reveal container mx-auto px-6 text-center">
        <h2 className="text-3xl font-extrabold text-white md:text-4xl">
          ¿Listo para ser parte del cambio?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-white">
          Contáctanos y diseñamos juntos la solución ambiental que tu empresa o comunidad necesita.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href="/#contacto"
            className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-8 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/25"
          >
            <FaPaperPlane /> Solicitar servicio
          </a>
          <a
            href="https://wa.me/573046711126?text=Hola%2C%20me%20interesa%20solicitar%20un%20servicio%20de%20RECOVEN%20ECA."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-8 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/25"
          >
            <FaWhatsapp /> WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
