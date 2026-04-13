export type UiTone = 'blue' | 'teal' | 'green' | 'orange' | 'red' | 'indigo';

export interface DashboardMetric {
  id: string;
  label: string;
  value: number | string;
  helper: string;
  tone: UiTone;
}

export interface TrendPoint {
  label: string;
  sales: number;
  returns: number;
  purchases: number;
}

export interface ExpiringSoonItem {
  id: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  onHand: number;
  daysRemaining: number;
}

export interface LowStockItem {
  id: string;
  productName: string;
  sku: string;
  availableQuantity: number;
  unit: string;
  categoryName: string | null;
}

export interface TopProduct {
  id: string;
  productName: string;
  sku: string;
  categoryName: string | null;
  quantitySold: number;
  revenue: number;
  estimatedProfit: number;
  profitMarginPercent: number;
  availableQuantity: number;
}

export interface RecentTransaction {
  id: string;
  kind: 'sale' | 'purchase' | 'return';
  date: string;
  amount: number;
  itemCount: number;
  title: string;
  subtitle: string;
}

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  categoryName: string | null;
  salePrice: number;
  availableQuantity: number;
  totalOnHand: number;
  nextExpiry: string | null;
  unit: string;
  barcode: string | null;
}

export interface DashboardOverview {
  role: 'admin' | 'employee' | 'customer';
  rangeDays: number;
  metrics: DashboardMetric[];
  salesTrend: TrendPoint[];
  expiringSoon?: ExpiringSoonItem[];
  lowStock?: LowStockItem[];
  topProducts?: TopProduct[];
  recentTransactions: RecentTransaction[];
  movementSummary: {
    purchasesIn: number;
    salesOut: number;
    returns: number;
  };
  catalogHighlights?: CatalogProduct[];
  featuredProducts?: CatalogProduct[];
}

export interface DashboardReports {
  rangeDays: number;
  totals: {
    totalSales: number;
    totalReturns: number;
    estimatedProfit: number;
    totalOrders: number;
    averageOrderValue: number;
    grossMarginPercent: number;
    netSales: number;
    refundRatePercent: number;
  };
  salesTrend: TrendPoint[];
  performanceTrend: Array<{
    label: string;
    revenue: number;
    profit: number;
    refunds: number;
    orders: number;
  }>;
  periodComparisons: Array<{
    id: string;
    label: string;
    helper: string;
    currentValue: number;
    previousValue: number;
    changePercent: number;
    tone: UiTone;
    format: 'currency' | 'number' | 'percent';
  }>;
  weeklyAnalytics: Array<{
    label: string;
    revenue: number;
    profit: number;
    orders: number;
  }>;
  monthlyAnalytics: Array<{
    label: string;
    revenue: number;
    profit: number;
    orders: number;
  }>;
  employeeRanking: Array<{
    id: string;
    rank: number;
    name: string;
    email: string;
    revenue: number;
    estimatedProfit: number;
    completedSales: number;
    activeDays: number;
    averageOrderValue: number;
    consistencyScore: number;
    performanceScore: number;
    profitMarginPercent: number;
  }>;
  bestEmployee: {
    id: string;
    rank: number;
    name: string;
    email: string;
    revenue: number;
    estimatedProfit: number;
    completedSales: number;
    activeDays: number;
    averageOrderValue: number;
    consistencyScore: number;
    performanceScore: number;
    profitMarginPercent: number;
  } | null;
  topProducts: TopProduct[];
  categoryPerformance: Array<{
    categoryName: string;
    revenue: number;
    estimatedProfit: number;
    quantitySold: number;
    sharePercent: number;
  }>;
  catalogSnapshot: {
    totalProducts: number;
    inStockProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    recentProducts: Array<{
      id: string;
      sku: string;
      name: string;
      categoryName: string | null;
      salePrice: number;
      availableQuantity: number;
      createdAt: string;
    }>;
  };
  recentTransactions: RecentTransaction[];
  movementSummary: {
    purchasesIn: number;
    salesOut: number;
    returns: number;
  };
}

export interface CatalogResponse {
  total: number;
  items: CatalogProduct[];
}
