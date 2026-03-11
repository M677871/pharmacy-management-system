import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { AuthLayout } from '../components/AuthLayout';
import type { TotpSetupResponse } from '../types/auth.types';

export function TotpSetupPage() {
  const [setup, setSetup] = useState<TotpSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await authService.generateTotp();
      setSetup(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate TOTP');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authService.enableTotp(code);
      setMessage(result.message);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await authService.disableTotp();
      setMessage(result.message);
      setSetup(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Two-Factor Authentication">
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      {!setup ? (
        <div>
          <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
            Secure your account with an authenticator app (Google Authenticator,
            Authy, etc.).
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Generating…' : 'Set Up 2FA'}
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={handleDisable}
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            Disable 2FA
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            Scan the QR code with your authenticator app:
          </p>
          <div className="totp-qr">
            <img src={setup.qrCode} alt="TOTP QR Code" />
          </div>
          <div className="totp-secret">
            Manual key: {setup.secret}
          </div>
          <form onSubmit={handleEnable}>
            <div className="form-group">
              <label htmlFor="code">Enter the 6-digit code</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Verifying…' : 'Enable 2FA'}
            </button>
          </form>
        </div>
      )}

      <div className="auth-links" style={{ marginTop: '1rem' }}>
        <a href="/dashboard">Back to dashboard</a>
      </div>
    </AuthLayout>
  );
}
