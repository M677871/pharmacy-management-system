import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppShell } from '../../../shared/components/AppShell';
import { useAnalyticsAutoRefresh } from '../../realtime/hooks/useAnalyticsAutoRefresh';
import { dashboardService } from '../../dashboard/services/dashboard.service';
import type { CatalogProduct } from '../../dashboard/types/dashboard.types';
import { ordersService } from '../../orders/services/orders.service';
import {
  formatCurrency,
  formatDate,
  getErrorMessage,
} from '../../../shared/utils/format';

const CUSTOMER_CART_STORAGE_KEY = 'pharmaflow.customerCart';

function readStoredCart(): Record<string, number> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(CUSTOMER_CART_STORAGE_KEY) ?? '{}',
    ) as Record<string, unknown>;

    return Object.entries(parsed).reduce<Record<string, number>>(
      (nextCart, [productId, quantity]) => {
        if (typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0) {
          nextCart[productId] = Math.floor(quantity);
        }

        return nextCart;
      },
      {},
    );
  } catch {
    return {};
  }
}

export function CatalogPage() {
  const location = useLocation();
  const isCartRoute = location.pathname === '/cart';
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [cart, setCart] = useState<Record<string, number>>(() => readStoredCart());
  const [cartProductsById, setCartProductsById] = useState<
    Record<string, CatalogProduct>
  >({});
  const [orderNote, setOrderNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [error, setError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');

  async function loadCatalog(nextSearch = deferredSearch) {
    const data = await dashboardService.getCatalog(nextSearch, 24);
    setProducts(data.items);
    setCartProductsById((current) => {
      const nextState = { ...current };

      for (const product of data.items) {
        if (nextState[product.id]) {
          nextState[product.id] = product;
        }
      }

      return nextState;
    });
    return data;
  }

  async function loadPageData(nextSearch = deferredSearch) {
    const catalog = await loadCatalog(nextSearch);
    setError('');
    return catalog;
  }

  const { markRefreshed } = useAnalyticsAutoRefresh({
    scopes: ['inventory', 'catalog'],
    onRefresh: async () => {
      await loadCatalog(deferredSearch);
    },
  });

  useEffect(() => {
    let active = true;

    void loadPageData(deferredSearch)
      .then(() => {
        if (!active) {
          return;
        }

        markRefreshed();
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }

        setError(getErrorMessage(loadError, 'Unable to load the catalog.'));
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
  }, [deferredSearch, markRefreshed]);

  useEffect(() => {
    window.localStorage.setItem(CUSTOMER_CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product =
          cartProductsById[productId] ??
          products.find((candidate) => candidate.id === productId);

        if (!product || quantity <= 0) {
          return null;
        }

        return {
          ...product,
          quantity,
          lineTotal: product.salePrice * quantity,
        };
      })
      .filter((item): item is CatalogProduct & { quantity: number; lineTotal: number } =>
        Boolean(item),
      );
  }, [cart, cartProductsById, products]);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [cartItems],
  );

  function setProductQuantity(product: CatalogProduct, nextQuantity: number) {
    setCart((current) => {
      const safeQuantity = Math.max(0, Math.min(nextQuantity, product.availableQuantity));
      const nextCart = { ...current };

      if (safeQuantity <= 0) {
        delete nextCart[product.id];
        return nextCart;
      }

      nextCart[product.id] = safeQuantity;
      return nextCart;
    });
    setCartProductsById((current) => {
      if (nextQuantity <= 0) {
        const nextState = { ...current };
        delete nextState[product.id];
        return nextState;
      }

      return {
        ...current,
        [product.id]: product,
      };
    });
  }

  async function handlePlaceOrder() {
    if (!cartItems.length) {
      setError('Add at least one available product before placing an order.');
      return;
    }

    setSubmittingOrder(true);
    setError('');

    try {
      const createdOrder = await ordersService.createOrder({
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        notes: orderNote.trim() || undefined,
      });

      setCart({});
      setCartProductsById({});
      setOrderNote('');
      setFlashMessage(
        `${createdOrder.orderNumber} was submitted. You can track the status live from Orders.`,
      );
      await loadCatalog(deferredSearch);
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to place the order.'));
    } finally {
      setSubmittingOrder(false);
    }
  }

  const catalogSection = (
    <section className="surface-card catalog-browse-card client-catalog-card">
      <div className="surface-card-header client-section-header">
        <div>
          <span className="surface-card-eyebrow">Products</span>
          <h2>Available items</h2>
        </div>
        <input
          className="workspace-search client-search-input"
          placeholder="Search products"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      {loading ? (
        <div className="surface-empty">Loading catalog...</div>
      ) : products.length ? (
        <div className="catalog-card-grid client-product-grid">
          {products.map((product) => {
            const inCartQuantity = cart[product.id] ?? 0;
            const canOrder = product.availableQuantity > 0;

            return (
              <article
                key={product.id}
                className={`catalog-card client-product-card${canOrder ? '' : ' unavailable'}`}
              >
                <div className="client-product-card-top">
                  <div className="catalog-card-header">
                    <div className="catalog-card-icon">{product.name.charAt(0)}</div>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.categoryName ?? product.sku}</span>
                    </div>
                  </div>
                  <strong className="client-product-price">
                    {formatCurrency(product.salePrice)}
                  </strong>
                </div>

                <div className="catalog-card-body client-product-meta">
                  <div>
                    <span>Available</span>
                    <strong>{product.availableQuantity} units</strong>
                  </div>
                  <div>
                    <span>Expiry</span>
                    <strong>
                      {product.nextExpiry ? formatDate(product.nextExpiry) : 'No expiry'}
                    </strong>
                  </div>
                </div>

                <div className="catalog-card-actions client-product-actions">
                  <div className="catalog-quantity-stepper">
                    <button
                      type="button"
                      className="catalog-stepper-button"
                      onClick={() => setProductQuantity(product, inCartQuantity - 1)}
                      disabled={inCartQuantity <= 0}
                      aria-label={`Decrease ${product.name} quantity`}
                    >
                      -
                    </button>
                    <span>{inCartQuantity}</span>
                    <button
                      type="button"
                      className="catalog-stepper-button"
                      onClick={() => setProductQuantity(product, inCartQuantity + 1)}
                      disabled={!canOrder || inCartQuantity >= product.availableQuantity}
                      aria-label={`Increase ${product.name} quantity`}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="workspace-primary-action"
                    disabled={!canOrder}
                    onClick={() =>
                      setProductQuantity(product, Math.max(inCartQuantity, 1))
                    }
                  >
                    {canOrder ? 'Add' : 'Unavailable'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="surface-empty">No products matched the search.</div>
      )}
    </section>
  );

  const cartSection = (
    <aside className="surface-card catalog-order-side-card client-cart-card" id="cart">
      <div className="surface-card-header compact client-section-header">
        <div>
          <span className="surface-card-eyebrow">Cart</span>
          <h2>{cartItems.length ? `${cartItems.length} item(s)` : 'Your cart'}</h2>
        </div>
        {!isCartRoute ? (
          <Link to="/cart" className="workspace-inline-link">
            Open Cart
          </Link>
        ) : null}
      </div>

      {cartItems.length ? (
        <div className="orders-draft-list client-cart-list">
          {cartItems.map((item) => (
            <div key={item.id} className="order-draft-row client-cart-row">
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.quantity} x {formatCurrency(item.salePrice)}
                </span>
              </div>
              <div className="order-draft-row-actions">
                <strong>{formatCurrency(item.lineTotal)}</strong>
                <button
                  type="button"
                  className="workspace-secondary-action"
                  onClick={() => setProductQuantity(item, item.quantity - 1)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface-empty client-cart-empty">
          Your cart is empty. Add products from the catalog when you are ready.
        </div>
      )}

      <div className="surface-divider" />

      <label className="workspace-field client-note-field">
        <span>Delivery note</span>
        <textarea
          rows={4}
          placeholder="Optional delivery or contact details"
          value={orderNote}
          onChange={(event) => setOrderNote(event.target.value)}
        />
      </label>

      <div className="order-draft-total client-cart-total">
        <span>Total</span>
        <strong>{formatCurrency(cartTotal)}</strong>
      </div>

      <button
        type="button"
        className="workspace-primary-action client-checkout-button"
        disabled={!cartItems.length || submittingOrder}
        onClick={() => void handlePlaceOrder()}
      >
        {submittingOrder ? 'Placing order...' : 'Checkout'}
      </button>
    </aside>
  );

  return (
    <AppShell
      pageTitle={isCartRoute ? 'Cart' : 'Catalog'}
      pageSubtitle={
        isCartRoute
          ? 'Review your delivery request before checkout.'
          : 'Browse available products and order from the pharmacy.'
      }
      actions={
        <div className="client-top-actions">
          <Link
            to={isCartRoute ? '/catalog' : '/cart'}
            className="workspace-inline-link"
          >
            {isCartRoute ? 'Catalog' : `Cart (${cartItems.length})`}
          </Link>
          <Link to="/orders" className="workspace-inline-link">
            Orders
          </Link>
        </div>
      }
    >
      {error ? <div className="error-message">{error}</div> : null}
      {flashMessage ? <div className="success-message">{flashMessage}</div> : null}

      <div
        className={`workspace-grid catalog-order-grid client-catalog-layout${
          isCartRoute ? ' cart-first' : ''
        }`}
      >
        {isCartRoute ? (
          <>
            {cartSection}
            {catalogSection}
          </>
        ) : (
          <>
            {catalogSection}
            {cartSection}
          </>
        )}
      </div>
    </AppShell>
  );
}
