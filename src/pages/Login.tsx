import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { FaEye, FaEyeSlash, FaSpinner, FaShieldAlt, FaPaperPlane } from "react-icons/fa";

export default function Login() {
  const navigate = useNavigate();
  const { login, verify2FA, resend2FA, isAuthenticated } = useAuth();
  const [step, setStep] = useState<"login" | "2fa">("login");
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Estados para controlar el reenvío
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Efecto para el contador de cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Si ya está autenticado, redirigir al dashboard
  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(formData.username, formData.password);
      setStep("2fa");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Credenciales incorrectas");
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await verify2FA(code);
      navigate("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Código inválido o expirado");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    // Evita múltiples envíos y respeta cooldown
    if (resending || cooldown > 0) return;

    setResending(true);
    try {
      await resend2FA();
      alert("Se ha enviado un nuevo código a su correo.");
      // Iniciar cooldown de 60 segundos después de un envío exitoso
      setCooldown(60);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Error al reenviar el código.");
      }
    } finally {
      setResending(false);
    }
  };

  if (step === "login") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">RECOVEN</h1>
            <p className="mt-1 text-sm font-semibold text-emerald-600">Administrador</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700">Usuario</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 transition focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Ingrese su usuario"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700">Contraseña</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full rounded-xl border border-gray-300 p-3 pr-10 transition focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-emerald-600 focus:outline-none"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-70"
            >
              {loading ? <FaSpinner className="animate-spin" /> : null}
              Iniciar Sesión <span className="ml-1">→</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Step 2FA
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-xl">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
          <FaShieldAlt />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Seguridad de la Cuenta</h2>
        <p className="mt-2 mb-6 text-sm text-gray-500">
          Hemos enviado un código de verificación de 6 dígitos a su correo electrónico
          institucional.
        </p>
        <form onSubmit={handle2FA} className="space-y-5">
          <div>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 p-3 text-center text-2xl font-bold tracking-widest transition focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="000000"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-70"
          >
            {loading ? <FaSpinner className="mr-2 inline animate-spin" /> : null}
            Verificar Código
          </button>
        </form>
        <div className="mt-4">
          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="flex w-full items-center justify-center gap-2 text-sm text-emerald-600 transition hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending ? (
              <>
                <FaSpinner className="animate-spin" /> Enviando...
              </>
            ) : cooldown > 0 ? (
              `Reenviar (${cooldown}s)`
            ) : (
              <>
                <FaPaperPlane /> Reenviar código
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
