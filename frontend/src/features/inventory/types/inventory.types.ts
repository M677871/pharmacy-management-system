export interface Category {
  id: string;
  name: string;
  description: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface ProductSummary {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  unit: string;
  description: string | null;
  salePrice: number;
  isActive: boolean;
  categoryId: string | null;
  categoryName: string | null;
  availableQuantity: number;
  totalOnHand: number;
  nextExpiry: string | null;
}

export interface ProductBatch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  receivedQuantity: number;
  quantityOnHand: number;
  unitCost: number;
  receivedAt: string;
  supplierName: string | null;
  isExpired: boolean;
}

export interface PurchaseReceipt {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string | null;
  notes: string | null;
  receivedAt: string;
  totalCost: number;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    lineTotal: number;
    batchId: string;
    batchNumber: string;
    expiryDate: string;
    quantityOnHand: number;
  }>;
}

export interface PurchaseSummary {
  id: string;
  supplierId: string;
  supplierName: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  receivedAt: string;
  totalCost: number;
  itemCount: number;
}

export interface SaleAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
}

export interface SaleDetailItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  returnedQuantity: number;
  remainingReturnable: number;
  unitPrice: number;
  lineTotal: number;
  allocations: SaleAllocation[];
}

export interface SaleDetail {
  id: string;
  soldAt: string;
  notes: string | null;
  totalAmount: number;
  items: SaleDetailItem[];
}

export interface SaleSummary {
  id: string;
  soldAt: string;
  notes: string | null;
  totalAmount: number;
  itemCount: number;
}

export interface ReturnReceipt {
  id: string;
  saleId: string;
  returnedAt: string;
  reason: string | null;
  totalRefund: number;
  items: Array<{
    id: string;
    saleItemId: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    allocations: SaleAllocation[];
  }>;
}

export interface ReturnSummary {
  id: string;
  saleId: string;
  returnedAt: string;
  reason: string | null;
  totalRefund: number;
  itemCount: number;
}

export interface StockMovementSummary {
  id: string;
  movementType: string;
  referenceType: string;
  productId: string;
  productName: string | null;
  batchId: string | null;
  batchNumber: string | null;
  quantity: number;
  unitCost: number | null;
  unitPrice: number | null;
  purchaseId: string | null;
  saleId: string | null;
  returnId: string | null;
  occurredAt: string;
  note: string | null;
}
