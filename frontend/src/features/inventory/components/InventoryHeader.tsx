import { Link } from 'react-router-dom';
import type { FlashMessage } from '../hooks/useInventoryWorkspace';

export function InventoryHeader({
  flashMessage,
}: {
  flashMessage: FlashMessage | null;
}) {
  return (
    <>
      <div className="inventory-header">
        <div>
          <p className="inventory-eyebrow">Inventory + POS</p>
          <h1>Receive, sell, return</h1>
          <p className="inventory-subtitle">
            Stock is tracked by batch, allocated FEFO, and written to stock
            movements.
          </p>
        </div>
        <Link className="btn-secondary inventory-link" to="/dashboard">
          Back to dashboard
        </Link>
      </div>

      {flashMessage ? (
        <div
          className={
            flashMessage.type === 'success' ? 'success-message' : 'error-message'
          }
        >
          {flashMessage.text}
        </div>
      ) : null}
    </>
  );
}
