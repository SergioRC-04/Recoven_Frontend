import { createContext, useState, type ReactNode, useEffect } from "react";
import {
  login as loginService,
  verify2FA,
  resend2FA,
  logout as logoutService,
} from "../services/auth";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  verify2FA: (code: string) => Promise<void>;
  resend2FA: () => Promise<void>;
  logout: () => Promise<void>;
  username: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    const handleSessionExpired = () => {
      // Limpiar estado y token
      setToken(null);
      setUsername("");
      localStorage.removeItem("token");
      // Opcional: mostrar un mensaje o notificación
      // Puedes usar un toast o alert, o simplemente redirigir
    };

    // Escuchar el evento personalizado
    window.addEventListener("session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener("session-expired", handleSessionExpired);
    };
  }, []);

  const login = async (username: string, password: string) => {
    await loginService({ username, password });
    setUsername(username);
  };

  const verify2FAFn = async (code: string) => {
    const response = await verify2FA({ username, code });
    setToken(response.access_token);
  };

  const resend2FAFn = async () => {
    await resend2FA(username);
  };

  const logoutFn = async () => {
    try {
      await logoutService();
    } finally {
      setToken(null);
      setUsername("");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        login,
        verify2FA: verify2FAFn,
        resend2FA: resend2FAFn,
        logout: logoutFn,
        username,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
