import { recovenApi } from "./api";
import { type Metric } from "../types/metric";

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
