import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { fetchMetrics, downloadMetricsPDF, type Metric } from "../../services/metrics";
import { FaChartBar, FaWarehouse, FaFilePdf, FaSpinner } from "react-icons/fa";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MONTHS_ORDER = ["Enero", "Febrero", "Marzo", "Abril"];

const COLORS = {
  aprovechamiento: "#10b981",
  rechazo: "#cbd5e1",
};

const StatisticsSection: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Metric[]>([]);
  const [downloading, setDownloading] = useState(false);

  // 1. Carga de datos
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const metrics = await fetchMetrics();
        const sorted = metrics.sort(
          (a, b) => MONTHS_ORDER.indexOf(a.mes) - MONTHS_ORDER.indexOf(b.mes)
        );
        setData(sorted);
        setError(null);
      } catch (err) {
        setError("Error al cargar los datos. Por favor, intente de nuevo.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 2. Observer para animación reveal
  useEffect(() => {
    if (!loading && data.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
            }
          });
        },
        { threshold: 0.1 }
      );

      document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

      return () => observer.disconnect();
    }
  }, [loading, data]);

  // 3. Agrupar datos por sede
  const groupBySede = (metrics: Metric[]) => {
    const groups: Record<string, Metric[]> = {};
    metrics.forEach((metric) => {
      if (!groups[metric.sede]) groups[metric.sede] = [];
      groups[metric.sede].push(metric);
    });
    return groups;
  };

  // 4. Preparar datos para Chart.js
  const prepareChartData = (sedeMetrics: Metric[]) => {
    const months = sedeMetrics.map((m) => m.mes);
    const aprovechamiento = sedeMetrics.map((m) => m.aprovechamiento);
    const rechazo = sedeMetrics.map((m) => m.rechazo);

    return {
      labels: months,
      datasets: [
        {
          label: "Aprovechamiento (Ton)",
          data: aprovechamiento,
          backgroundColor: COLORS.aprovechamiento,
          borderColor: COLORS.aprovechamiento,
          borderWidth: 1,
        },
        {
          label: "Rechazo (Ton)",
          data: rechazo,
          backgroundColor: COLORS.rechazo,
          borderColor: COLORS.rechazo,
          borderWidth: 1,
        },
      ],
    };
  };

  // 5. Opciones de la gráfica (con labels en negrita)
  const chartOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          pointStyle: "rectRounded",
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"bar">) => {
            const label = context.dataset.label || "";
            const value = context.raw as number;
            return `${label}: ${value.toLocaleString()} Ton`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: "rgba(0,0,0,0.05)",
        },
        ticks: {
          font: {
            weight: "bold", // <-- Negrita en eje X (valores numéricos)
          },
          callback: (tickValue: string | number) => {
            const num = typeof tickValue === "number" ? tickValue : parseFloat(tickValue);
            if (isNaN(num)) return tickValue;
            if (num >= 1000) {
              return num / 1000 + "K";
            }
            return num.toString();
          },
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            weight: "bold", // <-- Negrita en eje Y (nombres de meses)
          },
        },
      },
    },
  };

  // 6. Manejar descarga de PDF
  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const blob = await downloadMetricsPDF();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Reporte_Historico_RECOVEN.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("No se pudo descargar el reporte. Intente más tarde.");
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  // 7. Estados de carga, error y vacío
  if (loading) {
    return (
      <section id="estadisticas-bodegas" className="bg-gray-50 py-20">
        <div className="container mx-auto max-w-6xl px-6 text-center">
          <p className="text-gray-500">Cargando estadísticas...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="estadisticas-bodegas" className="bg-gray-50 py-20">
        <div className="container mx-auto max-w-6xl px-6 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </section>
    );
  }

  if (!data || data.length === 0) {
    return (
      <section id="estadisticas-bodegas" className="bg-gray-50 py-20">
        <div className="container mx-auto max-w-6xl px-6 text-center">
          <p className="text-gray-500">No hay datos disponibles.</p>
        </div>
      </section>
    );
  }

  const grouped = groupBySede(data);
  const sedes = Object.keys(grouped);

  if (sedes.length === 0) {
    return (
      <section id="estadisticas-bodegas" className="bg-gray-50 py-20">
        <div className="container mx-auto max-w-6xl px-6 text-center">
          <p className="text-gray-500">No se encontraron sedes.</p>
        </div>
      </section>
    );
  }

  // 8. Render principal
  return (
    <section id="estadisticas-bodegas" className="bg-gray-50 py-20">
      <div className="container mx-auto max-w-6xl px-6">
        {/* TÍTULO E INFO CON REVEAL */}
        <div className="reveal mb-12 text-center">
          <span className="text-primary-green text-sm font-semibold tracking-wider uppercase">
            <FaChartBar className="mr-1 inline" /> Desempeño consolidado
          </span>
          <h2 className="mt-2 text-3xl font-bold text-gray-800 md:text-4xl">
            Estadísticas de Aprovechamiento
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-gray-600">
            Análisis comparativo del desempeño operacional de nuestras bodegas RECOVEN, mostrando
            toneladas de aprovechamiento y rechazo por mes.
          </p>
        </div>

        {/* GRÁFICAS */}
        <div className="grid gap-8 md:grid-cols-2">
          {sedes.map((sede) => {
            const sedeData = grouped[sede];
            const sortedSedeData = sedeData.sort(
              (a, b) => MONTHS_ORDER.indexOf(a.mes) - MONTHS_ORDER.indexOf(b.mes)
            );
            const chartData = prepareChartData(sortedSedeData);

            // --- LEYENDA DINÁMICA: primer y último mes ---
            const primerMes = sortedSedeData[0]?.mes || "";
            const ultimoMes = sortedSedeData[sortedSedeData.length - 1]?.mes || "";
            const rangoMeses = primerMes && ultimoMes ? `${primerMes} - ${ultimoMes}` : "";

            return (
              <div
                key={sede}
                className="reveal rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-4 text-lg font-bold text-gray-800">
                  <FaWarehouse className="text-primary-green mr-2 inline" />
                  {sede} RECOVEN
                </h3>
                <div className="relative h-80 w-full">
                  <Bar data={chartData} options={chartOptions} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3">
                    <div className="h-3 w-3 rounded-full bg-emerald-600"></div>
                    <div className="text-xs text-gray-700">
                      <span className="font-semibold">Aprovechamiento</span> {rangoMeses}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
                    <div className="h-3 w-3 rounded-full bg-slate-400"></div>
                    <div className="text-xs text-gray-700">
                      <span className="font-semibold">Rechazo</span> {rangoMeses}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTÓN DE DESCARGA PDF */}
        <div className="reveal mt-12 flex justify-center">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-8 py-4 font-bold text-gray-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {downloading ? (
              <FaSpinner className="text-primary-green animate-spin text-xl" />
            ) : (
              <FaFilePdf className="text-xl text-red-500" />
            )}
            <span>{downloading ? "Generando PDF..." : "Descargar Reporte Histórico (PDF)"}</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default StatisticsSection;
