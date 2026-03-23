import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';

export function DashboardPage() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <button type="button" className="btn-danger" style={{ width: 'auto', padding: '0.5rem 1.25rem' }} onClick={logout}>
          Sign Out
        </button>
      </div>

      <div className="profile-card">
        <h2>Profile</h2>
        <div className="profile-field">
          <span className="label">Email</span>
          <span className="value">{user.email}</span>
        </div>
        <div className="profile-field">
          <span className="label">Name</span>
          <span className="value">
            {user.firstName} {user.lastName}
          </span>
        </div>
        <div className="profile-field">
          <span className="label">Role</span>
          <span className="value">{user.role}</span>
        </div>
        <div className="profile-field">
          <span className="label">Email Verified</span>
          <span className="value">{user.isEmailVerified ? 'Yes' : 'No'}</span>
        </div>
        <div className="profile-field">
          <span className="label">2FA Enabled</span>
          <span className="value">{user.isTotpEnabled ? 'Yes' : 'No'}</span>
        </div>
        <div className="profile-field">
          <span className="label">Google Linked</span>
          <span className="value">{user.googleId ? 'Yes' : 'No'}</span>
        </div>
        <div className="profile-field">
          <span className="label">Facebook Linked</span>
          <span className="value">{user.facebookId ? 'Yes' : 'No'}</span>
        </div>
        <div className="profile-field">
          <span className="label">Instagram Linked</span>
          <span className="value">{user.instagramId ? 'Yes' : 'No'}</span>
        </div>
      </div>

      <div className="profile-card">
        <h2>Security</h2>
        <Link
          to="/auth/totp-setup"
          className="btn-secondary"
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
        >
          {user.isTotpEnabled ? 'Manage 2FA' : 'Enable Two-Factor Auth'}
        </Link>
      </div>

      <div className="profile-card">
        <h2>Inventory + POS</h2>
        <p className="dashboard-copy">
          Use the staff workspace to receive stock, sell with FEFO allocation,
          and process returns.
        </p>
        <Link
          to="/inventory"
          className="btn-primary"
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
        >
          Open inventory workspace
        </Link>
      </div>
    </div>
  );
}
