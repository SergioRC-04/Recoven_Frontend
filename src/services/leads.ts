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
  return recovenApi.get<Lead[]>("/leads", true);
}
