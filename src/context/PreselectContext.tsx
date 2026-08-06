import { createContext, useState, type ReactNode } from "react";

interface PreselectContextType {
  servicio: string;
  especialidad: string;
  setPreselect: (servicio?: string, especialidad?: string) => void;
}

// Función para leer valores iniciales (sessionStorage y URL)
function getInitialPreselect(): { servicio: string; especialidad: string } {
  // 1. Preselección de "servicio" desde sessionStorage
  const storedService = sessionStorage.getItem("recoven_preselect");
  // 2. Preselección de "especialidad" desde URL (parámetro ?service=)
  const params = new URLSearchParams(window.location.search);
  const serviceParam = params.get("service");

  // Limpiar sessionStorage y URL después de leerlos
  if (storedService) {
    sessionStorage.removeItem("recoven_preselect");
  }
  if (serviceParam) {
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.hash
    );
  }

  return {
    servicio: storedService || "",
    especialidad: serviceParam || "",
  };
}

const PreselectContext = createContext<PreselectContextType | undefined>(undefined);

interface PreselectProviderProps {
  children: ReactNode;
}

export function PreselectProvider({ children }: PreselectProviderProps) {
  // Inicializar estado directamente con los valores de sessionStorage y URL
  const [state, setState] = useState(() => getInitialPreselect());

  const setPreselect = (servicio?: string, especialidad?: string) => {
    setState((prev) => ({
      servicio: servicio !== undefined ? servicio : prev.servicio,
      especialidad: especialidad !== undefined ? especialidad : prev.especialidad,
    }));
  };

  return (
    <PreselectContext.Provider value={{ ...state, setPreselect }}>
      {children}
    </PreselectContext.Provider>
  );
}

// Exportamos solo el contexto (para uso en el hook)
export { PreselectContext };
