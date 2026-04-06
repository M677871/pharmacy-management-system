import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchesModule } from '../batches/batches.module';
import { ProductsModule } from '../products/products.module';
import { PurchaseItemsModule } from '../purchase-items/purchase-items.module';
import { InventoryRealtimeModule } from '../realtime/inventory-realtime.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { PurchasesController } from './purchases.controller';
import { Purchase } from './entities/purchase.entity';
import { PurchasesRepository } from './purchases.repository';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Purchase]),
    SuppliersModule,
    ProductsModule,
    PurchaseItemsModule,
    BatchesModule,
    StockMovementsModule,
    InventoryRealtimeModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchasesRepository, PurchasesService],
  exports: [PurchasesRepository, PurchasesService],
})
export class PurchasesModule {}
