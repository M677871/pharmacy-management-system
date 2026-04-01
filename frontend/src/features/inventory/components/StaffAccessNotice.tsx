import { Link } from 'react-router-dom';

export function StaffAccessNotice({ role }: { role: string }) {
  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <div>
          <p className="inventory-eyebrow">Inventory Workspace</p>
          <h1>Staff role required</h1>
        </div>
        <Link className="btn-secondary inventory-link" to="/dashboard">
          Back to dashboard
        </Link>
      </div>
      <div className="inventory-panel">
        <p className="error-message">
          The inventory and POS workflow is restricted to `admin` or `employee`
          accounts. Your current role is `{role}`.
        </p>
      </div>
    </div>
  );
}
