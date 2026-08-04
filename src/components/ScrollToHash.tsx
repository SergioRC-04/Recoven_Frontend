import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      // Si hay hash, buscar el elemento y hacer scroll hacia él
      const elementId = location.hash.substring(1);
      const element = document.getElementById(elementId);
      if (element) {
        // Pequeño retraso para asegurar que el elemento esté renderizado
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    } else {
      // Si NO hay hash, hacer scroll al tope de la página
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location]);

  return null;
}
