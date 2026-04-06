import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { roundCurrency, toDateOnly } from '../inventory/inventory.utils';
import { ProductsService } from '../inventory/products/products.service';
import { Batch } from '../inventory/batches/entities/batch.entity';
import { Sale } from '../inventory/sales/entities/sale.entity';
import { Purchase } from '../inventory/purchases/entities/purchase.entity';
import { SaleReturn } from '../inventory/sale-returns/entities/sale-return.entity';
import { SaleItem } from '../inventory/sale-items/entities/sale-item.entity';
import { SaleItemAllocation } from '../inventory/sale-item-allocations/entities/sale-item-allocation.entity';
import { StockMovement } from '../inventory/stock-movements/entities/stock-movement.entity';
import {
  StockMovementReferenceType,
  StockMovementType,
} from '../inventory/inventory.enums';
import { Product } from '../inventory/products/entities/product.entity';
import { User, UserRole } from '../users/entities/user.entity';

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

@Injectable()
export class DashboardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly productsService: ProductsService,
    private readonly configService: ConfigService,
  ) {}

  async getOverview(user: User, rangeDays?: number) {
    const days = this.normalizeRangeDays(rangeDays);
    const catalog = await this.getCatalogProducts();
    const [salesTrend, recentTransactions, movementSummary] = await Promise.all([
      this.buildSalesTrend(days),
      this.buildRecentTransactions(6),
      this.buildMovementSummary(days),
    ]);

    if (user.role === UserRole.CUSTOMER) {
      return this.buildCustomerOverview(user, catalog, salesTrend);
    }

    const [
      totalSales,
      todaySales,
      stockValue,
      expiringSoon,
      lowStock,
      topProducts,
      userCounts,
    ] = await Promise.all([
      this.sumSales(),
      this.sumSales(1),
      this.calculateStockValue(),
      this.getExpiringSoonBatches(),
      this.getLowStockProducts(catalog),
      this.buildTopProducts(days),
      this.getUserCounts(),
    ]);

    const metrics =
      user.role === UserRole.ADMIN
        ? [
            {
              id: 'total-sales',
              label: 'Total Sales',
              value: totalSales,
              helper: 'All time revenue',
              tone: 'blue',
            },
            {
              id: 'stock-value',
              label: 'Stock Value',
              value: stockValue,
              helper: 'Current on-hand cost',
              tone: 'teal',
            },
            {
              id: 'expiring-soon',
              label: 'Expiring Soon',
              value: expiringSoon.totalCount,
              helper: 'Batches in the next 30 days',
              tone: 'orange',
            },
            {
              id: 'customers',
              label: 'Total Clients',
              value: userCounts.customerCount,
              helper: `${userCounts.employeeCount} employees on staff`,
              tone: 'indigo',
            },
          ]
        : [
            {
              id: 'today-sales',
              label: "Today's Sales",
              value: todaySales,
              helper: 'Today revenue',
              tone: 'blue',
            },
            {
              id: 'stock-value',
              label: 'Stock Value',
              value: stockValue,
              helper: 'Current on-hand cost',
              tone: 'teal',
            },
            {
              id: 'expiring-soon',
              label: 'Expiring Soon',
              value: expiringSoon.totalCount,
              helper: 'Needs quick action',
              tone: 'orange',
            },
            {
              id: 'low-stock',
              label: 'Low Stock',
              value: lowStock.totalCount,
              helper: `Threshold ${this.getLowStockThreshold()} units`,
              tone: 'red',
            },
          ];

    return {
      role: user.role,
      rangeDays: days,
      metrics,
      salesTrend,
      expiringSoon: expiringSoon.items,
      lowStock: lowStock.items,
      topProducts,
      recentTransactions,
      movementSummary,
      catalogHighlights: catalog.slice(0, 6),
    };
  }

  async getReports(days?: number) {
    const rangeDays = this.normalizeRangeDays(days);
    const [
      totals,
      salesTrend,
      performanceTrend,
      topProducts,
      recentTransactions,
      movementSummary,
      periodComparisons,
      weeklyAnalytics,
      monthlyAnalytics,
      employeeRanking,
      categoryPerformance,
      catalogSnapshot,
    ] = await Promise.all([
      this.getReportTotals(rangeDays),
      this.buildSalesTrend(rangeDays),
      this.buildPerformanceTrend(rangeDays),
      this.buildTopProducts(rangeDays),
      this.buildRecentTransactions(8),
      this.buildMovementSummary(rangeDays),
      this.buildPeriodComparisons(rangeDays),
      this.buildWeeklyAnalytics(8),
      this.buildMonthlyAnalytics(6),
      this.buildEmployeePerformance(rangeDays),
      this.buildCategoryPerformance(rangeDays),
      this.buildCatalogSnapshot(),
    ]);

    return {
      rangeDays,
      totals,
      salesTrend,
      performanceTrend,
      topProducts,
      recentTransactions,
      movementSummary,
      periodComparisons,
      weeklyAnalytics,
      monthlyAnalytics,
      employeeRanking,
      bestEmployee: employeeRanking[0] ?? null,
      categoryPerformance,
      catalogSnapshot,
    };
  }

  async getCatalog(search?: string, limit?: number) {
    const products = await this.getCatalogProducts(search);

    return {
      total: products.length,
      items: products.slice(0, limit ?? 12),
    };
  }

  private async buildCustomerOverview(
    user: User,
    catalog: CatalogProduct[],
    salesTrend: Array<Record<string, unknown>>,
  ) {
    const inStockProducts = catalog.filter((product) => product.availableQuantity > 0);
    const expiringSoonProducts = catalog.filter((product) => {
      if (!product.nextExpiry) {
        return false;
      }

      return this.daysUntil(product.nextExpiry) <= 30;
    });
    const categories = new Set(
      catalog.map((product) => product.categoryName).filter(Boolean),
    );

    return {
      role: user.role,
      rangeDays: 30,
      metrics: [
        {
          id: 'available-products',
          label: 'Available Products',
          value: inStockProducts.length,
          helper: `${catalog.length} listed items`,
          tone: 'blue',
        },
        {
          id: 'fresh-batches',
          label: 'Fresh Inventory',
          value: expiringSoonProducts.length,
          helper: 'Expiring in the next 30 days',
          tone: 'green',
        },
        {
          id: 'catalog-categories',
          label: 'Product Categories',
          value: categories.size,
          helper: 'Across the active catalog',
          tone: 'indigo',
        },
        {
          id: 'security',
          label: 'Account Security',
          value: user.isTotpEnabled ? '2FA Enabled' : '2FA Recommended',
          helper: user.email,
          tone: user.isTotpEnabled ? 'teal' : 'orange',
        },
      ],
      salesTrend,
      featuredProducts: inStockProducts.slice(0, 6),
      expiringSoon: expiringSoonProducts.slice(0, 5),
      recentTransactions: [],
      movementSummary: {
        purchasesIn: 0,
        salesOut: 0,
        returns: 0,
      },
    };
  }

  private async getCatalogProducts(search?: string): Promise<CatalogProduct[]> {
    const products = (await this.productsService.findAll({
      search: search?.trim(),
      includeInactive: false,
    })) as CatalogProduct[];

    return products;
  }

  private async sumSales(days?: number) {
    const repository = this.dataSource.getRepository(Sale);
    const builder = repository
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.totalAmount), 0)', 'total');

    if (days) {
      builder.where('sale.soldAt >= :fromDate', {
        fromDate: this.getRangeStart(days),
      });
    }

    const result = await builder.getRawOne<{ total: string }>();
    return roundCurrency(Number(result?.total ?? 0));
  }

  private async calculateStockValue() {
    const repository = this.dataSource.getRepository(Batch);
    const result = await repository
      .createQueryBuilder('batch')
      .select('COALESCE(SUM(batch.quantityOnHand * batch.unitCost), 0)', 'total')
      .where('batch.quantityOnHand > 0')
      .getRawOne<{ total: string }>();

    return roundCurrency(Number(result?.total ?? 0));
  }

  private async getExpiringSoonBatches() {
    const today = toDateOnly(new Date());
    const horizon = toDateOnly(
      new Date(Date.now() + this.getExpiringSoonDays() * 24 * 60 * 60 * 1000),
    );
    const repository = this.dataSource.getRepository(Batch);

    const batches = await repository
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.product', 'product')
      .where('batch.quantityOnHand > 0')
      .andWhere('batch.expiryDate >= :today', { today })
      .andWhere('batch.expiryDate <= :horizon', { horizon })
      .orderBy('batch.expiryDate', 'ASC')
      .addOrderBy('batch.quantityOnHand', 'ASC')
      .limit(5)
      .getMany();

    const totalCount = await repository
      .createQueryBuilder('batch')
      .where('batch.quantityOnHand > 0')
      .andWhere('batch.expiryDate >= :today', { today })
      .andWhere('batch.expiryDate <= :horizon', { horizon })
      .getCount();

    return {
      totalCount,
      items: batches.map((batch) => ({
        id: batch.id,
        productName: batch.product?.name ?? 'Unknown Product',
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        onHand: batch.quantityOnHand,
        daysRemaining: this.daysUntil(batch.expiryDate),
      })),
    };
  }

  private async getLowStockProducts(catalog: CatalogProduct[]) {
    const threshold = this.getLowStockThreshold();
    const items = catalog
      .filter((product) => product.availableQuantity <= threshold)
      .sort((left, right) => left.availableQuantity - right.availableQuantity)
      .slice(0, 5)
      .map((product) => ({
        id: product.id,
        productName: product.name,
        sku: product.sku,
        availableQuantity: product.availableQuantity,
        unit: product.unit,
        categoryName: product.categoryName,
      }));

    return {
      totalCount: catalog.filter((product) => product.availableQuantity <= threshold)
        .length,
      items,
    };
  }

  private async buildSalesTrend(days: number) {
    const labels = this.getDateBuckets(days);
    const salesRows = await this.dataSource
      .getRepository(Sale)
      .createQueryBuilder('sale')
      .select(`TO_CHAR(DATE_TRUNC('day', sale.soldAt), 'YYYY-MM-DD')`, 'label')
      .addSelect('COALESCE(SUM(sale.totalAmount), 0)', 'total')
      .where('sale.soldAt >= :fromDate', { fromDate: this.getRangeStart(days) })
      .groupBy(`DATE_TRUNC('day', sale.soldAt)`)
      .orderBy(`DATE_TRUNC('day', sale.soldAt)`, 'ASC')
      .getRawMany<{ label: string; total: string }>();

    const returnRows = await this.dataSource
      .getRepository(SaleReturn)
      .createQueryBuilder('saleReturn')
      .select(`TO_CHAR(DATE_TRUNC('day', saleReturn.returnedAt), 'YYYY-MM-DD')`, 'label')
      .addSelect('COALESCE(SUM(saleReturn.totalRefund), 0)', 'total')
      .where('saleReturn.returnedAt >= :fromDate', {
        fromDate: this.getRangeStart(days),
      })
      .groupBy(`DATE_TRUNC('day', saleReturn.returnedAt)`)
      .orderBy(`DATE_TRUNC('day', saleReturn.returnedAt)`, 'ASC')
      .getRawMany<{ label: string; total: string }>();

    const purchaseRows = await this.dataSource
      .getRepository(Purchase)
      .createQueryBuilder('purchase')
      .select(`TO_CHAR(DATE_TRUNC('day', purchase.receivedAt), 'YYYY-MM-DD')`, 'label')
      .addSelect('COALESCE(SUM(purchase.totalCost), 0)', 'total')
      .where('purchase.receivedAt >= :fromDate', {
        fromDate: this.getRangeStart(days),
      })
      .groupBy(`DATE_TRUNC('day', purchase.receivedAt)`)
      .orderBy(`DATE_TRUNC('day', purchase.receivedAt)`, 'ASC')
      .getRawMany<{ label: string; total: string }>();

    const salesMap = new Map(salesRows.map((row) => [row.label, Number(row.total)]));
    const returnsMap = new Map(
      returnRows.map((row) => [row.label, Number(row.total)]),
    );
    const purchasesMap = new Map(
      purchaseRows.map((row) => [row.label, Number(row.total)]),
    );

    return labels.map((label) => ({
      label,
      sales: roundCurrency(salesMap.get(label) ?? 0),
      returns: roundCurrency(returnsMap.get(label) ?? 0),
      purchases: roundCurrency(purchasesMap.get(label) ?? 0),
    }));
  }

  private async buildTopProducts(days: number) {
    const fromDate = this.getRangeStart(days);
    const [rows, profitRows] = await Promise.all([
      this.dataSource
        .getRepository(SaleItem)
        .createQueryBuilder('saleItem')
        .leftJoin('saleItem.sale', 'sale')
        .leftJoin('saleItem.product', 'product')
        .leftJoin('product.category', 'category')
        .select('product.id', 'productId')
        .addSelect('product.name', 'productName')
        .addSelect('product.sku', 'sku')
        .addSelect('category.name', 'categoryName')
        .addSelect('COALESCE(SUM(saleItem.quantity), 0)', 'quantity_sold')
        .addSelect('COALESCE(SUM(saleItem.lineTotal), 0)', 'revenue_total')
        .where('sale.soldAt >= :fromDate', { fromDate })
        .groupBy('product.id')
        .addGroupBy('product.name')
        .addGroupBy('product.sku')
        .addGroupBy('category.name')
        .orderBy('quantity_sold', 'DESC')
        .addOrderBy('revenue_total', 'DESC')
        .limit(5)
        .getRawMany<{
          productId: string;
          productName: string;
          sku: string;
          categoryName: string | null;
          quantity_sold: string;
          revenue_total: string;
        }>(),
      this.dataSource
        .getRepository(SaleItemAllocation)
        .createQueryBuilder('allocation')
        .leftJoin('allocation.saleItem', 'saleItem')
        .leftJoin('saleItem.sale', 'sale')
        .leftJoin('saleItem.product', 'product')
        .select('product.id', 'productId')
        .addSelect(
          'COALESCE(SUM(allocation.quantity * (saleItem.unitPrice - allocation.unitCost)), 0)',
          'profit_total',
        )
        .where('sale.soldAt >= :fromDate', { fromDate })
        .groupBy('product.id')
        .getRawMany<{
          productId: string;
          profit_total: string;
        }>(),
    ]);

    const catalog = await this.getCatalogProducts();
    const quantityByProduct = new Map(
      catalog.map((product) => [product.id, product.availableQuantity]),
    );
    const profitByProduct = new Map(
      profitRows.map((row) => [row.productId, Number(row.profit_total)]),
    );

    return rows.map((row) => {
      const revenue = roundCurrency(Number(row.revenue_total));
      const estimatedProfit = roundCurrency(profitByProduct.get(row.productId) ?? 0);

      return {
        id: row.productId,
        productName: row.productName,
        sku: row.sku,
        categoryName: row.categoryName ?? null,
        quantitySold: Number(row.quantity_sold),
        revenue,
        estimatedProfit,
        profitMarginPercent: this.roundPercentage(
          revenue > 0 ? (estimatedProfit / revenue) * 100 : 0,
        ),
        availableQuantity: quantityByProduct.get(row.productId) ?? 0,
      };
    });
  }

  private async buildCategoryPerformance(days: number) {
    const bounds = this.getCurrentRangeBounds(days);
    const [salesRows, profitRows] = await Promise.all([
      this.dataSource
        .getRepository(SaleItem)
        .createQueryBuilder('saleItem')
        .leftJoin('saleItem.sale', 'sale')
        .leftJoin('saleItem.product', 'product')
        .leftJoin('product.category', 'category')
        .select(`COALESCE(category.name, 'Uncategorized')`, 'category_name')
        .addSelect('COALESCE(SUM(saleItem.lineTotal), 0)', 'revenue_total')
        .addSelect('COALESCE(SUM(saleItem.quantity), 0)', 'quantity_sold')
        .where('sale.soldAt >= :startDate', { startDate: bounds.start })
        .andWhere('sale.soldAt < :endDate', { endDate: bounds.end })
        .groupBy('category.id')
        .addGroupBy('category.name')
        .orderBy('revenue_total', 'DESC')
        .getRawMany<{
          category_name: string;
          revenue_total: string;
          quantity_sold: string;
        }>(),
      this.dataSource
        .getRepository(SaleItemAllocation)
        .createQueryBuilder('allocation')
        .leftJoin('allocation.saleItem', 'saleItem')
        .leftJoin('saleItem.sale', 'sale')
        .leftJoin('saleItem.product', 'product')
        .leftJoin('product.category', 'category')
        .select(`COALESCE(category.name, 'Uncategorized')`, 'category_name')
        .addSelect(
          'COALESCE(SUM(allocation.quantity * (saleItem.unitPrice - allocation.unitCost)), 0)',
          'profit_total',
        )
        .where('sale.soldAt >= :startDate', { startDate: bounds.start })
        .andWhere('sale.soldAt < :endDate', { endDate: bounds.end })
        .groupBy('category.id')
        .addGroupBy('category.name')
        .getRawMany<{
          category_name: string;
          profit_total: string;
        }>(),
    ]);

    const totalRevenue = salesRows.reduce(
      (sum, row) => sum + Number(row.revenue_total),
      0,
    );
    const profitByCategory = new Map(
      profitRows.map((row) => [row.category_name, Number(row.profit_total)]),
    );

    return salesRows.map((row) => {
      const revenue = roundCurrency(Number(row.revenue_total));
      const estimatedProfit = roundCurrency(
        profitByCategory.get(row.category_name) ?? 0,
      );

      return {
        categoryName: row.category_name,
        revenue,
        estimatedProfit,
        quantitySold: Number(row.quantity_sold),
        sharePercent: this.roundPercentage(
          totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
        ),
      };
    });
  }

  private async buildCatalogSnapshot() {
    const [catalog, recentProducts] = await Promise.all([
      this.getCatalogProducts(),
      this.dataSource.getRepository(Product).find({
        where: {
          isActive: true,
        },
        relations: {
          category: true,
          batches: true,
        },
        order: {
          createdAt: 'DESC',
        },
        take: 4,
      }),
    ]);

    const threshold = this.getLowStockThreshold();
    const today = toDateOnly(new Date());

    return {
      totalProducts: catalog.length,
      inStockProducts: catalog.filter((product) => product.availableQuantity > 0).length,
      lowStockProducts: catalog.filter(
        (product) =>
          product.availableQuantity > 0 && product.availableQuantity <= threshold,
      ).length,
      outOfStockProducts: catalog.filter((product) => product.availableQuantity === 0)
        .length,
      recentProducts: recentProducts.map((product) => {
        const activeBatches = product.batches.filter((batch) => batch.quantityOnHand > 0);
        const sellableBatches = activeBatches.filter(
          (batch) => batch.expiryDate >= today,
        );

        return {
          id: product.id,
          sku: product.sku,
          name: product.name,
          categoryName: product.category?.name ?? null,
          salePrice: product.salePrice,
          availableQuantity: sellableBatches.reduce(
            (sum, batch) => sum + batch.quantityOnHand,
            0,
          ),
          createdAt: product.createdAt.toISOString(),
        };
      }),
    };
  }

  private async buildRecentTransactions(limit: number) {
    const [sales, purchases, returns] = await Promise.all([
      this.dataSource
        .getRepository(Sale)
        .createQueryBuilder('sale')
        .leftJoin('sale.items', 'saleItem')
        .select('sale.id', 'id')
        .addSelect(`'sale'`, 'kind')
        .addSelect('sale.soldAt', 'date')
        .addSelect('sale.totalAmount', 'amount')
        .addSelect('COUNT(saleItem.id)', 'itemCount')
        .groupBy('sale.id')
        .orderBy('sale.soldAt', 'DESC')
        .limit(limit)
        .getRawMany<{
          id: string;
          kind: 'sale';
          date: string;
          amount: string;
          itemCount: string;
        }>(),
      this.dataSource
        .getRepository(Purchase)
        .createQueryBuilder('purchase')
        .leftJoin('purchase.items', 'purchaseItem')
        .leftJoin('purchase.supplier', 'supplier')
        .select('purchase.id', 'id')
        .addSelect(`'purchase'`, 'kind')
        .addSelect('purchase.receivedAt', 'date')
        .addSelect('purchase.totalCost', 'amount')
        .addSelect('supplier.name', 'name')
        .addSelect('COUNT(purchaseItem.id)', 'itemCount')
        .groupBy('purchase.id')
        .addGroupBy('supplier.name')
        .orderBy('purchase.receivedAt', 'DESC')
        .limit(limit)
        .getRawMany<{
          id: string;
          kind: 'purchase';
          date: string;
          amount: string;
          itemCount: string;
          name: string | null;
        }>(),
      this.dataSource
        .getRepository(SaleReturn)
        .createQueryBuilder('saleReturn')
        .leftJoin('saleReturn.items', 'returnItem')
        .select('saleReturn.id', 'id')
        .addSelect(`'return'`, 'kind')
        .addSelect('saleReturn.returnedAt', 'date')
        .addSelect('saleReturn.totalRefund', 'amount')
        .addSelect('COUNT(returnItem.id)', 'itemCount')
        .groupBy('saleReturn.id')
        .orderBy('saleReturn.returnedAt', 'DESC')
        .limit(limit)
        .getRawMany<{
          id: string;
          kind: 'return';
          date: string;
          amount: string;
          itemCount: string;
        }>(),
    ]);

    return [...sales, ...purchases, ...returns]
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        date: item.date,
        amount: roundCurrency(Number(item.amount)),
        itemCount: Number(item.itemCount),
        title:
          item.kind === 'sale'
            ? 'Sale completed'
            : item.kind === 'purchase'
              ? 'Purchase received'
              : 'Return processed',
        subtitle:
          item.kind === 'purchase' && 'name' in item && item.name
            ? item.name
            : `${Number(item.itemCount)} line item${Number(item.itemCount) === 1 ? '' : 's'}`,
      }));
  }

  private async buildMovementSummary(days: number) {
    const rows = await this.dataSource
      .getRepository(StockMovement)
      .createQueryBuilder('movement')
      .select('movement.referenceType', 'referenceType')
      .addSelect('movement.movementType', 'movementType')
      .addSelect('COALESCE(SUM(movement.quantity), 0)', 'quantity')
      .where('movement.occurredAt >= :fromDate', {
        fromDate: this.getRangeStart(days),
      })
      .groupBy('movement.referenceType')
      .addGroupBy('movement.movementType')
      .getRawMany<{
        referenceType: StockMovementReferenceType;
        movementType: StockMovementType;
        quantity: string;
      }>();

    const summary = {
      purchasesIn: 0,
      salesOut: 0,
      returns: 0,
    };

    for (const row of rows) {
      const quantity = Number(row.quantity);

      if (
        row.referenceType === StockMovementReferenceType.PURCHASE &&
        row.movementType === StockMovementType.STOCK_IN
      ) {
        summary.purchasesIn += quantity;
      }

      if (
        row.referenceType === StockMovementReferenceType.SALE &&
        row.movementType === StockMovementType.STOCK_OUT
      ) {
        summary.salesOut += quantity;
      }

      if (
        row.referenceType === StockMovementReferenceType.RETURN &&
        row.movementType === StockMovementType.STOCK_IN
      ) {
        summary.returns += quantity;
      }
    }

    return summary;
  }

  private async getUserCounts() {
    const repository = this.dataSource.getRepository(User);
    const [customerCount, employeeCount] = await Promise.all([
      repository.count({ where: { role: UserRole.CUSTOMER } }),
      repository.count({ where: { role: UserRole.EMPLOYEE } }),
    ]);

    return { customerCount, employeeCount };
  }

  private async getReportTotals(days: number) {
    const bounds = this.getCurrentRangeBounds(days);
    const [totalSales, totalReturns, estimatedProfit, totalOrders] = await Promise.all([
      this.sumSalesInRange(bounds.start, bounds.end),
      this.sumReturnsInRange(bounds.start, bounds.end),
      this.sumEstimatedProfitInRange(bounds.start, bounds.end),
      this.countSalesInRange(bounds.start, bounds.end),
    ]);
    const netSales = roundCurrency(Math.max(0, totalSales - totalReturns));
    const averageOrderValue = totalOrders
      ? roundCurrency(totalSales / totalOrders)
      : 0;
    const grossMarginPercent = this.roundPercentage(
      totalSales > 0 ? (estimatedProfit / totalSales) * 100 : 0,
    );
    const refundRatePercent = this.roundPercentage(
      totalSales > 0 ? (totalReturns / totalSales) * 100 : 0,
    );

    return {
      totalSales,
      totalReturns,
      estimatedProfit,
      totalOrders,
      averageOrderValue,
      grossMarginPercent,
      netSales,
      refundRatePercent,
    };
  }

  private async buildPerformanceTrend(days: number) {
    const labels = this.getDateBuckets(days);
    const bounds = this.getCurrentRangeBounds(days);

    const [salesRows, profitRows, refundRows] = await Promise.all([
      this.dataSource
        .getRepository(Sale)
        .createQueryBuilder('sale')
        .select(`TO_CHAR(DATE_TRUNC('day', sale.soldAt), 'YYYY-MM-DD')`, 'label')
        .addSelect('COALESCE(SUM(sale.totalAmount), 0)', 'revenue_total')
        .addSelect('COUNT(sale.id)', 'order_count')
        .where('sale.soldAt >= :startDate', { startDate: bounds.start })
        .andWhere('sale.soldAt < :endDate', { endDate: bounds.end })
        .groupBy(`DATE_TRUNC('day', sale.soldAt)`)
        .orderBy(`DATE_TRUNC('day', sale.soldAt)`, 'ASC')
        .getRawMany<{
          label: string;
          revenue_total: string;
          order_count: string;
        }>(),
      this.dataSource
        .getRepository(SaleItemAllocation)
        .createQueryBuilder('allocation')
        .leftJoin('allocation.saleItem', 'saleItem')
        .leftJoin('saleItem.sale', 'sale')
        .select(`TO_CHAR(DATE_TRUNC('day', sale.soldAt), 'YYYY-MM-DD')`, 'label')
        .addSelect(
          'COALESCE(SUM(allocation.quantity * (saleItem.unitPrice - allocation.unitCost)), 0)',
          'profit_total',
        )
        .where('sale.soldAt >= :startDate', { startDate: bounds.start })
        .andWhere('sale.soldAt < :endDate', { endDate: bounds.end })
        .groupBy(`DATE_TRUNC('day', sale.soldAt)`)
        .orderBy(`DATE_TRUNC('day', sale.soldAt)`, 'ASC')
        .getRawMany<{
          label: string;
          profit_total: string;
        }>(),
      this.dataSource
        .getRepository(SaleReturn)
        .createQueryBuilder('saleReturn')
        .select(`TO_CHAR(DATE_TRUNC('day', saleReturn.returnedAt), 'YYYY-MM-DD')`, 'label')
        .addSelect('COALESCE(SUM(saleReturn.totalRefund), 0)', 'refund_total')
        .where('saleReturn.returnedAt >= :startDate', { startDate: bounds.start })
        .andWhere('saleReturn.returnedAt < :endDate', { endDate: bounds.end })
        .groupBy(`DATE_TRUNC('day', saleReturn.returnedAt)`)
        .orderBy(`DATE_TRUNC('day', saleReturn.returnedAt)`, 'ASC')
        .getRawMany<{
          label: string;
          refund_total: string;
        }>(),
    ]);

    const revenueMap = new Map(
      salesRows.map((row) => [
        row.label,
        {
          revenue: Number(row.revenue_total),
          orders: Number(row.order_count),
        },
      ]),
    );
    const profitMap = new Map(
      profitRows.map((row) => [row.label, Number(row.profit_total)]),
    );
    const refundMap = new Map(
      refundRows.map((row) => [row.label, Number(row.refund_total)]),
    );

    return labels.map((label) => ({
      label,
      revenue: roundCurrency(revenueMap.get(label)?.revenue ?? 0),
      profit: roundCurrency(profitMap.get(label) ?? 0),
      refunds: roundCurrency(refundMap.get(label) ?? 0),
      orders: revenueMap.get(label)?.orders ?? 0,
    }));
  }

  private async buildPeriodComparisons(days: number) {
    const currentBounds = this.getCurrentRangeBounds(days);
    const previousBounds = this.getPreviousRangeBounds(days);

    const [
      currentSales,
      currentReturns,
      currentProfit,
      currentOrders,
      previousSales,
      previousReturns,
      previousProfit,
      previousOrders,
    ] = await Promise.all([
      this.sumSalesInRange(currentBounds.start, currentBounds.end),
      this.sumReturnsInRange(currentBounds.start, currentBounds.end),
      this.sumEstimatedProfitInRange(currentBounds.start, currentBounds.end),
      this.countSalesInRange(currentBounds.start, currentBounds.end),
      this.sumSalesInRange(previousBounds.start, previousBounds.end),
      this.sumReturnsInRange(previousBounds.start, previousBounds.end),
      this.sumEstimatedProfitInRange(previousBounds.start, previousBounds.end),
      this.countSalesInRange(previousBounds.start, previousBounds.end),
    ]);

    const currentAverageOrder = currentOrders
      ? roundCurrency(currentSales / currentOrders)
      : 0;
    const previousAverageOrder = previousOrders
      ? roundCurrency(previousSales / previousOrders)
      : 0;
    const currentRefundRate = currentSales > 0 ? (currentReturns / currentSales) * 100 : 0;
    const previousRefundRate =
      previousSales > 0 ? (previousReturns / previousSales) * 100 : 0;

    return [
      {
        id: 'revenue',
        label: 'Revenue',
        helper: `Compared with the previous ${days}-day window`,
        currentValue: currentSales,
        previousValue: previousSales,
        changePercent: this.calculateChangePercent(currentSales, previousSales),
        tone: 'blue',
        format: 'currency',
      },
      {
        id: 'profit',
        label: 'Profit',
        helper: 'Gross profit contribution from batch allocations',
        currentValue: currentProfit,
        previousValue: previousProfit,
        changePercent: this.calculateChangePercent(currentProfit, previousProfit),
        tone: 'green',
        format: 'currency',
      },
      {
        id: 'orders',
        label: 'Completed Orders',
        helper: 'Transactions finalized at checkout',
        currentValue: currentOrders,
        previousValue: previousOrders,
        changePercent: this.calculateChangePercent(currentOrders, previousOrders),
        tone: 'indigo',
        format: 'number',
      },
      {
        id: 'refund-rate',
        label: 'Refund Rate',
        helper: 'Returned value as a share of sales revenue',
        currentValue: this.roundPercentage(currentRefundRate),
        previousValue: this.roundPercentage(previousRefundRate),
        changePercent: this.calculateChangePercent(currentRefundRate, previousRefundRate),
        tone: 'orange',
        format: 'percent',
      },
      {
        id: 'average-order',
        label: 'Average Order',
        helper: 'Average value per completed sale',
        currentValue: currentAverageOrder,
        previousValue: previousAverageOrder,
        changePercent: this.calculateChangePercent(
          currentAverageOrder,
          previousAverageOrder,
        ),
        tone: 'teal',
        format: 'currency',
      },
    ];
  }

  private async buildWeeklyAnalytics(weeks: number) {
    return this.buildBucketAnalytics('week', weeks);
  }

  private async buildMonthlyAnalytics(months: number) {
    return this.buildBucketAnalytics('month', months);
  }

  private async buildBucketAnalytics(
    bucket: 'week' | 'month',
    periods: number,
  ) {
    const labels =
      bucket === 'week' ? this.getWeekBuckets(periods) : this.getMonthBuckets(periods);
    const startDate =
      bucket === 'week'
        ? this.getWeekBucketStart(periods)
        : this.getMonthBucketStart(periods);

    const [salesRows, profitRows] = await Promise.all([
      this.dataSource
        .getRepository(Sale)
        .createQueryBuilder('sale')
        .select(
          `TO_CHAR(DATE_TRUNC('${bucket}', sale.soldAt), 'YYYY-MM-DD')`,
          'label',
        )
        .addSelect('COALESCE(SUM(sale.totalAmount), 0)', 'revenue_total')
        .addSelect('COUNT(sale.id)', 'order_count')
        .where('sale.soldAt >= :startDate', { startDate })
        .groupBy(`DATE_TRUNC('${bucket}', sale.soldAt)`)
        .orderBy(`DATE_TRUNC('${bucket}', sale.soldAt)`, 'ASC')
        .getRawMany<{
          label: string;
          revenue_total: string;
          order_count: string;
        }>(),
      this.dataSource
        .getRepository(SaleItemAllocation)
        .createQueryBuilder('allocation')
        .leftJoin('allocation.saleItem', 'saleItem')
        .leftJoin('saleItem.sale', 'sale')
        .select(
          `TO_CHAR(DATE_TRUNC('${bucket}', sale.soldAt), 'YYYY-MM-DD')`,
          'label',
        )
        .addSelect(
          'COALESCE(SUM(allocation.quantity * (saleItem.unitPrice - allocation.unitCost)), 0)',
          'profit_total',
        )
        .where('sale.soldAt >= :startDate', { startDate })
        .groupBy(`DATE_TRUNC('${bucket}', sale.soldAt)`)
        .orderBy(`DATE_TRUNC('${bucket}', sale.soldAt)`, 'ASC')
        .getRawMany<{
          label: string;
          profit_total: string;
        }>(),
    ]);

    const revenueMap = new Map(
      salesRows.map((row) => [
        row.label,
        {
          revenue: Number(row.revenue_total),
          orders: Number(row.order_count),
        },
      ]),
    );
    const profitMap = new Map(
      profitRows.map((row) => [row.label, Number(row.profit_total)]),
    );

    return labels.map((label) => ({
      label,
      revenue: roundCurrency(revenueMap.get(label)?.revenue ?? 0),
      profit: roundCurrency(profitMap.get(label) ?? 0),
      orders: revenueMap.get(label)?.orders ?? 0,
    }));
  }

  private async buildEmployeePerformance(days: number) {
    const bounds = this.getCurrentRangeBounds(days);
    const [salesRows, profitRows] = await Promise.all([
      this.dataSource
        .getRepository(Sale)
        .createQueryBuilder('sale')
        .leftJoin('sale.soldBy', 'employee')
        .select('employee.id', 'employee_id')
        .addSelect('employee.firstName', 'first_name')
        .addSelect('employee.lastName', 'last_name')
        .addSelect('employee.email', 'email')
        .addSelect('COALESCE(SUM(sale.totalAmount), 0)', 'revenue_total')
        .addSelect('COUNT(sale.id)', 'completed_sales')
        .addSelect(
          `COUNT(DISTINCT TO_CHAR(DATE_TRUNC('day', sale.soldAt), 'YYYY-MM-DD'))`,
          'active_days',
        )
        .where('sale.soldAt >= :startDate', { startDate: bounds.start })
        .andWhere('sale.soldAt < :endDate', { endDate: bounds.end })
        .andWhere('employee.role = :employeeRole', {
          employeeRole: UserRole.EMPLOYEE,
        })
        .groupBy('employee.id')
        .addGroupBy('employee.firstName')
        .addGroupBy('employee.lastName')
        .addGroupBy('employee.email')
        .orderBy('revenue_total', 'DESC')
        .getRawMany<{
          employee_id: string;
          first_name: string;
          last_name: string;
          email: string;
          revenue_total: string;
          completed_sales: string;
          active_days: string;
        }>(),
      this.dataSource
        .getRepository(SaleItemAllocation)
        .createQueryBuilder('allocation')
        .leftJoin('allocation.saleItem', 'saleItem')
        .leftJoin('saleItem.sale', 'sale')
        .leftJoin('sale.soldBy', 'employee')
        .select('employee.id', 'employee_id')
        .addSelect(
          'COALESCE(SUM(allocation.quantity * (saleItem.unitPrice - allocation.unitCost)), 0)',
          'profit_total',
        )
        .where('sale.soldAt >= :startDate', { startDate: bounds.start })
        .andWhere('sale.soldAt < :endDate', { endDate: bounds.end })
        .andWhere('employee.role = :employeeRole', {
          employeeRole: UserRole.EMPLOYEE,
        })
        .groupBy('employee.id')
        .getRawMany<{
          employee_id: string;
          profit_total: string;
        }>(),
    ]);

    if (!salesRows.length) {
      return [];
    }

    const profitByEmployee = new Map(
      profitRows.map((row) => [row.employee_id, Number(row.profit_total)]),
    );
    const draft = salesRows.map((row) => {
      const revenue = roundCurrency(Number(row.revenue_total));
      const estimatedProfit = roundCurrency(
        profitByEmployee.get(row.employee_id) ?? 0,
      );
      const completedSales = Number(row.completed_sales);
      const activeDays = Number(row.active_days);
      const averageOrderValue = completedSales
        ? roundCurrency(revenue / completedSales)
        : 0;
      const consistencyScore = Math.max(
        0,
        Math.min(100, Math.round((activeDays / Math.max(days, 1)) * 100)),
      );

      return {
        id: row.employee_id,
        name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.email,
        email: row.email,
        revenue,
        estimatedProfit,
        completedSales,
        activeDays,
        averageOrderValue,
        consistencyScore,
        profitMarginPercent: this.roundPercentage(
          revenue > 0 ? (estimatedProfit / revenue) * 100 : 0,
        ),
      };
    });

    const maxRevenue = Math.max(...draft.map((item) => item.revenue), 1);
    const maxProfit = Math.max(...draft.map((item) => Math.max(item.estimatedProfit, 0)), 1);
    const maxSales = Math.max(...draft.map((item) => item.completedSales), 1);

    return draft
      .map((item) => {
        const performanceScore = Math.round(
          (item.revenue / maxRevenue) * 40 +
            (Math.max(item.estimatedProfit, 0) / maxProfit) * 30 +
            (item.completedSales / maxSales) * 20 +
            (item.consistencyScore / 100) * 10,
        );

        return {
          ...item,
          performanceScore,
        };
      })
      .sort((left, right) => {
        if (right.performanceScore !== left.performanceScore) {
          return right.performanceScore - left.performanceScore;
        }

        if (right.revenue !== left.revenue) {
          return right.revenue - left.revenue;
        }

        return right.completedSales - left.completedSales;
      })
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }

  private async sumReturns(days: number) {
    const result = await this.dataSource
      .getRepository(SaleReturn)
      .createQueryBuilder('saleReturn')
      .select('COALESCE(SUM(saleReturn.totalRefund), 0)', 'total')
      .where('saleReturn.returnedAt >= :fromDate', {
        fromDate: this.getRangeStart(days),
      })
      .getRawOne<{ total: string }>();

    return roundCurrency(Number(result?.total ?? 0));
  }

  private async sumEstimatedProfit(days: number) {
    const result = await this.dataSource
      .getRepository(SaleItemAllocation)
      .createQueryBuilder('allocation')
      .leftJoin('allocation.saleItem', 'saleItem')
      .leftJoin('saleItem.sale', 'sale')
      .select(
        'COALESCE(SUM(allocation.quantity * (saleItem.unitPrice - allocation.unitCost)), 0)',
        'total',
      )
      .where('sale.soldAt >= :fromDate', {
        fromDate: this.getRangeStart(days),
      })
      .getRawOne<{ total: string }>();

    return roundCurrency(Number(result?.total ?? 0));
  }

  private async sumSalesInRange(startDate: Date, endDate: Date) {
    const result = await this.dataSource
      .getRepository(Sale)
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.totalAmount), 0)', 'total')
      .where('sale.soldAt >= :startDate', { startDate })
      .andWhere('sale.soldAt < :endDate', { endDate })
      .getRawOne<{ total: string }>();

    return roundCurrency(Number(result?.total ?? 0));
  }

  private async sumReturnsInRange(startDate: Date, endDate: Date) {
    const result = await this.dataSource
      .getRepository(SaleReturn)
      .createQueryBuilder('saleReturn')
      .select('COALESCE(SUM(saleReturn.totalRefund), 0)', 'total')
      .where('saleReturn.returnedAt >= :startDate', { startDate })
      .andWhere('saleReturn.returnedAt < :endDate', { endDate })
      .getRawOne<{ total: string }>();

    return roundCurrency(Number(result?.total ?? 0));
  }

  private async sumEstimatedProfitInRange(startDate: Date, endDate: Date) {
    const result = await this.dataSource
      .getRepository(SaleItemAllocation)
      .createQueryBuilder('allocation')
      .leftJoin('allocation.saleItem', 'saleItem')
      .leftJoin('saleItem.sale', 'sale')
      .select(
        'COALESCE(SUM(allocation.quantity * (saleItem.unitPrice - allocation.unitCost)), 0)',
        'total',
      )
      .where('sale.soldAt >= :startDate', {
        startDate,
      })
      .andWhere('sale.soldAt < :endDate', { endDate })
      .getRawOne<{ total: string }>();

    return roundCurrency(Number(result?.total ?? 0));
  }

  private async countSalesInRange(startDate: Date, endDate: Date) {
    return this.dataSource
      .getRepository(Sale)
      .createQueryBuilder('sale')
      .where('sale.soldAt >= :startDate', { startDate })
      .andWhere('sale.soldAt < :endDate', { endDate })
      .getCount();
  }

  private getRangeStart(days: number) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    return start;
  }

  private getCurrentRangeBounds(days: number) {
    return {
      start: this.getRangeStart(days),
      end: new Date(),
    };
  }

  private getPreviousRangeBounds(days: number) {
    const end = this.getRangeStart(days);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days);

    return { start, end };
  }

  private getDateBuckets(days: number) {
    const labels: string[] = [];
    const start = this.getRangeStart(days);

    for (let index = 0; index < days; index += 1) {
      const current = new Date(start);
      current.setUTCDate(start.getUTCDate() + index);
      labels.push(toDateOnly(current));
    }

    return labels;
  }

  private getWeekBuckets(weeks: number) {
    const labels: string[] = [];
    const start = this.getWeekBucketStart(weeks);

    for (let index = 0; index < weeks; index += 1) {
      const current = new Date(start);
      current.setUTCDate(start.getUTCDate() + index * 7);
      labels.push(toDateOnly(current));
    }

    return labels;
  }

  private getMonthBuckets(months: number) {
    const labels: string[] = [];
    const start = this.getMonthBucketStart(months);

    for (let index = 0; index < months; index += 1) {
      const current = new Date(start);
      current.setUTCMonth(start.getUTCMonth() + index);
      labels.push(toDateOnly(current));
    }

    return labels;
  }

  private getWeekBucketStart(weeks: number) {
    const start = this.getStartOfWeek(new Date());
    start.setUTCDate(start.getUTCDate() - (weeks - 1) * 7);
    return start;
  }

  private getMonthBucketStart(months: number) {
    const start = this.getStartOfMonth(new Date());
    start.setUTCMonth(start.getUTCMonth() - (months - 1));
    return start;
  }

  private getStartOfWeek(dateValue: Date) {
    const date = new Date(dateValue);
    date.setUTCHours(0, 0, 0, 0);
    const day = date.getUTCDay();
    const delta = day === 0 ? -6 : 1 - day;
    date.setUTCDate(date.getUTCDate() + delta);
    return date;
  }

  private getStartOfMonth(dateValue: Date) {
    const date = new Date(dateValue);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(1);
    return date;
  }

  private daysUntil(dateValue: string) {
    const current = new Date(`${toDateOnly(new Date())}T00:00:00.000Z`).getTime();
    const target = new Date(`${dateValue}T00:00:00.000Z`).getTime();
    return Math.max(0, Math.round((target - current) / (24 * 60 * 60 * 1000)));
  }

  private normalizeRangeDays(days?: number) {
    if (!days || !Number.isFinite(days)) {
      return 30;
    }

    return Math.min(180, Math.max(7, Math.floor(days)));
  }

  private calculateChangePercent(currentValue: number, previousValue: number) {
    if (previousValue === 0) {
      return currentValue === 0 ? 0 : 100;
    }

    return this.roundPercentage(((currentValue - previousValue) / previousValue) * 100);
  }

  private roundPercentage(value: number) {
    return Number(value.toFixed(1));
  }

  private getLowStockThreshold() {
    const configured = Number(
      this.configService.get<string>('LOW_STOCK_THRESHOLD', '20'),
    );

    if (!Number.isFinite(configured)) {
      return 20;
    }

    return Math.max(1, Math.floor(configured));
  }

  private getExpiringSoonDays() {
    const configured = Number(
      this.configService.get<string>('EXPIRING_SOON_DAYS', '30'),
    );

    if (!Number.isFinite(configured)) {
      return 30;
    }

    return Math.max(7, Math.floor(configured));
  }
}
