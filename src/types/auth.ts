export interface LoginCredentials {
  username: string;
  password: string;
}

export interface TwoFactorPayload {
  username: string;
  code: string;
}

export interface AuthResponse {
  access_token: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}
