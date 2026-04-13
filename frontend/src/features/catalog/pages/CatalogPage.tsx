import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../../shared/components/AppShell';
import { useAnalyticsAutoRefresh } from '../../realtime/hooks/useAnalyticsAutoRefresh';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import { realtimeEvent } from '../../realtime/types/realtime.types';
import { dashboardService } from '../../dashboard/services/dashboard.service';
import type { CatalogProduct } from '../../dashboard/types/dashboard.types';
import { ordersService } from '../../orders/services/orders.service';
import type { OrderRecord } from '../../orders/types/order.types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getErrorMessage,
} from '../../../shared/utils/format';

const ORDER_STATUS_META = {
  pending_assignment: { label: 'Waiting for staff', tone: 'blue' },
  pending_review: { label: 'Awaiting review', tone: 'orange' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
  completed: { label: 'Completed', tone: 'teal' },
} as const;

export function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
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

  async function loadRecentOrders() {
    const data = await ordersService.listOrders();
    setRecentOrders(data.slice(0, 4));
    return data;
  }

  async function loadPageData(nextSearch = deferredSearch) {
    const [catalog] = await Promise.all([loadCatalog(nextSearch), loadRecentOrders()]);
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

  useRealtimeEvent(realtimeEvent.orderCreated, () => {
    void loadRecentOrders().catch(() => {
      return;
    });
  });

  useRealtimeEvent(realtimeEvent.orderUpdated, () => {
    void loadRecentOrders().catch(() => {
      return;
    });
  });

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
      setRecentOrders((current) => [createdOrder, ...current].slice(0, 4));
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

  return (
    <AppShell
      pageTitle="Catalog"
      pageSubtitle="Browse live stock, build a delivery request, and send it directly to the pharmacy team."
      actions={
        <Link to="/orders" className="workspace-inline-link">
          Track My Orders
        </Link>
      }
    >
      {error ? <div className="error-message">{error}</div> : null}
      {flashMessage ? <div className="success-message">{flashMessage}</div> : null}

      <div className="workspace-grid catalog-order-grid">
        <section className="surface-card catalog-browse-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Product Search</span>
              <h2>Available medicaments</h2>
            </div>
            <input
              className="workspace-search"
              placeholder="Search products"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          {loading ? (
            <div className="surface-empty">Loading catalog…</div>
          ) : products.length ? (
            <div className="catalog-card-grid">
              {products.map((product) => {
                const inCartQuantity = cart[product.id] ?? 0;
                const canOrder = product.availableQuantity > 0;

                return (
                  <article
                    key={product.id}
                    className={`catalog-card${canOrder ? '' : ' unavailable'}`}
                  >
                    <div className="catalog-card-header">
                      <div className="catalog-card-icon">{product.name.charAt(0)}</div>
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.categoryName ?? product.sku}</span>
                      </div>
                    </div>

                    <div className="catalog-card-body">
                      <div>
                        <span>Price</span>
                        <strong>{formatCurrency(product.salePrice)}</strong>
                      </div>
                      <div>
                        <span>Available</span>
                        <strong>{product.availableQuantity} units</strong>
                      </div>
                      <div>
                        <span>Next Expiry</span>
                        <strong>
                          {product.nextExpiry ? formatDate(product.nextExpiry) : 'Not set'}
                        </strong>
                      </div>
                    </div>

                    <div className="catalog-card-actions">
                      <div className="catalog-quantity-stepper">
                        <button
                          type="button"
                          className="catalog-stepper-button"
                          onClick={() =>
                            setProductQuantity(product, inCartQuantity - 1)
                          }
                          disabled={inCartQuantity <= 0}
                        >
                          -
                        </button>
                        <span>{inCartQuantity}</span>
                        <button
                          type="button"
                          className="catalog-stepper-button"
                          onClick={() =>
                            setProductQuantity(product, inCartQuantity + 1)
                          }
                          disabled={!canOrder || inCartQuantity >= product.availableQuantity}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="workspace-primary-action"
                        disabled={!canOrder}
                        onClick={() =>
                          setProductQuantity(
                            product,
                            Math.max(inCartQuantity, 1),
                          )
                        }
                      >
                        {canOrder ? 'Add to order' : 'Unavailable'}
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

        <aside className="surface-card catalog-order-side-card">
          <div className="surface-card-header compact">
            <div>
              <span className="surface-card-eyebrow">Order Draft</span>
              <h2>Build your delivery request</h2>
            </div>
          </div>

          {cartItems.length ? (
            <div className="orders-draft-list">
              {cartItems.map((item) => (
                <div key={item.id} className="order-draft-row">
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
            <div className="surface-empty">
              Start with the product cards on the left. Only in-stock items can be
              added to an order.
            </div>
          )}

          <div className="surface-divider" />

          <label className="workspace-field">
            <span>Notes for the employee</span>
            <textarea
              rows={4}
              placeholder="Optional instructions for delivery or contact details"
              value={orderNote}
              onChange={(event) => setOrderNote(event.target.value)}
            />
          </label>

          <div className="order-draft-total">
            <span>Estimated total</span>
            <strong>{formatCurrency(cartTotal)}</strong>
          </div>

          <button
            type="button"
            className="workspace-primary-action"
            disabled={!cartItems.length || submittingOrder}
            onClick={() => void handlePlaceOrder()}
          >
            Place order request
          </button>

          <div className="surface-divider" />

          <div className="surface-card-header compact">
            <div>
              <span className="surface-card-eyebrow">Recent Activity</span>
              <h2>Latest pharmacy updates</h2>
            </div>
          </div>

          {recentOrders.length ? (
            <div className="orders-draft-list">
              {recentOrders.map((order) => {
                const statusMeta = ORDER_STATUS_META[order.status];

                return (
                  <div key={order.id} className="catalog-order-activity-card">
                    <div className="catalog-order-activity-top">
                      <strong>{order.orderNumber}</strong>
                      <span className={`order-status-badge tone-${statusMeta.tone}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <span>
                      {formatDateTime(order.createdAt)}
                      {order.deliveryDriver
                        ? ` • Driver: ${order.deliveryDriver.name}`
                        : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="surface-empty">Your recent order activity appears here.</div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
