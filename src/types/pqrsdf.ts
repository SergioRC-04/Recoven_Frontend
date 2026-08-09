// types/pqrsdf.ts

export type TipoPqrsdf =
  "PETICION" | "QUEJA" | "RECLAMO" | "SUGERENCIA" | "DENUNCIA" | "FELICITACION";

export type EstadoPqrsdf = "RECIBIDO" | "EN_TRAMITE" | "RESUELTO" | "RECHAZADO";

export interface Pqrsdf {
  id: number;
  radicado: string;
  tipo: TipoPqrsdf;
  nombreCompleto: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  email: string;
  telefono?: string;
  direccion?: string;
  asunto: string;
  descripcion: string;
  urlArchivo?: string;
  estado: EstadoPqrsdf;
  respuesta?: string;
  urlRespuesta?: string;
  fechaRespuesta?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PqrsdfCreatePayload {
  tipo: TipoPqrsdf;
  nombreCompleto: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  email: string;
  telefono?: string;
  direccion?: string;
  asunto: string;
  descripcion: string;
  urlArchivo?: string;
}

export interface PqrsdfResponse {
  message: string;
  radicado: string;
  fechaRadicacion: string;
}

export interface PqrsdfConsulta {
  radicado: string;
  numeroIdentificacion: string;
}

export interface PqrsdfUpdatePayload {
  estado: EstadoPqrsdf;
  respuesta: string;
}

// Mapeo de tipos a etiquetas amigables
export const TIPO_LABELS: Record<TipoPqrsdf, string> = {
  PETICION: "Petición",
  QUEJA: "Queja",
  RECLAMO: "Reclamo",
  SUGERENCIA: "Sugerencia",
  DENUNCIA: "Denuncia",
  FELICITACION: "Felicitación",
};

export const TIPO_COLORS: Record<TipoPqrsdf, string> = {
  PETICION: "bg-blue-100 text-blue-800",
  QUEJA: "bg-red-100 text-red-800",
  RECLAMO: "bg-orange-100 text-orange-800",
  SUGERENCIA: "bg-purple-100 text-purple-800",
  DENUNCIA: "bg-rose-100 text-rose-800",
  FELICITACION: "bg-green-100 text-green-800",
};

export const ESTADO_LABELS: Record<EstadoPqrsdf, string> = {
  RECIBIDO: "Recibido",
  EN_TRAMITE: "En trámite",
  RESUELTO: "Resuelto",
  RECHAZADO: "Rechazado",
};

export const ESTADO_COLORS: Record<EstadoPqrsdf, string> = {
  RECIBIDO: "bg-blue-100 text-blue-800",
  EN_TRAMITE: "bg-yellow-100 text-yellow-800",
  RESUELTO: "bg-green-100 text-green-800",
  RECHAZADO: "bg-red-100 text-red-800",
};
