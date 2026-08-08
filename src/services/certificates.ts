import { recovenApi } from "./api";
import type { Certificate } from "../types/certificate";

export async function getCertificateHistory(): Promise<Certificate[]> {
  return recovenApi.get("/certificates/history", true);
}

export async function uploadCertificate(formData: FormData): Promise<{ message: string }> {
  const token = localStorage.getItem("token");
  const response = await fetch(`${recovenApi.baseUrl}/certificates/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al subir certificado");
  }
  return response.json();
}
