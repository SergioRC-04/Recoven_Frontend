import { recovenApi } from "./api";

export interface Metric {
  sede: string;
  mes: string;
  aprovechamiento: number;
  rechazo: number;
}

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
