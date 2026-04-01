import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { ProductSummary, Supplier } from '../types/inventory.types';

interface PurchaseFormState {
  supplierId: string;
  productId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  unitCost: string;
  invoiceNumber: string;
  notes: string;
}

interface ReceiveStockPanelProps {
  suppliers: Supplier[];
  products: ProductSummary[];
  purchaseForm: PurchaseFormState;
  setPurchaseForm: Dispatch<SetStateAction<PurchaseFormState>>;
  isBusy: boolean;
  onReceiveStock: () => Promise<void>;
}

export function ReceiveStockPanel({
  suppliers,
  products,
  purchaseForm,
  setPurchaseForm,
  isBusy,
  onReceiveStock,
}: ReceiveStockPanelProps) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onReceiveStock();
  }

  return (
    <form className="inventory-panel" onSubmit={(event) => void submit(event)}>
      <div className="panel-heading">
        <div>
          <p className="inventory-eyebrow">Purchase receiving</p>
          <h2>Receive stock into batches</h2>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="purchase-supplier">Supplier</label>
        <select
          id="purchase-supplier"
          value={purchaseForm.supplierId}
          onChange={(event) =>
            setPurchaseForm((current) => ({
              ...current,
              supplierId: event.target.value,
            }))
          }
          required
        >
          <option value="">Select supplier</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="purchase-product">Product</label>
        <select
          id="purchase-product"
          value={purchaseForm.productId}
          onChange={(event) =>
            setPurchaseForm((current) => ({
              ...current,
              productId: event.target.value,
            }))
          }
          required
        >
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.sku})
            </option>
          ))}
        </select>
      </div>
      <div className="inventory-inline-fields">
        <div className="form-group">
          <label htmlFor="purchase-batch">Batch number</label>
          <input
            id="purchase-batch"
            value={purchaseForm.batchNumber}
            onChange={(event) =>
              setPurchaseForm((current) => ({
                ...current,
                batchNumber: event.target.value,
              }))
            }
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="purchase-expiry">Expiry date</label>
          <input
            id="purchase-expiry"
            type="date"
            value={purchaseForm.expiryDate}
            onChange={(event) =>
              setPurchaseForm((current) => ({
                ...current,
                expiryDate: event.target.value,
              }))
            }
            required
          />
        </div>
      </div>
      <div className="inventory-inline-fields">
        <div className="form-group">
          <label htmlFor="purchase-quantity">Quantity</label>
          <input
            id="purchase-quantity"
            type="number"
            min="1"
            value={purchaseForm.quantity}
            onChange={(event) =>
              setPurchaseForm((current) => ({
                ...current,
                quantity: event.target.value,
              }))
            }
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="purchase-cost">Unit cost</label>
          <input
            id="purchase-cost"
            type="number"
            min="0"
            step="0.01"
            value={purchaseForm.unitCost}
            onChange={(event) =>
              setPurchaseForm((current) => ({
                ...current,
                unitCost: event.target.value,
              }))
            }
            required
          />
        </div>
      </div>
      <button className="btn-primary" type="submit" disabled={isBusy}>
        Receive stock
      </button>
    </form>
  );
}
