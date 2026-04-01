import { formatCurrency } from '../utils/inventory-format';
import type { CartItem } from '../hooks/useInventoryWorkspace';
import type { SaleDetail } from '../types/inventory.types';

interface PosPanelProps {
  cart: CartItem[];
  cartTotal: number;
  lastSale: SaleDetail | null;
  isBusy: boolean;
  onQuantityChange: (productId: string, nextValue: string) => void;
  onRemoveFromCart: (productId: string) => void;
  onCheckout: () => Promise<void>;
}

export function PosPanel({
  cart,
  cartTotal,
  lastSale,
  isBusy,
  onQuantityChange,
  onRemoveFromCart,
  onCheckout,
}: PosPanelProps) {
  return (
    <div className="inventory-panel">
      <div className="panel-heading">
        <div>
          <p className="inventory-eyebrow">POS</p>
          <h2>Cart and checkout</h2>
        </div>
      </div>
      <div className="cart-list">
        {cart.length ? (
          cart.map((item) => (
            <div className="cart-row" key={item.productId}>
              <div>
                <strong>{item.name}</strong>
                <p>
                  {item.sku} • max {item.availableQuantity}
                </p>
              </div>
              <input
                type="number"
                min="1"
                max={item.availableQuantity}
                value={item.quantity}
                onChange={(event) =>
                  onQuantityChange(item.productId, event.target.value)
                }
              />
              <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
              <button
                className="btn-danger inventory-inline-button"
                type="button"
                onClick={() => onRemoveFromCart(item.productId)}
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <p className="inventory-empty">Add a product from the inventory list.</p>
        )}
      </div>
      <div className="inventory-summary-bar">
        <span>Total</span>
        <strong>{formatCurrency(cartTotal)}</strong>
      </div>
      <button
        className="btn-primary"
        type="button"
        disabled={isBusy || !cart.length}
        onClick={() => void onCheckout()}
      >
        Checkout sale
      </button>
      {lastSale ? (
        <div className="inventory-result-card">
          <h3>Last checkout allocations</h3>
          <p>
            Sale <strong>{lastSale.id.slice(0, 8)}</strong> •{' '}
            {formatCurrency(lastSale.totalAmount)}
          </p>
          <ul>
            {lastSale.items.map((item) => (
              <li key={item.id}>
                <strong>{item.productName}</strong>: {item.allocations
                  .map(
                    (allocation) =>
                      `${allocation.batchNumber} x ${allocation.quantity}`,
                  )
                  .join(', ')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
