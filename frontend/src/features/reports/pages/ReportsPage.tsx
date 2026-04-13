import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../shared/components/AppShell';
import { GroupedBarChart } from '../../../shared/components/charts/GroupedBarChart';
import { TrendLineChart } from '../../../shared/components/charts/TrendLineChart';
import { DonutBreakdownChart } from '../../../shared/components/charts/DonutBreakdownChart';
import { useAuth } from '../../auth/hooks/useAuth';
import { useAnalyticsAutoRefresh } from '../../realtime/hooks/useAnalyticsAutoRefresh';
import type { AnalyticsRefreshEvent } from '../../realtime/types/realtime.types';
import { dashboardService } from '../../dashboard/services/dashboard.service';
import type {
  DashboardReports,
  UiTone,
} from '../../dashboard/types/dashboard.types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  getErrorMessage,
} from '../../../shared/utils/format';

const RANGE_OPTIONS = [7, 30, 90];
const REPORT_REFRESH_SCOPES: AnalyticsRefreshEvent['scope'][] = [
  'inventory',
  'catalog',
  'purchases',
  'sales',
  'returns',
];
const CATEGORY_COLORS = [
  '#1b66d1',
  '#27b08b',
  '#ef8a43',
  '#536ce0',
  '#e45d8c',
  '#1aa5a7',
];
const REFRESH_REASON_LABEL: Record<AnalyticsRefreshEvent['reason'], string> = {
  'product.created': 'A product was added',
  'product.updated': 'A product was updated',
  'product.deleted': 'A product was removed',
  'batch.updated': 'A batch was updated',
  'category.created': 'A category was added',
  'category.updated': 'A category was updated',
  'category.deleted': 'A category was removed',
  'supplier.created': 'A supplier was added',
  'supplier.updated': 'A supplier was updated',
  'supplier.deleted': 'A supplier was removed',
  'purchase.received': 'A purchase was received',
  'sale.completed': 'A sale was completed',
  'return.completed': 'A return was processed',
  'user.created': 'A user was added',
};

function formatReportValue(
  value: number,
  format: 'currency' | 'number' | 'percent',
) {
  if (format === 'currency') {
    return formatCurrency(value);
  }

  if (format === 'percent') {
    return formatPercent(value);
  }

  return formatNumber(value);
}

function formatDelta(changePercent: number) {
  const absolute = Math.abs(changePercent);
  const prefix = changePercent > 0 ? '+' : changePercent < 0 ? '-' : '';
  return `${prefix}${absolute.toFixed(1)}%`;
}

function getDeltaTone(
  metricId: string,
  changePercent: number,
): 'positive' | 'negative' | 'neutral' {
  if (changePercent === 0) {
    return 'neutral';
  }

  const positiveIsGood = metricId !== 'refund-rate';

  if ((changePercent > 0 && positiveIsGood) || (changePercent < 0 && !positiveIsGood)) {
    return 'positive';
  }

  return 'negative';
}

function formatBucketLabel(label: string, bucket: 'week' | 'month') {
  const date = new Date(`${label}T00:00:00.000Z`);

  if (bucket === 'month') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
    }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function buildInsightCards(reports: DashboardReports) {
  const revenueComparison = reports.periodComparisons.find(
    (item) => item.id === 'revenue',
  );
  const profitComparison = reports.periodComparisons.find(
    (item) => item.id === 'profit',
  );
  const leadingCategory = reports.categoryPerformance[0];
  const catalogCoverage =
    reports.catalogSnapshot.totalProducts > 0
      ? (reports.catalogSnapshot.inStockProducts / reports.catalogSnapshot.totalProducts) * 100
      : 0;

  return [
    {
      id: 'momentum',
      tone: 'blue' as UiTone,
      title: 'Revenue Momentum',
      body: revenueComparison
        ? `${formatDelta(revenueComparison.changePercent)} versus the previous ${reports.rangeDays}-day window.`
        : 'Revenue movement is unavailable for the selected range.',
      accent: formatCurrency(reports.totals.netSales),
      helper: 'Net sales after refunds',
    },
    {
      id: 'margin',
      tone: 'green' as UiTone,
      title: 'Margin Quality',
      body: profitComparison
        ? `${formatDelta(profitComparison.changePercent)} in profit with a ${formatPercent(
            reports.totals.grossMarginPercent,
          )} gross margin.`
        : 'Profit analysis is not available yet.',
      accent: formatCurrency(reports.totals.estimatedProfit),
      helper: 'Estimated gross profit',
    },
    {
      id: 'category',
      tone: 'indigo' as UiTone,
      title: 'Category Leader',
      body: leadingCategory
        ? `${leadingCategory.categoryName} drives ${formatPercent(
            leadingCategory.sharePercent,
          )} of revenue with ${formatNumber(leadingCategory.quantitySold)} units sold.`
        : 'No category performance data is available for the selected range.',
      accent: leadingCategory ? formatCurrency(leadingCategory.revenue) : 'No leader',
      helper: 'Highest revenue category',
    },
    {
      id: 'catalog',
      tone: 'orange' as UiTone,
      title: 'Catalog Health',
      body: `${formatNumber(reports.catalogSnapshot.lowStockProducts)} low-stock and ${formatNumber(
        reports.catalogSnapshot.outOfStockProducts,
      )} out-of-stock products need monitoring.`,
      accent: formatPercent(catalogCoverage),
      helper: 'In-stock catalog coverage',
    },
  ];
}

function formatTransactionKind(kind: 'sale' | 'purchase' | 'return') {
  if (kind === 'sale') {
    return 'Sale';
  }

  if (kind === 'purchase') {
    return 'Purchase';
  }

  return 'Return';
}

export function ReportsPage() {
  const { user } = useAuth();
  const [rangeDays, setRangeDays] = useState(30);
  const [reports, setReports] = useState<DashboardReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadReports(nextRangeDays = rangeDays) {
    setError('');
    const data = await dashboardService.getReports(nextRangeDays);
    setReports(data);
    return data;
  }

  const { isRefreshing, lastEvent, lastRefreshedAt, markRefreshed } =
    useAnalyticsAutoRefresh({
      scopes: REPORT_REFRESH_SCOPES,
      onRefresh: async () => {
        await loadReports(rangeDays);
      },
    });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    void loadReports(rangeDays)
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

        setError(getErrorMessage(loadError, 'Unable to load reports.'));
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

  const insightCards = useMemo(
    () => (reports ? buildInsightCards(reports) : []),
    [reports],
  );

  const categoryBreakdown = useMemo(
    () =>
      reports?.categoryPerformance.map((item, index) => ({
        label: item.categoryName,
        value: item.revenue,
        helper: `${formatCurrency(item.estimatedProfit)} profit · ${formatNumber(
          item.quantitySold,
        )} units`,
        accent: formatPercent(item.sharePercent),
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      })) ?? [],
    [reports],
  );

  const reportTitle = user?.role === 'admin' ? 'Admin Analytics' : 'Operations Analytics';
  const reportSubtitle =
    'Live revenue, profit, category, product, and workforce reporting across the pharmacy operation.';
  const catalogCoverage =
    reports && reports.catalogSnapshot.totalProducts > 0
      ? (reports.catalogSnapshot.inStockProducts / reports.catalogSnapshot.totalProducts) * 100
      : 0;
  const averageOrdersPerDay = reports
    ? (reports.totals.totalOrders / Math.max(reports.rangeDays, 1)).toFixed(1)
    : '0.0';
  const liveSummary = lastEvent
    ? `${REFRESH_REASON_LABEL[lastEvent.reason]} and the dashboard synced at ${formatDateTime(
        lastEvent.occurredAt,
      )}.`
    : 'Inventory, catalog, sales, purchases, and return activity refresh this dashboard automatically.';

  return (
    <AppShell
      pageTitle={reportTitle}
      pageSubtitle={reportSubtitle}
      actions={
        <div className="reports-toolbar">
          <div className="reports-toolbar-copy">
            <span className="reports-toolbar-label">Reporting Window</span>
            <span
              className={`reports-live-pill${isRefreshing ? ' is-refreshing' : ''}`}
              aria-live="polite"
            >
              {isRefreshing ? 'Refreshing live data' : 'Live updates enabled'}
            </span>
          </div>

          <div className="reports-toolbar-controls">
            <span className="reports-sync-note">
              {lastRefreshedAt
                ? `Last sync ${formatDateTime(lastRefreshedAt)}`
                : 'Waiting for initial sync'}
            </span>
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
          </div>
        </div>
      }
    >
      {error ? <div className="error-message">{error}</div> : null}

      <section className="reports-kpi-grid">
        {reports
          ? reports.periodComparisons.map((item) => (
              <article key={item.id} className={`reports-kpi-card tone-${item.tone}`}>
                <div className="reports-kpi-header">
                  <span>{item.label}</span>
                  <strong
                    className={`reports-delta reports-delta-${getDeltaTone(
                      item.id,
                      item.changePercent,
                    )}`}
                  >
                    {formatDelta(item.changePercent)}
                  </strong>
                </div>
                <div className="reports-kpi-value">
                  {formatReportValue(item.currentValue, item.format)}
                </div>
                <div className="reports-kpi-foot">
                  <span>{item.helper}</span>
                  <strong>
                    Prev: {formatReportValue(item.previousValue, item.format)}
                  </strong>
                </div>
              </article>
            ))
          : Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="metric-card skeleton-card" />
            ))}
      </section>

      <section className="reports-hero-grid">
        <article className="surface-card surface-card-wide reports-hero-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Executive Revenue Pulse</span>
              <h2>Revenue, profit, and refund trend</h2>
            </div>
            {reports ? (
              <div className="reports-hero-stats">
                <div>
                  <span>Net Sales</span>
                  <strong>{formatCurrency(reports.totals.netSales)}</strong>
                </div>
                <div>
                  <span>Gross Margin</span>
                  <strong>{formatPercent(reports.totals.grossMarginPercent)}</strong>
                </div>
                <div>
                  <span>Avg Order</span>
                  <strong>{formatCurrency(reports.totals.averageOrderValue)}</strong>
                </div>
              </div>
            ) : null}
          </div>

          {reports ? (
            <TrendLineChart
              data={reports.performanceTrend}
              series={[
                { key: 'revenue', label: 'Revenue', color: '#1b66d1' },
                { key: 'profit', label: 'Profit', color: '#2fa36b' },
                { key: 'refunds', label: 'Refunds', color: '#ef6a4b' },
              ]}
            />
          ) : (
            <div className="surface-empty">Loading revenue and profit analytics…</div>
          )}
        </article>

        <article className="surface-card reports-live-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Realtime Operations</span>
              <h2>Live sync and stock posture</h2>
            </div>
          </div>

          <div className="reports-live-copy" aria-live="polite">
            <strong>{isRefreshing ? 'Syncing recent changes' : 'Live analytics active'}</strong>
            <p>{liveSummary}</p>
          </div>

          {reports ? (
            <>
              <div className="reports-live-grid">
                <div>
                  <span>Catalog Coverage</span>
                  <strong>{formatPercent(catalogCoverage)}</strong>
                </div>
                <div>
                  <span>Avg Orders / Day</span>
                  <strong>{averageOrdersPerDay}</strong>
                </div>
                <div>
                  <span>Purchases In</span>
                  <strong>{formatNumber(reports.movementSummary.purchasesIn)}</strong>
                </div>
                <div>
                  <span>Sales Out</span>
                  <strong>{formatNumber(reports.movementSummary.salesOut)}</strong>
                </div>
                <div>
                  <span>Returns</span>
                  <strong>{formatNumber(reports.movementSummary.returns)}</strong>
                </div>
                <div>
                  <span>Low Stock</span>
                  <strong>{formatNumber(reports.catalogSnapshot.lowStockProducts)}</strong>
                </div>
              </div>

              <div className="reports-live-note">
                {formatNumber(reports.catalogSnapshot.outOfStockProducts)} products currently
                have no sellable stock across the active catalog.
              </div>
            </>
          ) : (
            <div className="surface-empty">Preparing live operational insight…</div>
          )}
        </article>
      </section>

      <section className="workspace-grid">
        <article className="surface-card reports-employee-spotlight">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Best Employee</span>
              <h2>Top-performing closer</h2>
            </div>
          </div>

          {reports?.bestEmployee ? (
            <div className="employee-spotlight">
              <div className="employee-spotlight-top">
                <div>
                  <strong>{reports.bestEmployee.name}</strong>
                  <span>{reports.bestEmployee.email}</span>
                </div>
                <div
                  className="employee-score-ring"
                  style={{
                    background: `conic-gradient(#1b66d1 ${reports.bestEmployee.performanceScore}%, rgba(27, 102, 209, 0.12) 0)`,
                  }}
                >
                  <div>
                    <strong>{reports.bestEmployee.performanceScore}</strong>
                    <span>Score</span>
                  </div>
                </div>
              </div>

              <div className="employee-spotlight-grid">
                <div>
                  <span>Revenue</span>
                  <strong>{formatCurrency(reports.bestEmployee.revenue)}</strong>
                </div>
                <div>
                  <span>Profit</span>
                  <strong>{formatCurrency(reports.bestEmployee.estimatedProfit)}</strong>
                </div>
                <div>
                  <span>Orders</span>
                  <strong>{formatNumber(reports.bestEmployee.completedSales)}</strong>
                </div>
                <div>
                  <span>Consistency</span>
                  <strong>{formatPercent(reports.bestEmployee.consistencyScore)}</strong>
                </div>
                <div>
                  <span>Avg Order</span>
                  <strong>
                    {formatCurrency(reports.bestEmployee.averageOrderValue)}
                  </strong>
                </div>
                <div>
                  <span>Margin</span>
                  <strong>
                    {formatPercent(reports.bestEmployee.profitMarginPercent)}
                  </strong>
                </div>
              </div>

              <p className="employee-spotlight-note">
                Ranked #{reports.bestEmployee.rank} for balancing revenue, profit
                contribution, closed orders, and selling consistency across the
                selected period.
              </p>
            </div>
          ) : (
            <div className="surface-empty">
              No employee performance data is available for this reporting window.
            </div>
          )}
        </article>

        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Category Mix</span>
              <h2>Revenue distribution by category</h2>
            </div>
          </div>

          <DonutBreakdownChart
            items={categoryBreakdown}
            centerLabel="Net sales"
            centerValue={reports ? formatCurrency(reports.totals.netSales) : '$0.00'}
            emptyMessage="No category sales data is available yet."
          />
        </article>
      </section>

      <section className="workspace-grid">
        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Weekly Analytics</span>
              <h2>Last 8 weeks</h2>
            </div>
          </div>
          {reports ? (
            <GroupedBarChart
              data={reports.weeklyAnalytics.map((item) => ({
                label: formatBucketLabel(item.label, 'week'),
                first: item.revenue,
                second: item.profit,
              }))}
              firstLabel="Revenue"
              secondLabel="Profit"
            />
          ) : (
            <div className="surface-empty">Loading weekly analytics…</div>
          )}
        </article>

        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Monthly Analytics</span>
              <h2>Last 6 months</h2>
            </div>
          </div>
          {reports ? (
            <GroupedBarChart
              data={reports.monthlyAnalytics.map((item) => ({
                label: formatBucketLabel(item.label, 'month'),
                first: item.revenue,
                second: item.profit,
              }))}
              firstLabel="Revenue"
              secondLabel="Profit"
            />
          ) : (
            <div className="surface-empty">Loading monthly analytics…</div>
          )}
        </article>
      </section>

      <section className="workspace-grid">
        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Employee Ranking</span>
              <h2>Top-performing employees</h2>
            </div>
          </div>

          {reports?.employeeRanking.length ? (
            <div className="employee-ranking-list">
              {reports.employeeRanking.slice(0, 5).map((employee) => (
                <div key={employee.id} className="employee-ranking-row">
                  <div className="employee-ranking-head">
                    <div className="employee-rank-badge">#{employee.rank}</div>
                    <div>
                      <strong>{employee.name}</strong>
                      <span>{employee.email}</span>
                    </div>
                  </div>

                  <div className="employee-ranking-metrics">
                    <div>
                      <span>Revenue</span>
                      <strong>{formatCurrency(employee.revenue)}</strong>
                    </div>
                    <div>
                      <span>Profit</span>
                      <strong>{formatCurrency(employee.estimatedProfit)}</strong>
                    </div>
                    <div>
                      <span>Orders</span>
                      <strong>{formatNumber(employee.completedSales)}</strong>
                    </div>
                    <div>
                      <span>Consistency</span>
                      <strong>{formatPercent(employee.consistencyScore)}</strong>
                    </div>
                  </div>

                  <div className="employee-performance-bar">
                    <div
                      className="employee-performance-fill"
                      style={{ width: `${employee.performanceScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="surface-empty">No employee leaderboard data yet.</div>
          )}
        </article>

        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Decision Support</span>
              <h2>Executive insights</h2>
            </div>
          </div>

          <div className="reports-insight-grid">
            {insightCards.map((insight) => (
              <article key={insight.id} className={`insight-card tone-${insight.tone}`}>
                <span>{insight.title}</span>
                <strong>{insight.accent}</strong>
                <p>{insight.body}</p>
                <small>{insight.helper}</small>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="surface-card surface-card-wide">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Product Intelligence</span>
              <h2>Top sellers and newest catalog additions</h2>
            </div>
          </div>

          <div className="reports-product-grid">
            <div className="reports-product-section">
              <div className="reports-section-label">Top sellers</div>
              {reports?.topProducts.length ? (
                <div className="reports-product-list">
                  {reports.topProducts.map((item) => (
                    <div key={item.id} className="reports-product-row">
                      <div className="reports-product-head">
                        <div className="reports-product-copy">
                          <strong>{item.productName}</strong>
                          <span>{item.categoryName ?? item.sku}</span>
                        </div>
                        <span className="reports-product-status">
                          {formatNumber(item.availableQuantity)} in stock
                        </span>
                      </div>

                      <div className="reports-product-metrics">
                        <div>
                          <span>Revenue</span>
                          <strong>{formatCurrency(item.revenue)}</strong>
                        </div>
                        <div>
                          <span>Profit</span>
                          <strong>{formatCurrency(item.estimatedProfit)}</strong>
                        </div>
                        <div>
                          <span>Units</span>
                          <strong>{formatNumber(item.quantitySold)}</strong>
                        </div>
                        <div>
                          <span>Margin</span>
                          <strong>{formatPercent(item.profitMarginPercent)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="surface-empty">No product sales data available.</div>
              )}
            </div>

            <div className="reports-product-section">
              <div className="reports-section-label">Recently added products</div>
              {reports?.catalogSnapshot.recentProducts.length ? (
                <div className="reports-product-list">
                  {reports.catalogSnapshot.recentProducts.map((product) => (
                    <div key={product.id} className="reports-product-row">
                      <div className="reports-product-head">
                        <div className="reports-product-copy">
                          <strong>{product.name}</strong>
                          <span>{product.categoryName ?? product.sku}</span>
                        </div>
                        <span className="reports-product-status reports-product-status-live">
                          Added {formatDateTime(product.createdAt)}
                        </span>
                      </div>

                      <div className="reports-product-metrics">
                        <div>
                          <span>Price</span>
                          <strong>{formatCurrency(product.salePrice)}</strong>
                        </div>
                        <div>
                          <span>Available</span>
                          <strong>{formatNumber(product.availableQuantity)}</strong>
                        </div>
                        <div>
                          <span>SKU</span>
                          <strong>{product.sku}</strong>
                        </div>
                        <div>
                          <span>Status</span>
                          <strong>
                            {product.availableQuantity > 0 ? 'Sellable' : 'No stock'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="surface-empty">No recent products are available.</div>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="surface-card surface-card-wide">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Activity Ledger</span>
              <h2>Recent financial and stock events</h2>
            </div>
          </div>

          {reports?.recentTransactions.length ? (
            <div className="table-card">
              <table className="workspace-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Details</th>
                    <th>Items</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.recentTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatDate(transaction.date)}</td>
                      <td>
                        <span
                          className={`reports-kind-pill reports-kind-${transaction.kind}`}
                        >
                          {formatTransactionKind(transaction.kind)}
                        </span>
                      </td>
                      <td>
                        <strong>{transaction.title}</strong>
                        <div className="table-subcopy">{transaction.subtitle}</div>
                      </td>
                      <td>{formatNumber(transaction.itemCount)}</td>
                      <td>{formatCurrency(transaction.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="surface-empty">No recent transactions available.</div>
          )}
        </article>
      </section>
    </AppShell>
  );
}
