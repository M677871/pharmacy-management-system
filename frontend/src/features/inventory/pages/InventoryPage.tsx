import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AppShell } from '../../../shared/components/AppShell';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import { realtimeEvent } from '../../realtime/types/realtime.types';
import { inventoryService } from '../services/inventory.service';
import type {
  Category,
  ProductBatch,
  ProductSummary,
} from '../types/inventory.types';
import {
  formatCurrency,
  formatDate,
  getErrorMessage,
} from '../../../shared/utils/format';

interface ProductFormState {
  id?: string;
  sku: string;
  name: string;
  barcode: string;
  description: string;
  unit: string;
  salePrice: string;
  categoryId: string;
  isActive: boolean;
}

interface CategoryFormState {
  id?: string;
  name: string;
  description: string;
}

const EMPTY_PRODUCT_FORM: ProductFormState = {
  sku: '',
  name: '',
  barcode: '',
  description: '',
  unit: 'unit',
  salePrice: '',
  categoryId: '',
  isActive: true,
};

const EMPTY_CATEGORY_FORM: CategoryFormState = {
  name: '',
  description: '',
};

export function InventoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedBatches, setSelectedBatches] = useState<ProductBatch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(
    EMPTY_CATEGORY_FORM,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');

  function resolveCategoryId(categoryData: Category[], currentCategoryId: string) {
    return categoryData.some((category) => category.id === currentCategoryId)
      ? currentCategoryId
      : categoryData[0]?.id || '';
  }

  async function loadData(
    search = searchTerm,
    nextSelectedProductId = selectedProductId,
  ) {
    const [categoryData, productData] = await Promise.all([
      inventoryService.listCategories(),
      inventoryService.listProducts(search),
    ]);

    setError('');
    setCategories(categoryData);
    setProducts(productData);

    const fallbackCategoryId = categoryData[0]?.id || '';
    setProductForm((current) => ({
      ...current,
      categoryId: resolveCategoryId(categoryData, current.categoryId) || fallbackCategoryId,
    }));

    if (nextSelectedProductId) {
      const activeProduct =
        productData.find((product) => product.id === nextSelectedProductId) ?? null;

      if (activeProduct) {
        await inspectProduct(activeProduct, categoryData);
      } else {
        setSelectedProductId('');
        setSelectedBatches([]);
      }
    }
  }

  useEffect(() => {
    void loadData('')
      .catch((loadError) => {
        setError(getErrorMessage(loadError, 'Unable to load inventory.'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData(searchTerm).catch((loadError) => {
        setError(getErrorMessage(loadError, 'Unable to search products.'));
      });
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useRealtimeEvent(realtimeEvent.inventoryChanged, () => {
    void loadData(searchTerm, selectedProductId).catch(() => {
      return;
    });
  });

  async function inspectProduct(
    product: ProductSummary,
    categoryData = categories,
  ) {
    setSelectedProductId(product.id);
    setProductForm({
      id: product.id,
      sku: product.sku,
      name: product.name,
      barcode: product.barcode || '',
      description: product.description || '',
      unit: product.unit,
      salePrice: String(product.salePrice),
      categoryId:
        product.categoryId &&
        categoryData.some((category) => category.id === product.categoryId)
          ? product.categoryId
          : '',
      isActive: product.isActive,
    });
    const batches = await inventoryService.listProductBatches(product.id);
    setSelectedBatches(batches);
  }

  async function handleSaveProduct(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFlashMessage('');

    try {
      if (productForm.id) {
        await inventoryService.updateProduct(productForm.id, {
          sku: productForm.sku,
          name: productForm.name,
          barcode: productForm.barcode || null,
          description: productForm.description || null,
          unit: productForm.unit,
          salePrice: Number(productForm.salePrice),
          categoryId: productForm.categoryId || null,
          isActive: productForm.isActive,
        });
        setFlashMessage('Product updated successfully.');
      } else {
        const product = await inventoryService.createProduct({
          sku: productForm.sku,
          name: productForm.name,
          barcode: productForm.barcode || undefined,
          description: productForm.description || undefined,
          unit: productForm.unit,
          salePrice: Number(productForm.salePrice),
          categoryId: productForm.categoryId || undefined,
        });
        setSelectedProductId(product.id);
        setFlashMessage('Product created successfully.');
        await loadData(searchTerm, product.id);
        return;
      }

      await loadData(searchTerm);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save the product.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct() {
    if (!productForm.id) {
      return;
    }

    const productName = productForm.name.trim() || 'this product';
    if (!window.confirm(`Delete ${productName}?`)) {
      return;
    }

    setSaving(true);
    setError('');
    setFlashMessage('');

    try {
      await inventoryService.deleteProduct(productForm.id);
      setSelectedProductId('');
      setSelectedBatches([]);
      setProductForm({
        ...EMPTY_PRODUCT_FORM,
        categoryId: categories[0]?.id || '',
      });
      await loadData(searchTerm, '');
      setFlashMessage('Product deleted successfully.');
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete the product.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCategory(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFlashMessage('');

    try {
      if (categoryForm.id) {
        await inventoryService.updateCategory(categoryForm.id, {
          name: categoryForm.name,
          description: categoryForm.description || null,
        });
        await loadData(searchTerm, selectedProductId);
        setFlashMessage('Category updated successfully.');
      } else {
        const category = await inventoryService.createCategory({
          name: categoryForm.name,
          description: categoryForm.description || undefined,
        });
        await loadData(searchTerm, selectedProductId);
        setProductForm((current) => ({ ...current, categoryId: category.id }));
        setFlashMessage('Category created successfully.');
      }

      setCategoryForm(EMPTY_CATEGORY_FORM);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save the category.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(category: Category) {
    if (!window.confirm(`Delete ${category.name}?`)) {
      return;
    }

    setSaving(true);
    setError('');
    setFlashMessage('');

    try {
      await inventoryService.deleteCategory(category.id);
      if (categoryForm.id === category.id) {
        setCategoryForm(EMPTY_CATEGORY_FORM);
      }
      await loadData(searchTerm, selectedProductId);
      setFlashMessage('Category deleted successfully.');
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete the category.'));
    } finally {
      setSaving(false);
    }
  }

  const highlightedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  return (
    <AppShell
      pageTitle="Inventory Management"
      pageSubtitle="Maintain the product catalog, review batch availability, and edit stock-facing product details."
      actions={
        <button
          type="button"
          className="workspace-primary-action"
          onClick={() => {
            setSelectedProductId('');
            setSelectedBatches([]);
            setProductForm({
              ...EMPTY_PRODUCT_FORM,
              categoryId: categories[0]?.id || '',
            });
          }}
        >
          Add Product
        </button>
      }
    >
      {error ? <div className="error-message">{error}</div> : null}
      {flashMessage ? <div className="success-message">{flashMessage}</div> : null}

      <section className="workspace-grid">
        <article className="surface-card surface-card-wide">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Catalog</span>
              <h2>Product management</h2>
            </div>
            <input
              className="workspace-search"
              placeholder="Search products"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          {loading ? (
            <div className="surface-empty">Loading products…</div>
          ) : products.length ? (
            <div className="table-card">
              <table className="workspace-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Available</th>
                    <th>Expiry</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        <div className="table-subcopy">{product.barcode || product.unit}</div>
                      </td>
                      <td>{product.sku}</td>
                      <td>{product.categoryName || 'Uncategorized'}</td>
                      <td>{product.availableQuantity}</td>
                      <td>{product.nextExpiry ? formatDate(product.nextExpiry) : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="workspace-inline-link"
                          onClick={() => {
                            void inspectProduct(product);
                          }}
                        >
                          {selectedProductId === product.id ? 'Selected' : 'Edit'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="surface-empty">No products found.</div>
          )}
        </article>

        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Editor</span>
              <h2>{productForm.id ? 'Edit product' : 'New product'}</h2>
            </div>
          </div>

          <form className="workspace-form-grid" onSubmit={handleSaveProduct}>
            <label className="workspace-field">
              <span>Product Name</span>
              <input
                value={productForm.name}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="workspace-field">
              <span>SKU</span>
              <input
                value={productForm.sku}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    sku: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="workspace-field">
              <span>Category</span>
              <select
                value={productForm.categoryId}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="workspace-field">
              <span>Unit</span>
              <input
                value={productForm.unit}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    unit: event.target.value,
                  }))
                }
              />
            </label>
            <label className="workspace-field">
              <span>Barcode</span>
              <input
                value={productForm.barcode}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    barcode: event.target.value,
                  }))
                }
              />
            </label>
            <label className="workspace-field">
              <span>Sale Price</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={productForm.salePrice}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    salePrice: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="workspace-field workspace-field-span-two">
              <span>Description</span>
              <textarea
                rows={4}
                value={productForm.description}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <label className="workspace-checkbox workspace-field-span-two">
              <input
                type="checkbox"
                checked={productForm.isActive}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Active for sale
            </label>
            {productForm.id ? (
              <div className="button-row workspace-field-span-two">
                <button
                  type="submit"
                  className="workspace-primary-action"
                  disabled={saving}
                >
                  {saving ? 'Saving changes…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="workspace-secondary-action"
                  disabled={saving}
                  onClick={() => {
                    setSelectedProductId('');
                    setSelectedBatches([]);
                    setProductForm({
                      ...EMPTY_PRODUCT_FORM,
                      categoryId: categories[0]?.id || '',
                    });
                  }}
                >
                  New Product
                </button>
                <button
                  type="button"
                  className="workspace-danger-action"
                  disabled={saving}
                  onClick={() => void handleDeleteProduct()}
                >
                  Delete Product
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="workspace-primary-action workspace-field-span-two"
                disabled={saving}
              >
                {saving ? 'Creating product…' : 'Create Product'}
              </button>
            )}
          </form>

          <div className="surface-divider" />

          <form className="workspace-form-grid" onSubmit={handleSaveCategory}>
            <div className="surface-card-header compact">
              <div>
                <span className="surface-card-eyebrow">Support</span>
                <h2>{categoryForm.id ? 'Edit category' : 'Category registry'}</h2>
              </div>
            </div>
            <label className="workspace-field">
              <span>Category Name</span>
              <input
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="workspace-field">
              <span>Description</span>
              <input
                value={categoryForm.description}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <div className="button-row workspace-field-span-two">
              <button
                type="submit"
                className="workspace-secondary-action"
                disabled={saving}
              >
                {saving
                  ? categoryForm.id
                    ? 'Saving category…'
                    : 'Creating category…'
                  : categoryForm.id
                    ? 'Save Category'
                    : 'Add Category'}
              </button>
              {categoryForm.id ? (
                <button
                  type="button"
                  className="workspace-inline-link"
                  disabled={saving}
                  onClick={() => setCategoryForm(EMPTY_CATEGORY_FORM)}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          {categories.length ? (
            <div className="stacked-list">
              {categories.map((category) => (
                <div key={category.id} className="stacked-list-row">
                  <div>
                    <strong>{category.name}</strong>
                    <span>{category.description || 'No description set.'}</span>
                  </div>
                  <div className="stacked-list-actions">
                    <button
                      type="button"
                      className="workspace-inline-link"
                      disabled={saving}
                      onClick={() =>
                        setCategoryForm({
                          id: category.id,
                          name: category.name,
                          description: category.description || '',
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="workspace-inline-link workspace-inline-link-danger"
                      disabled={saving}
                      onClick={() => void handleDeleteCategory(category)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="surface-empty">No categories added yet.</div>
          )}
        </article>
      </section>

      <section className="workspace-grid">
        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Batch Snapshot</span>
              <h2>{highlightedProduct ? highlightedProduct.name : 'Select a product'}</h2>
            </div>
          </div>

          {selectedBatches.length ? (
            <div className="stacked-list">
              {selectedBatches.map((batch) => (
                <div key={batch.id} className="stacked-list-row">
                  <div>
                    <strong>Batch {batch.batchNumber}</strong>
                    <span>
                      Expires {formatDate(batch.expiryDate)} · {batch.supplierName || 'No supplier'}
                    </span>
                  </div>
                  <div className="stacked-list-meta">
                    <strong>{batch.quantityOnHand} on hand</strong>
                    <span>{formatCurrency(batch.unitCost)} unit cost</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="surface-empty">
              Select a product from the table to review its batches and sellable stock.
            </div>
          )}
        </article>

        <article className="surface-card">
          <div className="surface-card-header">
            <div>
              <span className="surface-card-eyebrow">Inventory Snapshot</span>
              <h2>Current overview</h2>
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-block">
              <span>Tracked Products</span>
              <strong>{products.length}</strong>
            </div>
            <div className="summary-block">
              <span>Active Categories</span>
              <strong>{categories.length}</strong>
            </div>
            <div className="summary-block">
              <span>Total Sellable Units</span>
              <strong>
                {products.reduce(
                  (sum, product) => sum + product.availableQuantity,
                  0,
                )}
              </strong>
            </div>
            <div className="summary-block">
              <span>Inventory Value</span>
              <strong>
                {formatCurrency(
                  products.reduce(
                    (sum, product) => sum + product.salePrice * product.totalOnHand,
                    0,
                  ),
                )}
              </strong>
            </div>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
