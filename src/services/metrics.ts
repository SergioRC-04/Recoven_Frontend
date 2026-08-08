import { recovenApi } from "./api";
import { type Metric, type MetricPayload } from "../types/metric";

/**
 * Obtiene las métricas operacionales de las bodegas.
 * No requiere autenticación.
 */
export async function fetchMetrics(): Promise<Metric[]> {
  return recovenApi.get<Metric[]>("/metrics", false);
}

/**
 * Descarga el reporte histórico en PDF.
 * No requiere autenticación.
 */
export async function downloadMetricsPDF(): Promise<Blob> {
  return recovenApi.getBlob("/metrics/export_pdf", false);
}

export async function saveMetric(payload: MetricPayload): Promise<Metric> {
  return recovenApi.put("/metrics", payload, true);
}

export async function deleteMetric(sede: string, mes: string, year: number): Promise<void> {
  return recovenApi.delete("/metrics", { sede, mes, year }, true);
}
