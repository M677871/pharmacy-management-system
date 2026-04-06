import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchesModule } from '../batches/batches.module';
import { InventoryRealtimeModule } from '../realtime/inventory-realtime.module';
import { ReturnItemsModule } from '../return-items/return-items.module';
import { SalesModule } from '../sales/sales.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { SaleReturn } from './entities/sale-return.entity';
import { SaleReturnsController } from './sale-returns.controller';
import { SaleReturnsRepository } from './sale-returns.repository';
import { SaleReturnsService } from './sale-returns.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SaleReturn]),
    SalesModule,
    ReturnItemsModule,
    BatchesModule,
    StockMovementsModule,
    InventoryRealtimeModule,
  ],
  providers: [SaleReturnsRepository, SaleReturnsService],
  controllers: [SaleReturnsController],
  exports: [SaleReturnsRepository, SaleReturnsService],
})
export class SaleReturnsModule {}
