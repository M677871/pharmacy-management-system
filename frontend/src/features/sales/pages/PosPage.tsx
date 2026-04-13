import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { AppShell } from '../../../shared/components/AppShell';
import { inventoryService } from '../../inventory/services/inventory.service';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import { realtimeEvent } from '../../realtime/types/realtime.types';
import type {
  ProductSummary,
  SaleDetail,
  SaleSummary,
} from '../../inventory/types/inventory.types';
import {
  formatCurrency,
  formatDate,
  getErrorMessage,
} from '../../../shared/utils/format';

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  availableQuantity: number;
}

type PaymentMode = 'cash' | 'card';

export function PosPage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [saleLookupId, setSaleLookupId] = useState('');
  const [loadedSale, setLoadedSale] = useState<SaleDetail | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');

  async function loadProducts(search = '') {
    const data = await inventoryService.listProducts(search);
    setError('');
    setProducts(data);
  }

  async function loadPageData(search = '') {
    const [productData, saleData] = await Promise.all([
      inventoryService.listProducts(search),
      inventoryService.listSales(),
    ]);

    setError('');
    setProducts(productData);
    setSales(saleData);
  }

  useEffect(() => {
    void loadPageData()
      .catch((loadError) => {
        setError(getErrorMessage(loadError, 'Unable to load POS data.'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProducts(deferredSearch).catch((loadError) => {
        setError(getErrorMessage(loadError, 'Unable to search products.'));
      });
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [deferredSearch]);

  useRealtimeEvent(realtimeEvent.inventoryChanged, () => {
    void loadPageData(searchTerm).catch(() => {
      return;
    });

    if (loadedSale?.id) {
      void inventoryService
        .getSale(loadedSale.id)
        .then((sale) => {
          setLoadedSale(sale);
        })
        .catch(() => {
          return;
        });
    }
  });

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const tax = useMemo(() => subtotal * 0.08, [subtotal]);
  const total = subtotal + tax;
  const hasReturnableItems = loadedSale
    ? loadedSale.items.some((item) => item.remainingReturnable > 0)
    : false;

  function addToCart(product: ProductSummary) {
    if (product.availableQuantity <= 0) {
      setError(`${product.name} has no sellable stock.`);
      return;
    }

    setError('');
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, product.availableQuantity),
                availableQuantity: product.availableQuantity,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: product.salePrice,
          quantity: 1,
          availableQuantity: product.availableQuantity,
        },
      ];
    });
  }

  function changeQuantity(productId: string, value: string) {
    const parsed = Number(value);

    setCart((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: Number.isNaN(parsed)
                ? item.quantity
                : Math.max(1, Math.min(parsed, item.availableQuantity)),
            }
          : item,
      ),
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  async function handleCheckout() {
    if (!cart.length) {
      setError('Add at least one product to the cart.');
      return;
    }

    setBusy(true);
    setError('');
    setFlashMessage('');

    try {
      const sale = await inventoryService.checkout({
        notes: `Payment mode: ${paymentMode}`,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      });

      setCart([]);
      setLoadedSale(sale);
      setSaleLookupId(sale.id);
      setReturnQuantities({});
      setReturnReason('');
      await loadPageData(searchTerm);
      setFlashMessage(`Sale ${sale.id.slice(0, 8)} completed.`);
    } catch (checkoutError) {
      setError(getErrorMessage(checkoutError, 'Unable to complete the sale.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleLoadSale(event: FormEvent) {
    event.preventDefault();

    if (!saleLookupId.trim()) {
      setError('Enter a sale ID to load.');
      return;
    }

    setBusy(true);
    setError('');
    setFlashMessage('');

    try {
      const sale = await inventoryService.getSale(saleLookupId.trim());
      setLoadedSale(sale);
      setReturnQuantities({});
      setFlashMessage(`Loaded sale ${sale.id.slice(0, 8)}.`);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load the sale.'));
    } finally {
      setBusy(false);
    }
  }

  async function loadSaleById(saleId: string) {
    setBusy(true);
    setError('');
    setFlashMessage('');

    try {
      const sale = await inventoryService.getSale(saleId);
      setSaleLookupId(sale.id);
      setLoadedSale(sale);
      setReturnQuantities({});
      setFlashMessage(`Loaded sale ${sale.id.slice(0, 8)}.`);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load the sale.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleReturnSubmit(event: FormEvent) {
    event.preventDefault();

    if (!loadedSale) {
      return;
    }

    const items = Object.entries(returnQuantities)
      .map(([saleItemId, quantity]) => ({
        saleItemId,
        quantity: Number(quantity),
      }))
      .filter((item) => item.quantity > 0);

    if (!items.length) {
      setError('Enter at least one quantity to return.');
      return;
    }

    setBusy(true);
    setError('');
    setFlashMessage('');

    try {
      const receipt = await inventoryService.createReturn({
        saleId: loadedSale.id,
        reason: returnReason || undefined,
        items,
      });

      const refreshedSale = await inventoryService.getSale(loadedSale.id);
      setLoadedSale(refreshedSale);
      setReturnQuantities({});
      setReturnReason('');
      await loadPageData(searchTerm);
      setFlashMessage(`Return ${receipt.id.slice(0, 8)} recorded.`);
    } catch (returnError) {
      setError(getErrorMessage(returnError, 'Unable to process the return.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      pageTitle="Point of Sale"
      pageSubtitle="Search products, build a cart, complete the sale, and process returns safely."
    >
      {error ? <div className="error-message">{error}</div> : null}
      {flashMessage ? <div className="success-message">{flashMessage}</div> : null}

      <section className="workspace-grid">
        <article className="surface-card surface-card-wide">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Product Search</span>
              <h2>Sell products</h2>
            </div>
            <input
              className="workspace-search"
              placeholder="Search products or SKU"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="product-card-grid">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                className="product-card"
                onClick={() => addToCart(product)}
              >
                <div className="product-card-top">
                  <span className="product-card-badge">{product.name.charAt(0)}</span>
                  <span className="product-stock-pill">
                    {product.availableQuantity} {product.unit}
                  </span>
                </div>
                <strong>{product.name}</strong>
                <span>{product.categoryName ?? product.sku}</span>
                <div className="product-card-footer">
                  <strong>{formatCurrency(product.salePrice)}</strong>
                  <span>{product.nextExpiry ? formatDate(product.nextExpiry) : 'No expiry'}</span>
                </div>
              </button>
            ))}

            {!loading && !products.length ? (
              <div className="surface-empty">No products matched the search.</div>
            ) : null}
          </div>
        </article>

        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Order Summary</span>
              <h2>Cart</h2>
            </div>
          </div>

          <div className="cart-list">
            {cart.length ? (
              cart.map((item) => (
                <div key={item.productId} className="cart-item-row">
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.sku}</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={item.availableQuantity}
                    value={item.quantity}
                    onChange={(event) => changeQuantity(item.productId, event.target.value)}
                  />
                  <strong>{formatCurrency(item.price * item.quantity)}</strong>
                  <button
                    type="button"
                    className="workspace-inline-link"
                    onClick={() => removeFromCart(item.productId)}
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <div className="surface-empty">Cart is empty.</div>
            )}
          </div>

          <div className="summary-box">
            <div>
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div>
              <span>Tax</span>
              <strong>{formatCurrency(tax)}</strong>
            </div>
            <div className="summary-box-total">
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </div>

          <div className="button-row">
            <button
              type="button"
              className={`workspace-pill-button${
                paymentMode === 'cash' ? ' active' : ''
              }`}
              onClick={() => setPaymentMode('cash')}
            >
              Cash
            </button>
            <button
              type="button"
              className={`workspace-pill-button${
                paymentMode === 'card' ? ' active' : ''
              }`}
              onClick={() => setPaymentMode('card')}
            >
              Card
            </button>
          </div>

          <button
            type="button"
            className="workspace-primary-action"
            onClick={handleCheckout}
            disabled={busy || !cart.length}
          >
            {busy ? 'Completing sale…' : 'Complete Sale'}
          </button>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Returns</span>
              <h2>Load sale and process a return</h2>
            </div>
          </div>

          <form className="workspace-inline-form" onSubmit={handleLoadSale}>
            <input
              className="workspace-search"
              placeholder="Enter sale ID"
              value={saleLookupId}
              onChange={(event) => setSaleLookupId(event.target.value)}
            />
            <button type="submit" className="workspace-secondary-action" disabled={busy}>
              Load Sale
            </button>
          </form>

          {loadedSale ? (
            <form className="stacked-form" onSubmit={handleReturnSubmit}>
              <div className="detail-card">
                <strong>Sale {loadedSale.id.slice(0, 8)}</strong>
                <span>{formatDate(loadedSale.soldAt)}</span>
              </div>
              {!hasReturnableItems ? (
                <div className="surface-empty">
                  All items from this sale have already been fully returned.
                </div>
              ) : null}
              {loadedSale.items.map((item) => (
                <div key={item.id} className="return-item-row">
                  <div>
                    <strong>{item.productName}</strong>
                    <span>
                      Sold {item.quantity} · Returnable {item.remainingReturnable}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={item.remainingReturnable}
                    disabled={item.remainingReturnable === 0}
                    value={returnQuantities[item.id] ?? ''}
                    onChange={(event) =>
                      setReturnQuantities((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
              <label className="workspace-field">
                <span>Reason</span>
                <textarea
                  rows={3}
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="workspace-primary-action"
                disabled={busy || !hasReturnableItems}
              >
                Record Return
              </button>
            </form>
          ) : (
            <div className="surface-empty">
              Load a sale to review returnable quantities and record the return.
            </div>
          )}
        </article>

        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Recent Sales</span>
              <h2>Latest checkouts</h2>
            </div>
          </div>
          <div className="stacked-list">
            {sales.length ? (
              sales.slice(0, 6).map((sale) => (
                <div key={sale.id} className="stacked-list-row">
                  <div>
                    <strong>Sale {sale.id.slice(0, 8)}</strong>
                    <span>{formatDate(sale.soldAt)}</span>
                  </div>
                  <div className="stacked-list-meta">
                    <strong>{formatCurrency(sale.totalAmount)}</strong>
                    <span>{sale.itemCount} items</span>
                  </div>
                  <button
                    type="button"
                    className="workspace-inline-link"
                    onClick={() => {
                      void loadSaleById(sale.id);
                    }}
                    disabled={busy}
                  >
                    Load
                  </button>
                </div>
              ))
            ) : (
              <div className="surface-empty">No sales recorded yet.</div>
            )}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
