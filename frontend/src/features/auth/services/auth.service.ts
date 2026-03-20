import api from '../../../shared/api/axios';
import type {
  AuthResponse,
  ForgotPasswordResponse,
  LoginResponse,
  ResetPasswordPayload,
  TotpSetupResponse,
  User,
} from '../types/auth.types';

export const authService = {
  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  async login(data: {
    email: string;
    password: string;
  }): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/login', data);
    return res.data;
  },

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    });
    return res.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const res = await api.post<ForgotPasswordResponse>('/auth/forgot-password', {
      email,
    });
    return res.data;
  },

  async resetPassword(data: ResetPasswordPayload): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/auth/reset-password', {
      ...data,
    });
    return res.data;
  },

  async getProfile(): Promise<User> {
    const res = await api.get<User>('/auth/profile');
    return res.data;
  },

  async generateTotp(): Promise<TotpSetupResponse> {
    const res = await api.post<TotpSetupResponse>('/auth/totp/generate');
    return res.data;
  },

  async enableTotp(code: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/auth/totp/enable', {
      code,
    });
    return res.data;
  },

  async verifyTotp(
    tempToken: string,
    code: string,
  ): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/totp/verify', {
      tempToken,
      code,
    });
    return res.data;
  },

  async disableTotp(): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/auth/totp/disable');
    return res.data;
  },
};
