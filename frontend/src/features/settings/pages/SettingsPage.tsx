import { useState, type FormEvent } from 'react';
import { AppShell } from '../../../shared/components/AppShell';
import { ShieldIcon } from '../../../shared/components/AppIcons';
import { useAuth } from '../../auth/hooks/useAuth';
import { authService } from '../../auth/services/auth.service';
import { formatRole, getErrorMessage } from '../../../shared/utils/format';

export function SettingsPage() {
  const { user, refreshProfile } = useAuth();
  const [totpSecret, setTotpSecret] = useState('');
  const [totpQrCode, setTotpQrCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!user) {
    return null;
  }

  async function handleGenerateTotp() {
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const result = await authService.generateTotp();
      setTotpSecret(result.secret);
      setTotpQrCode(result.qrCode);
    } catch (totpError) {
      setError(getErrorMessage(totpError, 'Unable to generate 2FA setup.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleEnableTotp(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const result = await authService.enableTotp(totpCode);
      setMessage(result.message);
      setTotpCode('');
      setTotpSecret('');
      setTotpQrCode('');
      await refreshProfile();
    } catch (totpError) {
      setError(getErrorMessage(totpError, 'Unable to enable 2FA.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisableTotp() {
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const result = await authService.disableTotp();
      setMessage(result.message);
      setTotpCode('');
      setTotpSecret('');
      setTotpQrCode('');
      await refreshProfile();
    } catch (totpError) {
      setError(getErrorMessage(totpError, 'Unable to disable 2FA.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      pageTitle="Settings"
      pageSubtitle="Review account information and manage authentication security."
    >
      {error ? <div className="error-message">{error}</div> : null}
      {message ? <div className="success-message">{message}</div> : null}

      <section className="workspace-grid">
        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Profile</span>
              <h2>Account details</h2>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-block">
              <span>Name</span>
              <strong>{`${user.firstName} ${user.lastName}`.trim() || 'Not set'}</strong>
            </div>
            <div className="detail-block">
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div className="detail-block">
              <span>Role</span>
              <strong>{formatRole(user.role)}</strong>
            </div>
            <div className="detail-block">
              <span>Account Status</span>
              <div>
                <span
                  className={`order-status-badge ${
                    user.isEmailVerified ? 'tone-green' : 'tone-orange'
                  }`}
                  style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', marginTop: '0.2rem', fontSize: '0.85rem' }}
                >
                  {user.isEmailVerified ? 'Verified' : 'Pending verification'}
                </span>
              </div>
            </div>
          </div>
        </article>

        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Security</span>
              <h2>Two-factor authentication</h2>
            </div>
          </div>

          <div className="security-status-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ flex: 'none', background: user.isTotpEnabled ? 'var(--bg)' : 'rgba(234, 90, 99, 0.1)', color: user.isTotpEnabled ? 'var(--primary)' : 'var(--red)', padding: '0.9rem', borderRadius: '50%' }}>
              <ShieldIcon style={{ width: '1.75rem', height: '1.75rem' }} />
            </div>
            <div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--primary-ink)' }}>{user.isTotpEnabled ? '2FA is enabled' : '2FA is disabled'}</strong>
              <div style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                {user.isTotpEnabled
                  ? 'Your account requires an authenticator code at sign-in.'
                  : 'Set up an authenticator app to secure sensitive pharmacy workflows.'}
              </div>
            </div>
          </div>

          {!totpQrCode && !user.isTotpEnabled ? (
            <button
              type="button"
              className="workspace-primary-action"
              disabled={busy}
              onClick={handleGenerateTotp}
            >
              {busy ? 'Generating setup…' : 'Generate 2FA Setup'}
            </button>
          ) : null}

          {totpQrCode ? (
            <form className="stacked-form" onSubmit={handleEnableTotp}>
              <div className="totp-panel">
                <img src={totpQrCode} alt="Authenticator QR code" />
              </div>
              <div className="totp-secret-card">Manual key: {totpSecret}</div>
              <label className="workspace-field">
                <span>Authenticator Code</span>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value)}
                  required
                />
              </label>
              <button type="submit" className="workspace-primary-action" disabled={busy}>
                {busy ? 'Enabling 2FA…' : 'Enable 2FA'}
              </button>
            </form>
          ) : null}

          {user.isTotpEnabled ? (
            <button
              type="button"
              className="workspace-danger-action"
              onClick={handleDisableTotp}
              disabled={busy}
            >
              {busy ? 'Disabling 2FA…' : 'Disable 2FA'}
            </button>
          ) : null}
        </article>
      </section>
    </AppShell>
  );
}
