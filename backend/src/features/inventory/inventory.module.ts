import { Module } from '@nestjs/common';
import { BatchesModule } from './batches/batches.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { PurchaseItemsModule } from './purchase-items/purchase-items.module';
import { PurchasesModule } from './purchases/purchases.module';
import { ReturnItemsModule } from './return-items/return-items.module';
import { SaleItemAllocationsModule } from './sale-item-allocations/sale-item-allocations.module';
import { SaleItemsModule } from './sale-items/sale-items.module';
import { SaleReturnsModule } from './sale-returns/sale-returns.module';
import { SalesModule } from './sales/sales.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [
    CategoriesModule,
    SuppliersModule,
    ProductsModule,
    BatchesModule,
    PurchasesModule,
    PurchaseItemsModule,
    SalesModule,
    SaleItemsModule,
    SaleItemAllocationsModule,
    SaleReturnsModule,
    ReturnItemsModule,
    StockMovementsModule,
  ],
})
export class InventoryModule {}
