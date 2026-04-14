import { useEffect, useState } from 'react';
import { AppShell } from '../../../shared/components/AppShell';
import { MetricCard } from '../../../shared/components/MetricCard';
import { TrendLineChart } from '../../../shared/components/charts/TrendLineChart';
import { HorizontalBarChart } from '../../../shared/components/charts/HorizontalBarChart';
import { useAuth } from '../../auth/hooks/useAuth';
import { useAnalyticsAutoRefresh } from '../../realtime/hooks/useAnalyticsAutoRefresh';
import { dashboardService } from '../services/dashboard.service';
import type { DashboardOverview } from '../types/dashboard.types';
import {
  formatCurrency,
  formatDate,
  formatRole,
  getErrorMessage,
} from '../../../shared/utils/format';
import { AdminUserManagementSection } from '../components/AdminUserManagementSection';

const RANGE_OPTIONS = [7, 30, 90];

export function DashboardPage() {
  const { user } = useAuth();
  const [rangeDays, setRangeDays] = useState(7);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dashboardScopes =
    user?.role === 'admin'
      ? (['inventory', 'catalog', 'purchases', 'sales', 'returns', 'users'] as const)
      : (['inventory', 'catalog', 'purchases', 'sales', 'returns'] as const);

  async function loadOverview(nextRangeDays = rangeDays) {
    setError('');
    const data = await dashboardService.getOverview(nextRangeDays);
    setOverview(data);
    return data;
  }

  const { markRefreshed } = useAnalyticsAutoRefresh({
    scopes: [...dashboardScopes],
    enabled: Boolean(user),
    onRefresh: async () => {
      if (!user) {
        return;
      }

      await loadOverview(rangeDays);
    },
  });

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');

    void loadOverview(rangeDays)
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

        setError(getErrorMessage(loadError, 'Unable to load dashboard.'));
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
  }, [markRefreshed, rangeDays]);

  if (!user) {
    return null;
  }

  const displayName =
    `${user.firstName} ${user.lastName}`.trim() || user.email.split('@')[0];
  const isClient = user.role === 'customer';
  const isAdmin = user.role === 'admin';
  const productHighlights = overview?.featuredProducts ?? overview?.catalogHighlights ?? [];

  return (
    <AppShell
      pageTitle="Dashboard"
      pageSubtitle={`Welcome, ${displayName}. ${formatRole(user.role)} workspace overview.`}
      actions={
        <select
          className="workspace-select"
          value={rangeDays}
          onChange={(event) => setRangeDays(Number(event.target.value))}
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              Last {option} Days
            </option>
          ))}
        </select>
      }
    >
      {error ? <div className="error-message">{error}</div> : null}

      <section className="metric-grid">
        {(overview?.metrics ?? []).map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            helper={metric.helper}
            tone={metric.tone}
          />
        ))}
        {loading && !overview
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="metric-card skeleton-card" />
            ))
          : null}
      </section>

      <section className={`workspace-grid ${isClient ? 'workspace-grid-two' : ''}`}>
        <article className="surface-card surface-card-wide">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Overview</span>
              <h2>{isClient ? 'Catalog activity' : 'Sales performance'}</h2>
            </div>
          </div>
          {overview ? (
            <TrendLineChart
              data={overview.salesTrend}
              series={[
                { key: 'sales', label: 'Sales', color: '#1b66d1' },
                { key: 'returns', label: 'Returns', color: '#ef6a4b' },
                ...(isClient
                  ? []
                  : [{ key: 'purchases', label: 'Purchases', color: '#27b08b' }]),
              ]}
            />
          ) : (
            <div className="surface-empty">Loading chart data…</div>
          )}
        </article>

        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">
                {isClient ? 'Featured' : 'Top Sellers'}
              </span>
              <h2>{isClient ? 'Popular products' : 'Top products'}</h2>
            </div>
          </div>

          {productHighlights.length ? (
            <div className="product-highlight-list">
              {productHighlights.slice(0, 5).map((product) => (
                <div key={product.id} className="product-highlight-item">
                  <div className="product-highlight-badge">{product.name.charAt(0)}</div>
                  <div className="product-highlight-copy">
                    <strong>{product.name}</strong>
                    <span>{product.categoryName ?? product.sku}</span>
                  </div>
                  <div className="product-highlight-meta">
                    <strong>{formatCurrency(product.salePrice)}</strong>
                    <span>{product.availableQuantity} on hand</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="surface-empty">No product insights available yet.</div>
          )}
        </article>
      </section>

      <section className="workspace-grid workspace-grid-three">
        {!isClient ? (
          <>
            <article className="surface-card">
              <div className="surface-card-header">
                <div>
                  <span className="surface-card-eyebrow">Expiry Alerts</span>
                  <h2>Expiring soon</h2>
                </div>
              </div>
              {overview?.expiringSoon?.length ? (
                <div className="list-card">
                  {overview.expiringSoon.map((item) => (
                    <div key={item.id} className="list-row">
                      <div>
                        <strong>{item.productName}</strong>
                        <span>
                          Batch {item.batchNumber} · {formatDate(item.expiryDate)}
                        </span>
                      </div>
                      <div className="list-row-meta">
                        <strong>{item.onHand}</strong>
                        <span>{item.daysRemaining}d left</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="surface-empty">No expiring batches right now.</div>
              )}
            </article>

            <article className="surface-card">
              <div className="surface-card-header">
                <div>
                  <span className="surface-card-eyebrow">Stock Health</span>
                  <h2>Low stock alerts</h2>
                </div>
              </div>
              {overview?.lowStock?.length ? (
                <HorizontalBarChart
                  items={overview.lowStock.map((item) => ({
                    label: item.productName,
                    value: item.availableQuantity,
                    helper: `${item.sku} · ${item.unit}`,
                  }))}
                  color="green"
                />
              ) : (
                <div className="surface-empty">Inventory is well stocked.</div>
              )}
            </article>
          </>
        ) : (
          <article className="surface-card surface-card-span-two">
            <div className="surface-card-header">
              <div>
                <span className="surface-card-eyebrow">Product Availability</span>
                <h2>Fresh catalog picks</h2>
              </div>
            </div>
            <div className="catalog-card-grid">
              {productHighlights.slice(0, 4).map((product) => (
                <article key={product.id} className="catalog-card">
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
                      <strong>{product.availableQuantity}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>
        )}

        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Recent Activity</span>
              <h2>Latest transactions</h2>
            </div>
          </div>

          {overview?.recentTransactions?.length ? (
            <div className="transaction-list">
              {overview.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="transaction-row">
                  <div>
                    <strong>{transaction.title}</strong>
                    <span>
                      {transaction.subtitle} · {formatDate(transaction.date)}
                    </span>
                  </div>
                  <strong>{formatCurrency(transaction.amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="surface-empty">
              {isClient
                ? 'Customer dashboards do not include transaction history.'
                : 'No recent transactions yet.'}
            </div>
          )}
        </article>
      </section>

      {isAdmin ? <AdminUserManagementSection /> : null}
    </AppShell>
  );
}
