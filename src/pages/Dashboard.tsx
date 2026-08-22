import { useState } from "react";
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
} from "react-icons/fa";
import PqrsdfTable from "../components/admin/PqrsdfTable";
import AdminMicrorrutas from "../components/admin/AdminMicrorrutas";
import AdminRecyclers from "../components/admin/AdminRecyclers";

type Tab = "leads" | "metrics" | "documents" | "pqrsdf" | "microrrutas" | "recyclers";

export default function Dashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("leads");

  const tabs = [
    { id: "leads", label: "Solicitudes", icon: FaEnvelopeOpenText },
    { id: "metrics", label: "Actualizar Gráficas", icon: FaChartLine },
    { id: "documents", label: "Envío de Certificados", icon: FaFileUpload },
    { id: "pqrsdf", label: "PQRSDF", icon: FaClipboardList },
    { id: "microrrutas", label: "Microrrutas", icon: FaRoute },
    { id: "recyclers", label: "Recicladores", icon: FaRecycle },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="flex w-full flex-col border-r border-gray-800 bg-gray-900 text-white md:w-64">
        <div className="border-b border-gray-800 p-6">
          <h2 className="text-xl font-black tracking-wider text-emerald-500">RECOVEN ADMIN</h2>
          <p className="mt-0.5 text-xs text-gray-400">Panel de Control v1.0</p>
        </div>
        <nav className="flex-1 space-y-2 p-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
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
