import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { AuthLayout } from '../components/AuthLayout';
import {
  clearPasswordResetContext,
  writePasswordResetContext,
} from '../utils/passwordResetContext';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    setError('');
    setMessage('');
    setLoading(true);
    try {
      const result = await authService.forgotPassword(normalizedEmail);

      if (result.mode === 'otp') {
        writePasswordResetContext(normalizedEmail, result);

        const params = new URLSearchParams({
          mode: 'otp',
          email: normalizedEmail,
        });

        navigate(`/auth/reset-password?${params.toString()}`);
        return;
      }

      clearPasswordResetContext();
      setMessage(result.message);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot Password">
      <p className="auth-copy">
        Enter your email and we&apos;ll send reset instructions. In local
        development, you&apos;ll move straight into the verification-code reset
        screen.
      </p>
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
          {loading ? 'Sending…' : 'Send Reset Instructions'}
        </button>
      </form>

      <div className="auth-links">
        <Link to="/auth/login">Back to login</Link>
      </div>
    </AuthLayout>
  );
}
