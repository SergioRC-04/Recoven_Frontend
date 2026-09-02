import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import LeadsTable from "../components/admin/LeadsTable";
import MetricsManager from "../components/admin/MetricsManager";
import DocumentsManager from "../components/admin/DocumentsManager";
import {
  FaEnvelopeOpenText,
  FaChartLine,
  FaFileUpload,
  FaSignOutAlt,
  FaClipboardList,
  FaRoute,
  FaRecycle,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import PqrsdfTable from "../components/admin/PqrsdfTable";
import AdminMicrorrutas from "../components/admin/AdminMicrorrutas";
import AdminRecyclers from "../components/admin/AdminRecyclers";

type Tab = "leads" | "metrics" | "documents" | "pqrsdf" | "microrrutas" | "recyclers";

// Decodifica el payload de un JWT SIN verificarlo — no hace falta la clave
// secreta para esto, solo para firmar/verificar. El backend ya incrusta
// "exp" automáticamente porque JwtModule está configurado con
// signOptions: { expiresIn: '60m' } — este es el mismo valor real que usa
// el backend para expirar la sesión, no una copia que se pueda desincronizar.
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const payloadBase64 = token.split(".")[1];
    // JWT usa base64url (-/_ en vez de +//) — hay que normalizar antes de atob.
    const normalizado = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalizado)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function formatearTiempoRestante(ms: number): string {
  const totalSegundos = Math.max(0, Math.floor(ms / 1000));
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

export default function Dashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("leads");
  // Controla el menú tipo "drawer" solo en mobile. En desktop no se usa
  // (el sidebar siempre está visible ahí), pero lo dejamos en false por
  // defecto para que, si alguien reduce la ventana, no aparezca ya abierto.
  const [menuAbierto, setMenuAbierto] = useState(false);
  // null mientras no se ha podido leer el token/exp — el contador no se
  // muestra en ese caso, en vez de mostrar un "00:00" engañoso.
  const [tiempoRestanteMs, setTiempoRestanteMs] = useState<number | null>(null);

  // Cuenta regresiva real, leída del propio JWT — se actualiza cada
  // segundo y dispara logout() apenas llega a cero, para que lo que diga
  // el contador sea exactamente lo que pasa (no solo un aviso que se queda
  // en pantalla mientras la sesión sigue técnicamente viva más tiempo).
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return;

    const expiraEnMs = payload.exp * 1000;

    const actualizar = () => {
      const restante = expiraEnMs - Date.now();
      if (restante <= 0) {
        setTiempoRestanteMs(0);
        logout();
        return;
      }
      setTiempoRestanteMs(restante);
    };

    actualizar();
    const intervalo = setInterval(actualizar, 1000);
    return () => clearInterval(intervalo);
  }, [logout]);

  const tabs = [
    { id: "leads", label: "Solicitudes", icon: FaEnvelopeOpenText },
    { id: "metrics", label: "Actualizar Gráficas", icon: FaChartLine },
    { id: "documents", label: "Envío de Certificados", icon: FaFileUpload },
    { id: "pqrsdf", label: "PQRSDF", icon: FaClipboardList },
    { id: "microrrutas", label: "Microrrutas", icon: FaRoute },
    { id: "recyclers", label: "Recicladores", icon: FaRecycle },
  ];

  // Selecciona la pestaña y, en mobile, cierra el drawer de una vez — en
  // desktop este cierre no importa porque el sidebar nunca usa el drawer.
  const seleccionarTab = (tab: Tab) => {
    setActiveTab(tab);
    setMenuAbierto(false);
  };

  return (
    <div className="flex min-h-screen flex-col md:h-screen md:flex-row md:overflow-hidden">
      {/* Barra superior — solo en mobile. Sticky para que el título quede
          siempre visible aunque se haga scroll del contenido de abajo. */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 py-3 text-white md:hidden">
        <button
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          className="rounded-lg p-2 text-gray-300 transition hover:bg-gray-800 hover:text-white"
        >
          <FaBars className="text-lg" />
        </button>
        <div>
          <h2 className="text-lg font-black tracking-wider text-emerald-500">RECOVEN ADMIN</h2>
          <p className="text-[10px] text-gray-400">Panel de Control v2.0</p>
        </div>
      </header>

      {/* Fondo oscuro — solo en mobile, solo mientras el drawer está
          abierto. Tocarlo cierra el menú, igual que el botón de cerrar. */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* Sidebar. En mobile es un drawer superpuesto (fixed, se desliza
          desde la izquierda con translate-x) que no empuja ni reduce el
          contenido — en desktop, las clases md: lo devuelven a ser el
          sidebar estático de siempre, sin overlay ni animación. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] flex-col border-r border-gray-800 bg-gray-900 text-white transition-transform duration-200 ease-out md:static md:z-auto md:w-64 md:max-w-none md:shrink-0 md:translate-x-0 ${
          menuAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-800 p-6">
          <div>
            <h2 className="text-xl font-black tracking-wider text-emerald-500">RECOVEN ADMIN</h2>
            <p className="mt-0.5 text-xs text-gray-400">Panel de Control v2.0</p>
          </div>
          <button
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white md:hidden"
          >
            <FaTimes />
          </button>
        </div>
        <nav className="flex-1 space-y-2 p-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => seleccionarTab(tab.id as Tab)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon className="w-5 text-lg" />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-gray-800 p-4">
          {tiempoRestanteMs != null && (
            <p className="mb-2 text-center text-xs text-gray-400">
              Sesión expira en{" "}
              <span className="font-mono font-bold text-gray-200">
                {formatearTiempoRestante(tiempoRestanteMs)}
              </span>
            </p>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-900/40 px-4 py-2 text-sm font-bold text-red-200 transition hover:bg-red-900/60"
          >
            <FaSignOutAlt /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-10">
        {activeTab === "leads" && <LeadsTable />}
        {activeTab === "metrics" && <MetricsManager />}
        {activeTab === "documents" && <DocumentsManager />}
        {activeTab === "pqrsdf" && <PqrsdfTable />}
        {activeTab === "microrrutas" && <AdminMicrorrutas />}
        {activeTab === "recyclers" && <AdminRecyclers />}
      </main>
    </div>
  );
}
