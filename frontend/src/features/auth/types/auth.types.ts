export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'employee' | 'customer';
  isEmailVerified: boolean;
  isTotpEnabled: boolean;
  googleId?: string | null;
  facebookId?: string | null;
  instagramId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface TwoFactorResponse {
  requiresTwoFactor: true;
  tempToken: string;
}

export type LoginResponse = AuthResponse | TwoFactorResponse;

export interface TotpSetupResponse {
  secret: string;
  qrCode: string;
}
