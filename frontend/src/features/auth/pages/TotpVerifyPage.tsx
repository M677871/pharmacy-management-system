import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';

export function TotpVerifyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuthTokens, refreshProfile } = useAuth();
  const tempToken =
    (location.state as { tempToken?: string } | null)?.tempToken ||
    sessionStorage.getItem('totpTempToken') ||
    '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!tempToken) {
    return (
      <AuthLayout
        title="Two-Factor Verification"
        subtitle="Your sign-in session expired before verification."
      >
        <div className="error-message">
          No 2FA session found. Please log in again.
        </div>
        <Link
          to="/auth/login"
          className="btn-primary"
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '1rem' }}
        >
          Back to Login
        </Link>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authService.verifyTotp(tempToken, code);
      sessionStorage.removeItem('totpTempToken');
      setAuthTokens(result.accessToken, result.refreshToken);
      await refreshProfile();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Login with 2FA"
      subtitle="Enter the 6-digit authenticator code to finish signing in."
    >
      <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
        Enter the 6-digit code from your authenticator app.
      </p>
      <form onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label htmlFor="code">Authentication Code</label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoFocus
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </AuthLayout>
  );
}
