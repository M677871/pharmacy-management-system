import { formatCurrency, formatDate } from '../utils/inventory-format';
import type { ProductBatch, ProductSummary } from '../types/inventory.types';

interface InventorySnapshotPanelProps {
  products: ProductSummary[];
  isLoadingProducts: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedBatches: ProductBatch[];
  selectedBatchProductName: string;
  onInspectBatches: (product: ProductSummary) => Promise<void>;
  onAddToCart: (product: ProductSummary) => void;
  onRemoveExpiredProduct?: (product: ProductSummary) => Promise<void>;
}

export function InventorySnapshotPanel({
  products,
  isLoadingProducts,
  searchTerm,
  setSearchTerm,
  selectedBatches,
  selectedBatchProductName,
  onInspectBatches,
  onAddToCart,
  onRemoveExpiredProduct,
}: InventorySnapshotPanelProps) {
  return (
    <div className="inventory-panel">
      <div className="panel-heading">
        <div>
          <p className="inventory-eyebrow">Inventory snapshot</p>
          <h2>Products and sellable stock</h2>
        </div>
        <input
          className="inventory-search"
          placeholder="Search by name, SKU, barcode"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>
      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Available</th>
              <th>Total on hand</th>
              <th>Next expiry</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                  {product.isExpired ? (
                    <span className="inventory-expired-badge">Expired</span>
                  ) : product.hasExpiredStock ? (
                    <span className="inventory-warning-badge">Expired stock</span>
                  ) : null}
                </td>
                <td>{product.sku}</td>
                <td>{product.availableQuantity}</td>
                <td>{product.totalOnHand}</td>
                <td>
                  {formatDate(
                    product.nextExpiry,
                    product.doesNotExpire ? 'No expiry date' : '—',
                  )}
                </td>
                <td className="inventory-table-actions">
                  <button
                    className="btn-secondary inventory-inline-button"
                    type="button"
                    onClick={() => void onInspectBatches(product)}
                  >
                    Batches
                  </button>
                  <button
                    className="btn-primary inventory-inline-button"
                    type="button"
                    disabled={product.isExpired || product.availableQuantity <= 0}
                    onClick={() => onAddToCart(product)}
                  >
                    Add to cart
                  </button>
                  {product.isExpired && onRemoveExpiredProduct ? (
                    <button
                      className="btn-danger inventory-inline-button"
                      type="button"
                      onClick={() => void onRemoveExpiredProduct(product)}
                    >
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!products.length ? (
              <tr>
                <td colSpan={6}>
                  {isLoadingProducts ? 'Loading products...' : 'No products found yet.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {selectedBatches.length ? (
        <div className="inventory-batches">
          <h3>{selectedBatchProductName} batches</h3>
          <ul>
            {selectedBatches.map((batch) => (
              <li key={batch.id}>
                <strong>{batch.batchNumber}</strong>{' '}
                {batch.isExpired ? (
                  <span className="inventory-expired-badge">Expired</span>
                ) : batch.doesNotExpire ? (
                  <span className="inventory-neutral-badge">No expiry date</span>
                ) : null}{' '}
                expires {formatDate(batch.expiryDate)} • on hand {batch.quantityOnHand} • cost{' '}
                {formatCurrency(batch.unitCost)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
