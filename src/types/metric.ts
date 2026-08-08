export interface Metric {
  id: number;
  sede: string;
  mes: string;
  year: number;
  aprovechamiento: number;
  rechazo: number;
  createdAt: string;
  updatedAt: string;
}

export interface MetricPayload {
  year: number;
  mes: string;
  sede: string;
  aprovechamiento: number;
  rechazo: number;
}
