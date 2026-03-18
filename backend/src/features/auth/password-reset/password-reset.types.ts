export type PasswordResetMode = 'otp' | 'link';

export interface PasswordResetRequestResult {
  message: string;
  mode: PasswordResetMode;
  resetCode?: string;
  expiresInMinutes?: number;
}

export const PASSWORD_RESET_REQUEST_MESSAGE =
  'If an account with that email exists, reset instructions have been sent.';
