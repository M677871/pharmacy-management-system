import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';

export function SocialCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthTokens, refreshProfile } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken && refreshToken) {
      setAuthTokens(accessToken, refreshToken);
      refreshProfile()
        .then(() => navigate('/dashboard', { replace: true }))
        .catch(() => setError('Failed to load profile'));
    } else {
      setError('Social login failed — missing tokens');
    }
  }, [searchParams, setAuthTokens, refreshProfile, navigate]);

  if (error) {
    return (
      <AuthLayout
        title="Social Login"
        subtitle="We could not finish the provider sign-in flow."
      >
        <div className="error-message">{error}</div>
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

  return (
    <AuthLayout
      title="Social Login"
      subtitle="Completing your provider sign-in and loading the workspace."
    >
      <div className="loading">Completing login…</div>
    </AuthLayout>
  );
}
