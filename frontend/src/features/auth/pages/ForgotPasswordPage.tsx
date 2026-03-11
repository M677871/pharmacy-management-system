import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { AuthLayout } from '../components/AuthLayout';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setResetToken('');
    setLoading(true);
    try {
      const result = await authService.forgotPassword(email);
      setMessage(result.message);
      if (result.resetToken) {
        setResetToken(result.resetToken);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot Password">
      <form onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}
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
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      {resetToken && (
        <div style={{ marginTop: '1rem' }}>
          <div className="success-message">
            <strong>Dev only —</strong> reset token:
            <br />
            <code style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>
              {resetToken}
            </code>
          </div>
          <Link
            to={`/auth/reset-password?token=${resetToken}`}
            className="btn-primary"
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '0.5rem' }}
          >
            Go to Reset Password
          </Link>
        </div>
      )}

      <div className="auth-links">
        <Link to="/auth/login">Back to login</Link>
      </div>
    </AuthLayout>
  );
}
