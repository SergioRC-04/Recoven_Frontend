import { recovenApi } from "./api";
import type { LoginCredentials, TwoFactorPayload, AuthResponse } from "../types/auth";

export async function login(credentials: LoginCredentials): Promise<{ message: string }> {
  return recovenApi.post("/auth/login", credentials, false);
}

export async function verify2FA(payload: TwoFactorPayload): Promise<AuthResponse> {
  return recovenApi.post("/auth/verify-2fa", payload, false);
}

export async function resend2FA(username: string): Promise<{ message: string }> {
  return recovenApi.post("/auth/resend-2fa", { username }, false);
}

export async function logout(): Promise<void> {
  return recovenApi.post("/auth/logout", {}, true);
}
