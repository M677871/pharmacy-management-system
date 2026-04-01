import api from '../../../shared/api/axios';
import type {
  Category,
  ProductBatch,
  ProductSummary,
  PurchaseSummary,
  PurchaseReceipt,
  ReturnReceipt,
  ReturnSummary,
  SaleDetail,
  SaleSummary,
  StockMovementSummary,
  Supplier,
} from '../types/inventory.types';

export const inventoryService = {
  async listCategories() {
    const { data } = await api.get<Category[]>('/inventory/categories');
    return data;
  },

  async createCategory(payload: { name: string; description?: string }) {
    const { data } = await api.post<Category>('/inventory/categories', payload);
    return data;
  },

  async listSuppliers() {
    const { data } = await api.get<Supplier[]>('/inventory/suppliers');
    return data;
  },

  async createSupplier(payload: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) {
    const { data } = await api.post<Supplier>('/inventory/suppliers', payload);
    return data;
  },

  async listProducts(search?: string) {
    const { data } = await api.get<ProductSummary[]>('/inventory/products', {
      params: search ? { search } : undefined,
    });
    return data;
  },

  async listProductBatches(productId: string) {
    const { data } = await api.get<ProductBatch[]>(
      `/inventory/products/${productId}/batches`,
    );
    return data;
  },

  async createProduct(payload: {
    sku: string;
    name: string;
    salePrice: number;
    categoryId?: string;
    barcode?: string;
    description?: string;
    unit?: string;
  }) {
    const { data } = await api.post<ProductSummary>('/inventory/products', payload);
    return data;
  },

  async updateProduct(
    productId: string,
    payload: Partial<{
      sku: string;
      name: string;
      salePrice: number;
      categoryId: string | null;
      barcode: string | null;
      description: string | null;
      unit: string;
      isActive: boolean;
    }>,
  ) {
    const { data } = await api.patch<ProductSummary>(
      `/inventory/products/${productId}`,
      payload,
    );
    return data;
  },

  async listPurchases() {
    const { data } = await api.get<PurchaseSummary[]>('/inventory/purchases');
    return data;
  },

  async receiveStock(payload: {
    supplierId: string;
    invoiceNumber?: string;
    notes?: string;
    receivedAt?: string;
    items: Array<{
      productId: string;
      batchNumber: string;
      expiryDate: string;
      quantity: number;
      unitCost: number;
      notes?: string;
    }>;
  }) {
    const { data } = await api.post<PurchaseReceipt>(
      '/inventory/purchases/receive',
      payload,
    );
    return data;
  },

  async listSales() {
    const { data } = await api.get<SaleSummary[]>('/inventory/sales');
    return data;
  },

  async checkout(payload: {
    notes?: string;
    soldAt?: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice?: number;
    }>;
  }) {
    const { data } = await api.post<SaleDetail>('/inventory/sales/checkout', payload);
    return data;
  },

  async getSale(saleId: string) {
    const { data } = await api.get<SaleDetail>(`/inventory/sales/${saleId}`);
    return data;
  },

  async listReturns() {
    const { data } = await api.get<ReturnSummary[]>('/inventory/returns');
    return data;
  },

  async createReturn(payload: {
    saleId: string;
    reason?: string;
    returnedAt?: string;
    items: Array<{
      saleItemId: string;
      quantity: number;
    }>;
  }) {
    const { data } = await api.post<ReturnReceipt>('/inventory/returns', payload);
    return data;
  },

  async listStockMovements() {
    const { data } = await api.get<StockMovementSummary[]>(
      '/inventory/stock-movements',
    );
    return data;
  },
};
