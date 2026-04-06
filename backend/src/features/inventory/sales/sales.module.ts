import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchesModule } from '../batches/batches.module';
import { InventoryRealtimeModule } from '../realtime/inventory-realtime.module';
import { ReturnItemsModule } from '../return-items/return-items.module';
import { SaleItemAllocationsModule } from '../sale-item-allocations/sale-item-allocations.module';
import { SaleItemsModule } from '../sale-items/sale-items.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { SalesController } from './sales.controller';
import { Sale } from './entities/sale.entity';
import { SalesRepository } from './sales.repository';
import { SalesService } from './sales.service';
import { AllocationService } from './services/allocation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale]),
    SaleItemsModule,
    SaleItemAllocationsModule,
    BatchesModule,
    StockMovementsModule,
    ReturnItemsModule,
    InventoryRealtimeModule,
  ],
  controllers: [SalesController],
  providers: [SalesRepository, SalesService, AllocationService],
  exports: [SalesRepository, SalesService],
})
export class SalesModule {}
