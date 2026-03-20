import type { ForgotPasswordResponse, PasswordResetMode } from '../types/auth.types';

const PASSWORD_RESET_CONTEXT_KEY = 'pharmaflow-password-reset-context';

export interface PasswordResetContext {
  email: string;
  mode: PasswordResetMode;
  resetCode?: string;
  expiresInMinutes?: number;
  message: string;
}

export function readPasswordResetContext(): PasswordResetContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(PASSWORD_RESET_CONTEXT_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PasswordResetContext;
  } catch {
    window.sessionStorage.removeItem(PASSWORD_RESET_CONTEXT_KEY);
    return null;
  }
}

export function writePasswordResetContext(
  email: string,
  response: ForgotPasswordResponse,
) {
  if (typeof window === 'undefined') {
    return;
  }

  const value: PasswordResetContext = {
    email,
    mode: response.mode,
    resetCode: response.resetCode,
    expiresInMinutes: response.expiresInMinutes,
    message: response.message,
  };

  window.sessionStorage.setItem(
    PASSWORD_RESET_CONTEXT_KEY,
    JSON.stringify(value),
  );
}

export function clearPasswordResetContext() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(PASSWORD_RESET_CONTEXT_KEY);
}
