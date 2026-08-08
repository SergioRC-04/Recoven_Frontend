import { useEffect, useState } from "react";
import { getLeads, exportLeadsExcel } from "../../services/leads";
import type { Lead } from "../../types/lead";
import { FaFileExcel, FaSpinner } from "react-icons/fa";

export default function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadLeads = async () => {
    try {
      const data = await getLeads();
      setLeads(data);
    } catch (error) {
      console.error("Error cargando leads:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLeads();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportLeadsExcel();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Leads_RECOVEN_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exportando:", error);
      alert("No se pudo exportar el archivo Excel.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="py-10 text-center">Cargando solicitudes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Solicitudes Recientes</h1>
          <p className="text-sm text-gray-500">
            Gestión de clientes potenciales registrados desde la landing page.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-70"
        >
          {exporting ? <FaSpinner className="animate-spin" /> : <FaFileExcel />}
          Exportar a Excel
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                <th className="p-4">Cliente</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Servicio</th>
                <th className="p-4">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-400">
                    No hay solicitudes registradas.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="transition hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{lead.nombre}</div>
                      <div className="text-xs text-gray-400">{lead.empresa || "Particular"}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-700">{lead.telefono}</div>
                      <div className="text-xs text-gray-500">{lead.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        {lead.servicio}
                      </span>
                    </td>
                    <td
                      className="max-w-xs truncate p-4 text-xs text-gray-500"
                      title={lead.mensaje || ""}
                    >
                      {lead.mensaje || <span className="text-gray-300">Sin detalles</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
