// services/leads.ts
import { recovenApi } from "./api";
import type { LeadFormData, Lead, LeadResponse } from "../types/lead";

/**
 * Envía un lead al backend (público, sin autenticación)
 */
export async function sendLead(data: LeadFormData): Promise<LeadResponse> {
  return recovenApi.post<LeadResponse>("/leads/send-lead", data, false);
}

/**
 * Obtiene todos los leads (requiere autenticación - para dashboard)
 */
export async function getLeads(): Promise<Lead[]> {
  return recovenApi.get("/leads", true);
}

/**
 * Exporta los leads en un archivo de excel (requiere autenticación - para dashboard)
 */

export async function exportLeadsExcel(): Promise<Blob> {
  return recovenApi.getBlob("/leads/export_excel", true);
}
