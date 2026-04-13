import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { usersService } from '../../users/services/users.service';
import { useRealtime } from '../../realtime/hooks/useRealtime';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import { realtimeEvent } from '../../realtime/types/realtime.types';
import type {
  CreateManagedUserPayload,
  ManagedUser,
} from '../../users/types/user-management.types';
import {
  formatDate,
  formatRole,
  getErrorMessage,
} from '../../../shared/utils/format';

const ROLE_OPTIONS: Array<CreateManagedUserPayload['role']> = [
  'admin',
  'employee',
  'customer',
];

const INITIAL_FORM: CreateManagedUserPayload = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'employee',
};

export function AdminUserManagementSection() {
  const { presenceByUserId } = useRealtime();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [form, setForm] = useState<CreateManagedUserPayload>(INITIAL_FORM);

  async function loadUsers() {
    const data = await usersService.listUsers();
    setUsers(data);
    return data;
  }

  useEffect(() => {
    let active = true;

    void loadUsers()
      .then((data) => {
        if (!active) {
          return;
        }
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }

        setError(getErrorMessage(loadError, 'Unable to load users.'));
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useRealtimeEvent(realtimeEvent.usersChanged, () => {
    void loadUsers().catch(() => {
      return;
    });
  });

  const userCounts = useMemo(() => {
    return users.reduce(
      (counts, user) => {
        counts[user.role] += 1;
        return counts;
      },
      { admin: 0, employee: 0, customer: 0 } as Record<ManagedUser['role'], number>,
    );
  }, [users]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (form.password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    setBusy(true);

    try {
      const createdUser = await usersService.createUser({
        ...form,
        email: form.email.trim().toLowerCase(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });

      setUsers((current) => [createdUser, ...current]);
      setForm(INITIAL_FORM);
      setConfirmPassword('');
      setMessage(
        `${formatRole(createdUser.role)} account created for ${createdUser.email}.`,
      );
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to create user.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace-grid admin-user-grid">
      <article className="surface-card">
        <div className="surface-card-header">
          <div>
            <span className="surface-card-eyebrow">Admin Access Control</span>
            <h2>Create platform users</h2>
          </div>
        </div>

        <p className="admin-user-copy">
          Create Admin, Employee, or Client accounts from a secured admin-only
          workflow. Public sign-up remains limited to Client accounts.
        </p>

        {error ? <div className="error-message">{error}</div> : null}
        {message ? <div className="success-message">{message}</div> : null}

        <form className="stacked-form" onSubmit={handleSubmit}>
          <div className="workspace-form-grid">
            <label className="workspace-field">
              <span>First Name</span>
              <input
                value={form.firstName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    firstName: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="workspace-field">
              <span>Last Name</span>
              <input
                value={form.lastName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lastName: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="workspace-field workspace-field-span-two">
              <span>Email Address</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="workspace-field">
              <span>Password</span>
              <input
                type="password"
                minLength={8}
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="workspace-field">
              <span>Confirm Password</span>
              <input
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>
            <label className="workspace-field workspace-field-span-two">
              <span>User Role</span>
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as CreateManagedUserPayload['role'],
                  }))
                }
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="workspace-primary-action"
            disabled={busy}
          >
            {busy ? 'Creating user…' : `Create ${formatRole(form.role)} User`}
          </button>
        </form>
      </article>

      <article className="surface-card">
        <div className="surface-card-header">
          <div>
            <span className="surface-card-eyebrow">Role Overview</span>
            <h2>Current user directory</h2>
          </div>
        </div>

        <div className="detail-grid admin-user-summary">
          <div className="detail-block">
            <span>Admins</span>
            <strong>{userCounts.admin}</strong>
          </div>
          <div className="detail-block">
            <span>Employees</span>
            <strong>{userCounts.employee}</strong>
          </div>
          <div className="detail-block">
            <span>Clients</span>
            <strong>{userCounts.customer}</strong>
          </div>
          <div className="detail-block">
            <span>Total Users</span>
            <strong>{users.length}</strong>
          </div>
        </div>

        {loading ? (
          <div className="surface-empty">Loading users…</div>
        ) : (
          <div className="table-card">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>
                        {`${user.firstName} ${user.lastName}`.trim() || 'Unnamed User'}
                      </strong>
                      <div className="table-subcopy">{user.email}</div>
                    </td>
                    <td>
                      <span className={`role-pill role-pill-${user.role}`}>
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td>
                      <span className="table-subcopy">
                        {user.isEmailVerified ? 'Verified' : 'Pending verification'}
                      </span>
                      <div
                        className={`presence-inline presence-inline-${
                          presenceByUserId[user.id]?.status ?? 'offline'
                        }`}
                      >
                        {presenceByUserId[user.id]?.status ?? 'offline'}
                      </div>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
