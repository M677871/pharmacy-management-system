import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { Category } from '../types/inventory.types';

interface CategoryFormState {
  name: string;
  description: string;
}

interface SupplierFormState {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
}

interface ProductFormState {
  sku: string;
  name: string;
  salePrice: string;
  categoryId: string;
  description: string;
  barcode: string;
  unit: string;
}

interface CatalogSetupSectionProps {
  categories: Category[];
  categoryForm: CategoryFormState;
  setCategoryForm: Dispatch<SetStateAction<CategoryFormState>>;
  supplierForm: SupplierFormState;
  setSupplierForm: Dispatch<SetStateAction<SupplierFormState>>;
  productForm: ProductFormState;
  setProductForm: Dispatch<SetStateAction<ProductFormState>>;
  isBusy: boolean;
  onCreateCategory: () => Promise<void>;
  onCreateSupplier: () => Promise<void>;
  onCreateProduct: () => Promise<void>;
}

export function CatalogSetupSection({
  categories,
  categoryForm,
  setCategoryForm,
  supplierForm,
  setSupplierForm,
  productForm,
  setProductForm,
  isBusy,
  onCreateCategory,
  onCreateSupplier,
  onCreateProduct,
}: CatalogSetupSectionProps) {
  async function submit(event: FormEvent<HTMLFormElement>, action: () => Promise<void>) {
    event.preventDefault();
    await action();
  }

  return (
    <section className="inventory-grid inventory-grid-three">
      <form
        className="inventory-panel"
        onSubmit={(event) => void submit(event, onCreateCategory)}
      >
        <h2>Create category</h2>
        <div className="form-group">
          <label htmlFor="category-name">Name</label>
          <input
            id="category-name"
            value={categoryForm.name}
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="category-description">Description</label>
          <input
            id="category-description"
            value={categoryForm.description}
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </div>
        <button className="btn-primary" type="submit" disabled={isBusy}>
          Save category
        </button>
      </form>

      <form
        className="inventory-panel"
        onSubmit={(event) => void submit(event, onCreateSupplier)}
      >
        <h2>Create supplier</h2>
        <div className="form-group">
          <label htmlFor="supplier-name">Name</label>
          <input
            id="supplier-name"
            value={supplierForm.name}
            onChange={(event) =>
              setSupplierForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="supplier-contact">Contact</label>
          <input
            id="supplier-contact"
            value={supplierForm.contactName}
            onChange={(event) =>
              setSupplierForm((current) => ({
                ...current,
                contactName: event.target.value,
              }))
            }
          />
        </div>
        <button className="btn-primary" type="submit" disabled={isBusy}>
          Save supplier
        </button>
      </form>

      <form
        className="inventory-panel"
        onSubmit={(event) => void submit(event, onCreateProduct)}
      >
        <h2>Create product</h2>
        <div className="form-group">
          <label htmlFor="product-name">Name</label>
          <input
            id="product-name"
            value={productForm.name}
            onChange={(event) =>
              setProductForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="product-sku">SKU</label>
          <input
            id="product-sku"
            value={productForm.sku}
            onChange={(event) =>
              setProductForm((current) => ({
                ...current,
                sku: event.target.value,
              }))
            }
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="product-price">Sale price</label>
          <input
            id="product-price"
            type="number"
            min="0"
            step="0.01"
            value={productForm.salePrice}
            onChange={(event) =>
              setProductForm((current) => ({
                ...current,
                salePrice: event.target.value,
              }))
            }
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="product-category">Category</label>
          <select
            id="product-category"
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
        </div>
        <button className="btn-primary" type="submit" disabled={isBusy}>
          Save product
        </button>
      </form>
    </section>
  );
}
