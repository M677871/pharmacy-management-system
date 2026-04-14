import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../../shared/components/AppShell';
import { useAuth } from '../../auth/hooks/useAuth';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import { realtimeEvent } from '../../realtime/types/realtime.types';
import { ordersService } from '../services/orders.service';
import type { DeliveryDriver, OrderRecord, OrderStatus } from '../types/order.types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getErrorMessage,
} from '../../../shared/utils/format';

const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; tone: 'blue' | 'orange' | 'green' | 'red' | 'teal' }
> = {
  pending_assignment: {
    label: 'Waiting for staff',
    tone: 'blue',
  },
  pending_review: {
    label: 'Awaiting review',
    tone: 'orange',
  },
  approved: {
    label: 'Approved',
    tone: 'green',
  },
  rejected: {
    label: 'Rejected',
    tone: 'red',
  },
  completed: {
    label: 'Completed',
    tone: 'teal',
  },
};

interface DriverFormState {
  id?: string;
  name: string;
  phone: string;
  email: string;
  vehicleDescription: string;
  notes: string;
}

interface OrderDraftState {
  deliveryDriverId: string;
  responseMessage: string;
  rejectionReason: string;
}

const EMPTY_DRIVER_FORM: DriverFormState = {
  name: '',
  phone: '',
  email: '',
  vehicleDescription: '',
  notes: '',
};

function getDefaultDraft(activeDrivers: DeliveryDriver[]): OrderDraftState {
  return {
    deliveryDriverId: activeDrivers[0]?.id ?? '',
    responseMessage: '',
    rejectionReason: '',
  };
}

function buildWhatsappUrl(order: OrderRecord) {
  const phone = order.deliveryDriver?.phone?.replace(/[^\d]/g, '');
  if (!phone) {
    return null;
  }

  const text = encodeURIComponent(
    `Hello ${order.deliveryDriver?.name ?? ''}, this is for order ${order.orderNumber}. I am sending my delivery location now.`,
  );
  return `https://wa.me/${phone}?text=${text}`;
}

export function OrdersPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'employee';
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');
  const [driverForm, setDriverForm] = useState<DriverFormState>(EMPTY_DRIVER_FORM);
  const [drafts, setDrafts] = useState<Record<string, OrderDraftState>>({});

  const activeDrivers = useMemo(
    () => drivers.filter((driver) => driver.isActive),
    [drivers],
  );

  useEffect(() => {
    setDrafts((current) => {
      const fallbackDriverId = activeDrivers[0]?.id ?? '';
      let changed = false;
      const nextDrafts = Object.fromEntries(
        Object.entries(current).map(([orderId, draft]) => {
          if (
            !draft.deliveryDriverId ||
            activeDrivers.some((driver) => driver.id === draft.deliveryDriverId)
          ) {
            return [orderId, draft];
          }

          changed = true;
          return [
            orderId,
            {
              ...draft,
              deliveryDriverId: fallbackDriverId,
            },
          ];
        }),
      );

      return changed ? nextDrafts : current;
    });
  }, [activeDrivers]);

  const orderMetrics = useMemo(() => {
    return orders.reduce(
      (summary, order) => {
        summary.total += 1;
        if (
          order.status === 'pending_assignment' ||
          order.status === 'pending_review'
        ) {
          summary.open += 1;
        }
        if (order.status === 'pending_review') {
          summary.awaitingReview += 1;
        }
        if (order.status === 'approved') {
          summary.approved += 1;
        }
        if (order.status === 'completed') {
          summary.completed += 1;
        }
        return summary;
      },
      { total: 0, open: 0, awaitingReview: 0, approved: 0, completed: 0 },
    );
  }, [orders]);

  async function loadPageData() {
    if (!user) {
      setOrders([]);
      setDrivers([]);
      return;
    }

    const [orderData, driverData] = await Promise.all([
      ordersService.listOrders(),
      isStaff ? ordersService.listDrivers() : Promise.resolve([]),
    ]);

    setError('');
    setOrders(orderData);
    setDrivers(driverData);
  }

  useEffect(() => {
    let active = true;

    void loadPageData()
      .catch((loadError) => {
        if (!active) {
          return;
        }

        setError(getErrorMessage(loadError, 'Unable to load orders.'));
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
  }, [isStaff, user?.id]);

  useRealtimeEvent(realtimeEvent.orderCreated, () => {
    void loadPageData().catch(() => {
      return;
    });
  });

  useRealtimeEvent(realtimeEvent.orderUpdated, () => {
    void loadPageData().catch(() => {
      return;
    });
  });

  if (!user) {
    return null;
  }

  function getDraft(orderId: string) {
    return drafts[orderId] ?? getDefaultDraft(activeDrivers);
  }

  function updateDraft(
    orderId: string,
    nextState: Partial<OrderDraftState>,
  ) {
    setDrafts((current) => ({
      ...current,
      [orderId]: {
        ...getDefaultDraft(activeDrivers),
        ...current[orderId],
        ...nextState,
      },
    }));
  }

  async function handleApprove(order: OrderRecord) {
    const draft = getDraft(order.id);
    if (!draft.deliveryDriverId) {
      setError('Select an active delivery driver before approving the order.');
      return;
    }

    setBusyKey(`approve:${order.id}`);
    setError('');

    try {
      const updatedOrder = await ordersService.approveOrder(order.id, {
        deliveryDriverId: draft.deliveryDriverId,
        responseMessage: draft.responseMessage.trim() || undefined,
      });

      setOrders((current) =>
        current.map((item) => (item.id === updatedOrder.id ? updatedOrder : item)),
      );
      setFlashMessage(`${updatedOrder.orderNumber} was approved and assigned.`);
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'Unable to approve the order.'));
    } finally {
      setBusyKey('');
    }
  }

  async function handleReject(order: OrderRecord) {
    const draft = getDraft(order.id);
    if (!draft.rejectionReason.trim()) {
      setError('Add a rejection reason before rejecting the order.');
      return;
    }

    setBusyKey(`reject:${order.id}`);
    setError('');

    try {
      const updatedOrder = await ordersService.rejectOrder(order.id, {
        reason: draft.rejectionReason.trim(),
      });

      setOrders((current) =>
        current.map((item) => (item.id === updatedOrder.id ? updatedOrder : item)),
      );
      setFlashMessage(`${updatedOrder.orderNumber} was rejected.`);
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'Unable to reject the order.'));
    } finally {
      setBusyKey('');
    }
  }

  async function handleMarkPaid(order: OrderRecord) {
    setBusyKey(`paid:${order.id}`);
    setError('');

    try {
      const updatedOrder = await ordersService.markPaid(order.id);
      setOrders((current) =>
        current.map((item) => (item.id === updatedOrder.id ? updatedOrder : item)),
      );
      setFlashMessage(`${updatedOrder.orderNumber} was recorded as a completed cash sale.`);
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'Unable to complete the order.'));
    } finally {
      setBusyKey('');
    }
  }

  async function handleLocationShared(order: OrderRecord) {
    setBusyKey(`location:${order.id}`);
    setError('');

    try {
      const updatedOrder = await ordersService.markLocationShared(order.id);
      setOrders((current) =>
        current.map((item) => (item.id === updatedOrder.id ? updatedOrder : item)),
      );
      setFlashMessage(`${updatedOrder.orderNumber} location handoff was confirmed.`);
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'Unable to update the order.'));
    } finally {
      setBusyKey('');
    }
  }

  async function handleDriverSubmit(event: FormEvent) {
    event.preventDefault();
    setBusyKey(driverForm.id ? `driver:save:${driverForm.id}` : 'driver:create');
    setError('');

    try {
      const payload = {
        name: driverForm.name.trim(),
        phone: driverForm.phone.trim(),
        email: driverForm.email.trim() || undefined,
        vehicleDescription: driverForm.vehicleDescription.trim() || undefined,
        notes: driverForm.notes.trim() || undefined,
      };

      if (driverForm.id) {
        const updatedDriver = await ordersService.updateDriver(driverForm.id, {
          name: payload.name,
          phone: payload.phone,
          email: payload.email || null,
          vehicleDescription: payload.vehicleDescription || null,
          notes: payload.notes || null,
        });

        setDrivers((current) =>
          current.map((item) => (item.id === updatedDriver.id ? updatedDriver : item)),
        );
        setFlashMessage(`${updatedDriver.name} details were updated.`);
      } else {
        const createdDriver = await ordersService.createDriver(payload);
        setDrivers((current) => [createdDriver, ...current]);
        setFlashMessage(`${createdDriver.name} is now available for delivery assignments.`);
      }

      setDriverForm(EMPTY_DRIVER_FORM);
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to save the delivery driver.'));
    } finally {
      setBusyKey('');
    }
  }

  async function handleDriverToggle(driver: DeliveryDriver) {
    setBusyKey(`driver:toggle:${driver.id}`);
    setError('');

    try {
      const updatedDriver = await ordersService.updateDriver(driver.id, {
        isActive: !driver.isActive,
      });

      setDrivers((current) =>
        current.map((item) => (item.id === updatedDriver.id ? updatedDriver : item)),
      );
      setFlashMessage(
        `${updatedDriver.name} is now ${updatedDriver.isActive ? 'active' : 'inactive'}.`,
      );
    } catch (toggleError) {
      setError(getErrorMessage(toggleError, 'Unable to update the driver.'));
    } finally {
      setBusyKey('');
    }
  }

  async function handleDeleteDriver(driver: DeliveryDriver) {
    if (!window.confirm(`Delete ${driver.name}?`)) {
      return;
    }

    setBusyKey(`driver:delete:${driver.id}`);
    setError('');

    try {
      await ordersService.deleteDriver(driver.id);
      setDrivers((current) => current.filter((item) => item.id !== driver.id));
      if (driverForm.id === driver.id) {
        setDriverForm(EMPTY_DRIVER_FORM);
      }
      setFlashMessage(`${driver.name} was deleted from the registry.`);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete the driver.'));
    } finally {
      setBusyKey('');
    }
  }

  return (
    <AppShell
      pageTitle="Orders"
      pageSubtitle={
        isStaff
          ? 'Review catalog orders, assign delivery drivers, and complete cash deliveries live.'
          : 'Track every pharmacy order, driver handoff, and delivery step in one place.'
      }
      actions={
        <div className="messages-toolbar">
          <div className="messages-toolbar-pill">
            <span className="messages-toolbar-pill-label">Open</span>
            <strong>{orderMetrics.open}</strong>
          </div>
          <div className="messages-toolbar-pill">
            <span className="messages-toolbar-pill-label">Approved</span>
            <strong>{orderMetrics.approved}</strong>
          </div>
          <div className="messages-toolbar-pill">
            <span className="messages-toolbar-pill-label">Completed</span>
            <strong>{orderMetrics.completed}</strong>
          </div>
        </div>
      }
    >
      {error ? <div className="error-message">{error}</div> : null}
      {flashMessage ? <div className="success-message">{flashMessage}</div> : null}

      <div className="workspace-grid orders-page-grid">
        <section className="surface-card orders-board-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">
                {isStaff ? 'Live Order Queue' : 'My Pharmacy Orders'}
              </span>
              <h2>{isStaff ? 'Orders needing action' : 'Order status and delivery handoff'}</h2>
            </div>
            {!isStaff ? (
              <Link to="/catalog" className="workspace-inline-link">
                Back to Catalog
              </Link>
            ) : null}
          </div>

          {loading ? (
            <div className="surface-empty">Loading orders…</div>
          ) : orders.length ? (
            <div className="orders-list">
              {orders.map((order) => {
                const statusMeta = ORDER_STATUS_META[order.status];
                const whatsappUrl = buildWhatsappUrl(order);
                const draft = getDraft(order.id);

                return (
                  <article key={order.id} className="order-card">
                    <div className="order-card-top">
                      <div>
                        <span className={`order-status-badge tone-${statusMeta.tone}`}>
                          {statusMeta.label}
                        </span>
                        <strong>{order.orderNumber}</strong>
                        <span>
                          Created {formatDateTime(order.createdAt)}
                          {order.assignedAt ? ` • Assigned ${formatDateTime(order.assignedAt)}` : ''}
                        </span>
                      </div>
                      <div className="order-card-total">
                        <strong>{formatCurrency(order.totalAmount)}</strong>
                        <span>{order.itemCount} line item(s)</span>
                      </div>
                    </div>

                    <div className="order-meta-grid">
                      <div>
                        <span className="surface-card-eyebrow">Client</span>
                        <strong>{order.client.displayName}</strong>
                        <span>{order.client.email}</span>
                      </div>
                      <div>
                        <span className="surface-card-eyebrow">
                          {isStaff ? 'Assigned Employee' : 'Handled By'}
                        </span>
                        <strong>{order.assignedEmployee?.displayName ?? 'Waiting assignment'}</strong>
                        <span>
                          {order.assignedEmployee?.email ??
                            'The next online employee will receive this order automatically.'}
                        </span>
                      </div>
                      <div>
                        <span className="surface-card-eyebrow">Delivery</span>
                        <strong>{order.deliveryDriver?.name ?? 'Not assigned yet'}</strong>
                        <span>
                          {order.deliveryDriver?.phone ?? 'Driver details appear after approval.'}
                        </span>
                      </div>
                    </div>

                    <div className="order-item-stack">
                      {order.items.map((item) => (
                        <div key={item.id} className="order-item-row">
                          <div>
                            <strong>{item.productName}</strong>
                            <span>
                              {item.sku} • {item.quantity} {item.unit}
                            </span>
                          </div>
                          <strong>{formatCurrency(item.lineTotal)}</strong>
                        </div>
                      ))}
                    </div>

                    {order.notes ? (
                      <div className="order-note-card">
                        <span className="surface-card-eyebrow">Client note</span>
                        <p>{order.notes}</p>
                      </div>
                    ) : null}

                    {order.rejectionReason ? (
                      <div className="order-note-card order-note-card-rejected">
                        <span className="surface-card-eyebrow">Rejection reason</span>
                        <p>{order.rejectionReason}</p>
                      </div>
                    ) : null}

                    {order.approvalMessage ? (
                      <div className="order-note-card">
                        <span className="surface-card-eyebrow">Approval note</span>
                        <p>{order.approvalMessage}</p>
                      </div>
                    ) : null}

                    {isStaff && order.status === 'pending_review' ? (
                      <div className="order-action-card">
                        <div className="workspace-form-grid">
                          <label className="workspace-field">
                            <span>Delivery Driver</span>
                            <select
                              value={draft.deliveryDriverId}
                              onChange={(event) =>
                                updateDraft(order.id, {
                                  deliveryDriverId: event.target.value,
                                })
                              }
                            >
                              <option value="">Select a driver</option>
                              {activeDrivers.map((driver) => (
                                <option key={driver.id} value={driver.id}>
                                  {driver.name} • {driver.phone}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="workspace-field">
                            <span>Approval Message</span>
                            <input
                              value={draft.responseMessage}
                              placeholder="Optional note for the client"
                              onChange={(event) =>
                                updateDraft(order.id, {
                                  responseMessage: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="workspace-field workspace-field-span-two">
                            <span>Reject Reason</span>
                            <textarea
                              rows={3}
                              value={draft.rejectionReason}
                              placeholder="Explain why the order cannot be fulfilled"
                              onChange={(event) =>
                                updateDraft(order.id, {
                                  rejectionReason: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>

                        <div className="button-row">
                          <button
                            type="button"
                            className="workspace-primary-action"
                            disabled={busyKey === `approve:${order.id}`}
                            onClick={() => void handleApprove(order)}
                          >
                            Approve and assign driver
                          </button>
                          <button
                            type="button"
                            className="workspace-danger-action"
                            disabled={busyKey === `reject:${order.id}`}
                            onClick={() => void handleReject(order)}
                          >
                            Reject order
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {isStaff && order.status === 'approved' ? (
                      <div className="order-action-card">
                        <div className="order-payment-banner">
                          <div>
                            <strong>Cash handoff pending</strong>
                            <span>
                              Wait for the delivery driver to return cash, then record the
                              sale.
                            </span>
                          </div>
                          <button
                            type="button"
                            className="workspace-primary-action"
                            disabled={busyKey === `paid:${order.id}`}
                            onClick={() => void handleMarkPaid(order)}
                          >
                            Mark paid and complete sale
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {!isStaff && order.status === 'approved' ? (
                      <div className="order-action-card">
                        <div className="order-payment-banner">
                          <div>
                            <strong>Share your location</strong>
                            <span>
                              Send your location directly to {order.deliveryDriver?.name} on
                              WhatsApp before delivery.
                            </span>
                          </div>
                          <div className="button-row">
                            <a
                              className="workspace-inline-link"
                              href={whatsappUrl ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open WhatsApp
                            </a>
                            <button
                              type="button"
                              className="workspace-primary-action"
                              disabled={
                                Boolean(order.locationSharedAt) ||
                                busyKey === `location:${order.id}`
                              }
                              onClick={() => void handleLocationShared(order)}
                            >
                              {order.locationSharedAt
                                ? 'Location already shared'
                                : 'I shared my location'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {order.locationSharedAt ? (
                      <div className="order-note-card order-note-card-success">
                        <span className="surface-card-eyebrow">Location handoff</span>
                        <p>Confirmed on {formatDateTime(order.locationSharedAt)}.</p>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="surface-empty">
              {isStaff
                ? 'No orders are assigned right now.'
                : 'No orders yet. Place one from the catalog to start the delivery flow.'}
            </div>
          )}
        </section>

        <aside className="surface-card orders-side-card">
          <div className="surface-card-header compact">
            <div>
              <span className="surface-card-eyebrow">
                {isStaff ? 'Operations Snapshot' : 'Next Steps'}
              </span>
              <h2>{isStaff ? 'Queue summary' : 'How delivery works'}</h2>
            </div>
          </div>

          <div className="stacked-list">
            <div className="stacked-list-row">
              <div>
                <strong>Total orders</strong>
                <span>All orders visible in this workspace</span>
              </div>
              <div className="stacked-list-meta">
                <strong>{orderMetrics.total}</strong>
              </div>
            </div>
            <div className="stacked-list-row">
              <div>
                <strong>Awaiting review</strong>
                <span>Orders that still need approval or rejection</span>
              </div>
              <div className="stacked-list-meta">
                <strong>{orderMetrics.awaitingReview}</strong>
              </div>
            </div>
            <div className="stacked-list-row">
              <div>
                <strong>Approved in transit</strong>
                <span>Waiting for location or cash handoff</span>
              </div>
              <div className="stacked-list-meta">
                <strong>{orderMetrics.approved}</strong>
              </div>
            </div>
          </div>

          {isStaff ? (
            <>
              <div className="surface-divider" />
              <div className="surface-card-header compact">
                <div>
                  <span className="surface-card-eyebrow">Driver Registry</span>
                  <h2>{driverForm.id ? 'Edit delivery driver' : 'Pre-register delivery drivers'}</h2>
                </div>
              </div>

              <form className="stacked-form" onSubmit={(event) => void handleDriverSubmit(event)}>
                <div className="workspace-form-grid">
                  <label className="workspace-field">
                    <span>Name</span>
                    <input
                      value={driverForm.name}
                      onChange={(event) =>
                        setDriverForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="workspace-field">
                    <span>Phone / WhatsApp</span>
                    <input
                      value={driverForm.phone}
                      onChange={(event) =>
                        setDriverForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="workspace-field">
                    <span>Email</span>
                    <input
                      value={driverForm.email}
                      onChange={(event) =>
                        setDriverForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="workspace-field">
                    <span>Vehicle</span>
                    <input
                      value={driverForm.vehicleDescription}
                      onChange={(event) =>
                        setDriverForm((current) => ({
                          ...current,
                          vehicleDescription: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="workspace-field workspace-field-span-two">
                    <span>Notes</span>
                    <textarea
                      rows={3}
                      value={driverForm.notes}
                      onChange={(event) =>
                        setDriverForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="workspace-primary-action"
                  disabled={
                    busyKey === 'driver:create' ||
                    busyKey === `driver:save:${driverForm.id}`
                  }
                >
                  {busyKey === `driver:save:${driverForm.id}`
                    ? 'Saving driver…'
                    : busyKey === 'driver:create'
                      ? 'Adding driver…'
                      : driverForm.id
                        ? 'Save delivery driver'
                        : 'Add delivery driver'}
                </button>
                {driverForm.id ? (
                  <button
                    type="button"
                    className="workspace-inline-link"
                    onClick={() => setDriverForm(EMPTY_DRIVER_FORM)}
                  >
                    Cancel edit
                  </button>
                ) : null}
              </form>

              <div className="surface-divider" />

              {drivers.length ? (
                <div className="orders-driver-list">
                  {drivers.map((driver) => (
                    <div key={driver.id} className="order-driver-row">
                      <div>
                        <strong>{driver.name}</strong>
                        <span>
                          {driver.phone}
                          {driver.vehicleDescription
                            ? ` • ${driver.vehicleDescription}`
                            : ''}
                        </span>
                      </div>
                      <div className="stacked-list-actions">
                        <button
                          type="button"
                          className="workspace-inline-link"
                          disabled={
                            busyKey === `driver:save:${driver.id}` ||
                            busyKey === `driver:toggle:${driver.id}` ||
                            busyKey === `driver:delete:${driver.id}`
                          }
                          onClick={() =>
                            setDriverForm({
                              id: driver.id,
                              name: driver.name,
                              phone: driver.phone,
                              email: driver.email || '',
                              vehicleDescription: driver.vehicleDescription || '',
                              notes: driver.notes || '',
                            })
                          }
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="workspace-inline-link"
                          disabled={
                            busyKey === `driver:save:${driver.id}` ||
                            busyKey === `driver:toggle:${driver.id}` ||
                            busyKey === `driver:delete:${driver.id}`
                          }
                          onClick={() => void handleDriverToggle(driver)}
                        >
                          {driver.isActive ? 'Set inactive' : 'Set active'}
                        </button>
                        <button
                          type="button"
                          className="workspace-inline-link workspace-inline-link-danger"
                          disabled={
                            busyKey === `driver:save:${driver.id}` ||
                            busyKey === `driver:toggle:${driver.id}` ||
                            busyKey === `driver:delete:${driver.id}`
                          }
                          onClick={() => void handleDeleteDriver(driver)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="surface-empty">
                  No delivery drivers yet. Add one before approving orders.
                </div>
              )}
            </>
          ) : (
            <>
              <div className="surface-divider" />
              <div className="orders-checklist">
                <div className="order-checklist-step">
                  <strong>1. Place the order in the catalog</strong>
                  <span>Only sellable products with live stock can be submitted.</span>
                </div>
                <div className="order-checklist-step">
                  <strong>2. Wait for approval</strong>
                  <span>
                    An employee receives the request instantly when online, or as soon as one
                    becomes active.
                  </span>
                </div>
                <div className="order-checklist-step">
                  <strong>3. Share your location on WhatsApp</strong>
                  <span>The assigned driver’s phone number appears after approval.</span>
                </div>
                <div className="order-checklist-step">
                  <strong>4. Pay cash on delivery</strong>
                  <span>The pharmacy marks the order paid after the driver returns cash.</span>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
