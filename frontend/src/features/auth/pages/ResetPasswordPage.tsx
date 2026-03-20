import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { authService } from '../services/auth.service';
import type { PasswordResetMode } from '../types/auth.types';
import {
  clearPasswordResetContext,
  readPasswordResetContext,
  type PasswordResetContext,
} from '../utils/passwordResetContext';

interface ResetPasswordLocationState {
  resetContext?: PasswordResetContext;
}

function getInitialResetState(
  searchParams: URLSearchParams,
  resetContext: PasswordResetContext | null,
) {
  const tokenFromUrl = searchParams.get('token') ?? '';
  const emailFromUrl = searchParams.get('email') ?? '';
  const modeFromUrl = searchParams.get('mode');
  const mode: PasswordResetMode =
    tokenFromUrl || modeFromUrl === 'link'
      ? 'link'
      : modeFromUrl === 'otp' || resetContext?.mode === 'otp'
        ? 'otp'
        : 'link';

  return {
    mode,
    token: mode === 'link' ? tokenFromUrl : resetContext?.resetCode ?? '',
    email: emailFromUrl || resetContext?.email || '',
    message: resetContext?.message ?? '',
    expiresInMinutes: resetContext?.expiresInMinutes ?? null,
    helperCode: resetContext?.resetCode ?? '',
  };
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = location.state as ResetPasswordLocationState | null;
  const resetContext = locationState?.resetContext ?? readPasswordResetContext();
  const initialState = getInitialResetState(searchParams, resetContext);
  const [mode] = useState<PasswordResetMode>(initialState.mode);
  const [email, setEmail] = useState(initialState.email);
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(initialState.message);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expiresInMinutes] = useState<number | null>(initialState.expiresInMinutes);
  const hasTokenFromUrl = Boolean(searchParams.get('token'));

  useEffect(() => {
    if (mode === 'link' && hasTokenFromUrl) {
      clearPasswordResetContext();
    }
  }, [hasTokenFromUrl, mode]);

  useEffect(() => {
    if (!message.toLowerCase().includes('successful')) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      navigate('/auth/login');
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [message, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.resetPassword({
        email: mode === 'otp' ? email.trim().toLowerCase() : undefined,
        token: token.trim(),
        newPassword,
      });

      clearPasswordResetContext();
      setMessage(result.message);
      setToken('');
      setConfirmPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const heading =
    mode === 'otp' ? 'Enter your verification code and new password.' : 'Choose a new password to finish the reset.';
  const showTokenInput = mode === 'otp' || !hasTokenFromUrl;

  return (
    <AuthLayout title="Reset Password">
      <p className="auth-copy">{heading}</p>

      {mode === 'otp' && (
        <div className="auth-info-card">
          <p>
            We sent a verification code to <strong>{email || 'your email'}</strong>.
          </p>
          {expiresInMinutes && (
            <p>The code expires in about {expiresInMinutes} minutes.</p>
          )}
        </div>
      )}

      {mode === 'link' && hasTokenFromUrl && (
        <div className="success-message">
          Your reset link is ready. Enter a new password to continue.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        {mode === 'otp' && (
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        )}

        {showTokenInput && (
          <div className="form-group">
            <label htmlFor="token">
              {mode === 'otp' ? 'Verification Code' : 'Reset Token'}
            </label>
            <input
              id="token"
              type="text"
              inputMode={mode === 'otp' ? 'numeric' : 'text'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="newPassword">New Password (min 8 chars)</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>

      <div className="auth-links">
        <Link to="/auth/forgot-password">Request another reset</Link>
        <Link to="/auth/login">Back to login</Link>
      </div>
    </AuthLayout>
  );
}
