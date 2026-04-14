import { useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '../../../shared/components/AppShell';
import { inventoryService } from '../../inventory/services/inventory.service';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import { realtimeEvent } from '../../realtime/types/realtime.types';
import type {
  ProductSummary,
  PurchaseSummary,
  Supplier,
} from '../../inventory/types/inventory.types';
import {
  formatCurrency,
  formatDate,
  getErrorMessage,
} from '../../../shared/utils/format';

interface SupplierFormState {
  id?: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
}

interface ReceiveFormState {
  supplierId: string;
  productId: string;
  invoiceNumber: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  unitCost: string;
  notes: string;
}

const EMPTY_SUPPLIER_FORM: SupplierFormState = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
};

export function PurchasesPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [purchases, setPurchases] = useState<PurchaseSummary[]>([]);
  const [receiveForm, setReceiveForm] = useState<ReceiveFormState>({
    supplierId: '',
    productId: '',
    invoiceNumber: '',
    batchNumber: '',
    expiryDate: '',
    quantity: '1',
    unitCost: '',
    notes: '',
  });
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(
    EMPTY_SUPPLIER_FORM,
  );
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');

  function resolveSelectionId(
    items: Array<{ id: string }>,
    currentId: string,
  ) {
    return items.some((item) => item.id === currentId)
      ? currentId
      : items[0]?.id || '';
  }

  async function loadPageData() {
    const [supplierData, productData, purchaseData] = await Promise.all([
      inventoryService.listSuppliers(),
      inventoryService.listProducts(),
      inventoryService.listPurchases(),
    ]);

    setError('');
    setSuppliers(supplierData);
    setProducts(productData);
    setPurchases(purchaseData);
    setReceiveForm((current) => ({
      ...current,
      supplierId: resolveSelectionId(supplierData, current.supplierId),
      productId: resolveSelectionId(productData, current.productId),
    }));
  }

  useEffect(() => {
    void loadPageData()
      .catch((loadError) => {
        setError(getErrorMessage(loadError, 'Unable to load purchases.'));
      })
      .finally(() => setLoading(false));
  }, []);

  useRealtimeEvent(realtimeEvent.inventoryChanged, () => {
    void loadPageData().catch(() => {
      return;
    });
  });

  async function handleSaveSupplier(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFlashMessage('');

    try {
      let supplierId = supplierForm.id;

      if (supplierForm.id) {
        const supplier = await inventoryService.updateSupplier(supplierForm.id, {
          name: supplierForm.name,
          contactName: supplierForm.contactName || null,
          email: supplierForm.email || null,
          phone: supplierForm.phone || null,
          address: supplierForm.address || null,
        });
        supplierId = supplier.id;
        setFlashMessage('Supplier updated successfully.');
      } else {
        const supplier = await inventoryService.createSupplier(supplierForm);
        supplierId = supplier.id;
        setFlashMessage('Supplier created successfully.');
      }

      await loadPageData();
      setSupplierForm(EMPTY_SUPPLIER_FORM);
      setReceiveForm((current) => ({
        ...current,
        supplierId: supplierId || current.supplierId,
      }));
      setShowSupplierForm(false);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save supplier.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSupplier(supplier: Supplier) {
    if (!window.confirm(`Delete ${supplier.name}?`)) {
      return;
    }

    setSaving(true);
    setError('');
    setFlashMessage('');

    try {
      await inventoryService.deleteSupplier(supplier.id);
      if (supplierForm.id === supplier.id) {
        setSupplierForm(EMPTY_SUPPLIER_FORM);
        setShowSupplierForm(false);
      }
      await loadPageData();
      setFlashMessage('Supplier deleted successfully.');
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete supplier.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleReceiveStock(event: FormEvent) {
    event.preventDefault();

    if (!suppliers.length) {
      setError('Create a supplier before receiving stock.');
      return;
    }

    if (!products.length) {
      setError('Create a product before receiving stock.');
      return;
    }

    setSaving(true);
    setError('');
    setFlashMessage('');

    try {
      const receipt = await inventoryService.receiveStock({
        supplierId: receiveForm.supplierId,
        invoiceNumber: receiveForm.invoiceNumber || undefined,
        notes: receiveForm.notes || undefined,
        items: [
          {
            productId: receiveForm.productId,
            batchNumber: receiveForm.batchNumber,
            expiryDate: `${receiveForm.expiryDate}T00:00:00.000Z`,
            quantity: Number(receiveForm.quantity),
            unitCost: Number(receiveForm.unitCost),
          },
        ],
      });

      await loadPageData();
      setReceiveForm((current) => ({
        ...current,
        invoiceNumber: '',
        batchNumber: '',
        expiryDate: '',
        quantity: '1',
        unitCost: '',
        notes: '',
      }));
      setFlashMessage(`Purchase ${receipt.id.slice(0, 8)} received successfully.`);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to receive stock.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      pageTitle="Purchases"
      pageSubtitle="Receive stock into batches, register suppliers, and review purchase history."
      actions={
        <button
          type="button"
          className="workspace-primary-action"
          onClick={() => setShowSupplierForm((current) => !current)}
        >
          {showSupplierForm ? 'Close Supplier Editor' : 'Add Supplier'}
        </button>
      }
    >
      {error ? <div className="error-message">{error}</div> : null}
      {flashMessage ? <div className="success-message">{flashMessage}</div> : null}

      <section className="workspace-grid">
        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Receiving</span>
              <h2>Receive stock</h2>
            </div>
          </div>

          <form className="workspace-form-grid" onSubmit={handleReceiveStock}>
            {!suppliers.length || !products.length ? (
              <div className="surface-empty workspace-field-span-two">
                {!suppliers.length && !products.length
                  ? 'Create at least one supplier and one product before receiving stock.'
                  : !suppliers.length
                    ? 'Create a supplier before receiving stock.'
                    : 'Create a product before receiving stock.'}
              </div>
            ) : null}
            <label className="workspace-field">
              <span>Supplier</span>
              <select
                value={receiveForm.supplierId}
                onChange={(event) =>
                  setReceiveForm((current) => ({
                    ...current,
                    supplierId: event.target.value,
                  }))
                }
                required
              >
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="workspace-field">
              <span>Product</span>
              <select
                value={receiveForm.productId}
                onChange={(event) =>
                  setReceiveForm((current) => ({
                    ...current,
                    productId: event.target.value,
                  }))
                }
                required
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="workspace-field">
              <span>Invoice Number</span>
              <input
                value={receiveForm.invoiceNumber}
                onChange={(event) =>
                  setReceiveForm((current) => ({
                    ...current,
                    invoiceNumber: event.target.value,
                  }))
                }
              />
            </label>

            <label className="workspace-field">
              <span>Batch Number</span>
              <input
                value={receiveForm.batchNumber}
                onChange={(event) =>
                  setReceiveForm((current) => ({
                    ...current,
                    batchNumber: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="workspace-field">
              <span>Expiry Date</span>
              <input
                type="date"
                value={receiveForm.expiryDate}
                onChange={(event) =>
                  setReceiveForm((current) => ({
                    ...current,
                    expiryDate: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="workspace-field">
              <span>Quantity</span>
              <input
                type="number"
                min={1}
                value={receiveForm.quantity}
                onChange={(event) =>
                  setReceiveForm((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="workspace-field">
              <span>Unit Cost</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={receiveForm.unitCost}
                onChange={(event) =>
                  setReceiveForm((current) => ({
                    ...current,
                    unitCost: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="workspace-field workspace-field-span-two">
              <span>Notes</span>
              <textarea
                rows={4}
                value={receiveForm.notes}
                onChange={(event) =>
                  setReceiveForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>

            <button
              type="submit"
              className="workspace-primary-action workspace-field-span-two"
              disabled={saving || !suppliers.length || !products.length}
            >
              {saving ? 'Receiving stock…' : 'Receive Stock'}
            </button>
          </form>
        </article>

        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Suppliers</span>
              <h2>Quick supplier setup</h2>
            </div>
          </div>

          {showSupplierForm ? (
            <form className="workspace-form-grid" onSubmit={handleSaveSupplier}>
              <label className="workspace-field">
                <span>Supplier Name</span>
                <input
                  value={supplierForm.name}
                  onChange={(event) =>
                    setSupplierForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="workspace-field">
                <span>Contact Name</span>
                <input
                  value={supplierForm.contactName}
                  onChange={(event) =>
                    setSupplierForm((current) => ({
                      ...current,
                      contactName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="workspace-field">
                <span>Email</span>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(event) =>
                    setSupplierForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="workspace-field">
                <span>Phone</span>
                <input
                  value={supplierForm.phone}
                  onChange={(event) =>
                    setSupplierForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="workspace-field workspace-field-span-two">
                <span>Address</span>
                <textarea
                  rows={4}
                  value={supplierForm.address}
                  onChange={(event) =>
                    setSupplierForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />
              </label>
              <button
                type="submit"
                className="workspace-secondary-action workspace-field-span-two"
                disabled={saving}
              >
                {saving
                  ? supplierForm.id
                    ? 'Saving supplier…'
                    : 'Creating supplier…'
                  : supplierForm.id
                    ? 'Save Supplier'
                    : 'Add Supplier'}
              </button>
              {supplierForm.id ? (
                <button
                  type="button"
                  className="workspace-inline-link workspace-field-span-two"
                  disabled={saving}
                  onClick={() => {
                    setSupplierForm(EMPTY_SUPPLIER_FORM);
                    setShowSupplierForm(false);
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </form>
          ) : (
            <div className="surface-empty">
              Use the supplier quick form when you need to add a new vendor while
              receiving stock.
            </div>
          )}

          <div className="stacked-list">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="stacked-list-row">
                <div>
                  <strong>{supplier.name}</strong>
                  <span>
                    {supplier.contactName ||
                      supplier.email ||
                      supplier.phone ||
                      'No contact set'}
                  </span>
                </div>
                <div className="stacked-list-actions">
                  <button
                    type="button"
                    className="workspace-inline-link"
                    disabled={saving}
                    onClick={() => {
                      setSupplierForm({
                        id: supplier.id,
                        name: supplier.name,
                        contactName: supplier.contactName || '',
                        email: supplier.email || '',
                        phone: supplier.phone || '',
                        address: supplier.address || '',
                      });
                      setShowSupplierForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="workspace-inline-link workspace-inline-link-danger"
                    disabled={saving}
                    onClick={() => void handleDeleteSupplier(supplier)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="surface-card">
        <div className="surface-card-header">
          <div>
            <span className="surface-card-eyebrow">History</span>
            <h2>Recent purchases</h2>
          </div>
        </div>

        {loading ? (
          <div className="surface-empty">Loading purchases…</div>
        ) : purchases.length ? (
          <div className="table-card">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Invoice</th>
                  <th>Items</th>
                  <th>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td>{formatDate(purchase.receivedAt)}</td>
                    <td>{purchase.supplierName ?? 'Unknown supplier'}</td>
                    <td>{purchase.invoiceNumber || '—'}</td>
                    <td>{purchase.itemCount}</td>
                    <td>{formatCurrency(purchase.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="surface-empty">No purchases recorded yet.</div>
        )}
      </section>
    </AppShell>
  );
}
