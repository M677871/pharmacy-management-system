import { gql, graphqlMutation, graphqlQuery } from '../../../shared/api/graphql';
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

const CATEGORIES = gql`query Categories { categories }`;
const CREATE_CATEGORY = gql`
  mutation CreateCategory($input: JSONObject!) {
    createCategory(input: $input)
  }
`;
const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($categoryId: ID!, $input: JSONObject!) {
    updateCategory(categoryId: $categoryId, input: $input)
  }
`;
const DELETE_CATEGORY = gql`
  mutation DeleteCategory($categoryId: ID!) {
    deleteCategory(categoryId: $categoryId)
  }
`;

const SUPPLIERS = gql`query Suppliers { suppliers }`;
const CREATE_SUPPLIER = gql`
  mutation CreateSupplier($input: JSONObject!) {
    createSupplier(input: $input)
  }
`;
const UPDATE_SUPPLIER = gql`
  mutation UpdateSupplier($supplierId: ID!, $input: JSONObject!) {
    updateSupplier(supplierId: $supplierId, input: $input)
  }
`;
const DELETE_SUPPLIER = gql`
  mutation DeleteSupplier($supplierId: ID!) {
    deleteSupplier(supplierId: $supplierId)
  }
`;

const PRODUCTS = gql`
  query Products($input: JSONObject) {
    products(input: $input)
  }
`;
const PRODUCT_BATCHES = gql`
  query ProductBatches($productId: ID!) {
    productBatches(productId: $productId)
  }
`;
const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: JSONObject!) {
    createProduct(input: $input)
  }
`;
const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($productId: ID!, $input: JSONObject!) {
    updateProduct(productId: $productId, input: $input)
  }
`;
const DELETE_PRODUCT = gql`
  mutation DeleteProduct($productId: ID!) {
    deleteProduct(productId: $productId)
  }
`;

const PURCHASES = gql`query Purchases { purchases }`;
const RECEIVE_PURCHASE_STOCK = gql`
  mutation ReceivePurchaseStock($input: JSONObject!) {
    receivePurchaseStock(input: $input)
  }
`;

const SALES = gql`query Sales { sales }`;
const CHECKOUT_SALE = gql`
  mutation CheckoutSale($input: JSONObject!) {
    checkoutSale(input: $input)
  }
`;
const SALE = gql`
  query Sale($saleId: ID!) {
    sale(saleId: $saleId)
  }
`;

const RETURNS = gql`query Returns { returns }`;
const CREATE_RETURN = gql`
  mutation CreateReturn($input: JSONObject!) {
    createReturn(input: $input)
  }
`;

const STOCK_MOVEMENTS = gql`
  query StockMovements {
    stockMovements
  }
`;

export const inventoryService = {
  async listCategories() {
    const result = await graphqlQuery<{ categories: Category[] }>(CATEGORIES);
    return result.categories;
  },

  async createCategory(payload: { name: string; description?: string }) {
    const result = await graphqlMutation<
      { createCategory: Category },
      { input: typeof payload }
    >(CREATE_CATEGORY, { input: payload });
    return result.createCategory;
  },

  async updateCategory(
    categoryId: string,
    payload: Partial<{
      name: string;
      description: string | null;
    }>,
  ) {
    const result = await graphqlMutation<
      { updateCategory: Category },
      { categoryId: string; input: typeof payload }
    >(UPDATE_CATEGORY, { categoryId, input: payload });
    return result.updateCategory;
  },

  async deleteCategory(categoryId: string) {
    const result = await graphqlMutation<
      { deleteCategory: { id: string } },
      { categoryId: string }
    >(DELETE_CATEGORY, { categoryId });
    return result.deleteCategory;
  },

  async listSuppliers() {
    const result = await graphqlQuery<{ suppliers: Supplier[] }>(SUPPLIERS);
    return result.suppliers;
  },

  async createSupplier(payload: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) {
    const result = await graphqlMutation<
      { createSupplier: Supplier },
      { input: typeof payload }
    >(CREATE_SUPPLIER, { input: payload });
    return result.createSupplier;
  },

  async updateSupplier(
    supplierId: string,
    payload: Partial<{
      name: string;
      contactName: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
    }>,
  ) {
    const result = await graphqlMutation<
      { updateSupplier: Supplier },
      { supplierId: string; input: typeof payload }
    >(UPDATE_SUPPLIER, { supplierId, input: payload });
    return result.updateSupplier;
  },

  async deleteSupplier(supplierId: string) {
    const result = await graphqlMutation<
      { deleteSupplier: { id: string } },
      { supplierId: string }
    >(DELETE_SUPPLIER, { supplierId });
    return result.deleteSupplier;
  },

  async listProducts(search?: string) {
    const result = await graphqlQuery<
      { products: ProductSummary[] },
      { input?: { search?: string } }
    >(
      PRODUCTS,
      search
        ? {
            input: { search },
          }
        : undefined,
    );
    return result.products;
  },

  async listProductBatches(productId: string) {
    const result = await graphqlQuery<
      { productBatches: ProductBatch[] },
      { productId: string }
    >(PRODUCT_BATCHES, { productId });
    return result.productBatches;
  },

  async createProduct(payload: {
    sku: string;
    name: string;
    salePrice: number;
    categoryId?: string;
    barcode?: string;
    description?: string;
    unit?: string;
    doesNotExpire?: boolean;
  }) {
    const result = await graphqlMutation<
      { createProduct: ProductSummary },
      { input: typeof payload }
    >(CREATE_PRODUCT, { input: payload });
    return result.createProduct;
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
      doesNotExpire: boolean;
    }>,
  ) {
    const result = await graphqlMutation<
      { updateProduct: ProductSummary },
      { productId: string; input: typeof payload }
    >(UPDATE_PRODUCT, { productId, input: payload });
    return result.updateProduct;
  },

  async deleteProduct(productId: string) {
    const result = await graphqlMutation<
      { deleteProduct: { id: string } },
      { productId: string }
    >(DELETE_PRODUCT, { productId });
    return result.deleteProduct;
  },

  async listPurchases() {
    const result = await graphqlQuery<{ purchases: PurchaseSummary[] }>(
      PURCHASES,
    );
    return result.purchases;
  },

  async receiveStock(payload: {
    supplierId: string;
    invoiceNumber?: string;
    notes?: string;
    receivedAt?: string;
    items: Array<{
      productId: string;
      batchNumber: string;
      expiryDate?: string | null;
      quantity: number;
      unitCost: number;
      notes?: string;
    }>;
  }) {
    const result = await graphqlMutation<
      { receivePurchaseStock: PurchaseReceipt },
      { input: typeof payload }
    >(RECEIVE_PURCHASE_STOCK, { input: payload });
    return result.receivePurchaseStock;
  },

  async listSales() {
    const result = await graphqlQuery<{ sales: SaleSummary[] }>(SALES);
    return result.sales;
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
    const result = await graphqlMutation<
      { checkoutSale: SaleDetail },
      { input: typeof payload }
    >(CHECKOUT_SALE, { input: payload });
    return result.checkoutSale;
  },

  async getSale(saleId: string) {
    const result = await graphqlQuery<
      { sale: SaleDetail },
      { saleId: string }
    >(SALE, { saleId });
    return result.sale;
  },

  async listReturns() {
    const result = await graphqlQuery<{ returns: ReturnSummary[] }>(RETURNS);
    return result.returns;
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
    const result = await graphqlMutation<
      { createReturn: ReturnReceipt },
      { input: typeof payload }
    >(CREATE_RETURN, { input: payload });
    return result.createReturn;
  },

  async listStockMovements() {
    const result = await graphqlQuery<{
      stockMovements: StockMovementSummary[];
    }>(STOCK_MOVEMENTS);
    return result.stockMovements;
  },
};
