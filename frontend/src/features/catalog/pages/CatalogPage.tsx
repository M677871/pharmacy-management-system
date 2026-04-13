import { useDeferredValue, useEffect, useState } from 'react';
import { AppShell } from '../../../shared/components/AppShell';
import { useAnalyticsAutoRefresh } from '../../realtime/hooks/useAnalyticsAutoRefresh';
import { dashboardService } from '../../dashboard/services/dashboard.service';
import type { CatalogProduct } from '../../dashboard/types/dashboard.types';
import {
  formatCurrency,
  formatDate,
  getErrorMessage,
} from '../../../shared/utils/format';

export function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadCatalog(nextSearch = deferredSearch) {
    if (!loading) {
      setLoading(true);
    }

    const data = await dashboardService.getCatalog(nextSearch, 18);
    setError('');
    setProducts(data.items);
    return data;
  }

  const { markRefreshed } = useAnalyticsAutoRefresh({
    scopes: ['inventory', 'catalog'],
    onRefresh: async () => {
      await loadCatalog(deferredSearch);
    },
  });

  useEffect(() => {
    let active = true;

    void loadCatalog(deferredSearch)
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

  return (
    <AppShell
      pageTitle="Catalog"
      pageSubtitle="Browse the live product catalog and current product availability."
    >
      {error ? <div className="error-message">{error}</div> : null}

      <section className="surface-card">
        <div className="surface-card-header">
          <div>
            <span className="surface-card-eyebrow">Product Search</span>
            <h2>Available products</h2>
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
            {products.map((product) => (
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
                    <strong>{product.availableQuantity} units</strong>
                  </div>
                  <div>
                    <span>Next Expiry</span>
                    <strong>
                      {product.nextExpiry ? formatDate(product.nextExpiry) : 'Not set'}
                    </strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="surface-empty">No products matched the search.</div>
        )}
      </section>
    </AppShell>
  );
}
