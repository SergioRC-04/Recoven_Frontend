import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Cuánto tiempo, desde que se navega a un hash, se sigue corrigiendo el
// scroll si el alto de la página cambia (ver ResizeObserver más abajo).
// Suficiente margen para que una sección async típica (StatisticsSection
// pidiendo /metrics) termine de cargar en una conexión normal, sin quedar
// corrigiendo indefinidamente si el usuario ya se desplazó a otra parte.
const VENTANA_CORRECCION_MS = 2000;

export default function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      // Si NO hay hash, hacer scroll al tope de la página
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const elementId = location.hash.substring(1);

    const irAlElemento = () => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth" });
    };

    // Primer intento: mismo pequeño retraso de siempre para asegurar que
    // el elemento ya esté renderizado.
    const primerIntento = setTimeout(irAlElemento, 150);

    // Si una sección de MÁS ARRIBA del objetivo carga datos de forma
    // async y crece después de ese primer scroll (p. ej. StatisticsSection
    // terminando de traer /metrics), el alto de la página cambia y el
    // objetivo queda más abajo de donde se dejó el scroll — este observer
    // detecta ese cambio real de alto y vuelve a hacer scroll al mismo
    // elemento, en vez de depender de adivinar un timeout que alcance.
    const observer = new ResizeObserver(irAlElemento);
    observer.observe(document.body);

    // Pasada la ventana de corrección, se deja de reajustar — así no
    // compite con un desplazamiento manual del usuario más adelante.
    const dejarDeCorregir = setTimeout(() => observer.disconnect(), VENTANA_CORRECCION_MS);

    return () => {
      clearTimeout(primerIntento);
      clearTimeout(dejarDeCorregir);
      observer.disconnect();
    };
  }, [location]);

  return null;
}
