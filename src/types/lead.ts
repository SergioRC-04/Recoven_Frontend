// types/lead.ts
export interface LeadFormData {
  nombre: string;
  telefono: string;
  email: string;
  empresa?: string;
  direccion?: string;
  servicio: string;
  especialidad?: string;
  mensaje?: string;
}

export interface Lead extends LeadFormData {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadResponse {
  message: string;
  lead: Lead;
}
