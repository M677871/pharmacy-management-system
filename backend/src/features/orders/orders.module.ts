import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchesModule } from '../inventory/batches/batches.module';
import { ProductsModule } from '../inventory/products/products.module';
import { InventoryRealtimeModule } from '../inventory/realtime/inventory-realtime.module';
import { SaleItemAllocationsModule } from '../inventory/sale-item-allocations/sale-item-allocations.module';
import { SaleItemsModule } from '../inventory/sale-items/sale-items.module';
import { SalesModule } from '../inventory/sales/sales.module';
import { StockMovementsModule } from '../inventory/stock-movements/stock-movements.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeCoreModule } from '../realtime/core/realtime-core.module';
import { User } from '../users/entities/user.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CatalogOrder } from './entities/catalog-order.entity';
import { CatalogOrderItem } from './entities/catalog-order-item.entity';
import { CatalogOrderItemAllocation } from './entities/catalog-order-item-allocation.entity';
import { DeliveryDriver } from './entities/delivery-driver.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CatalogOrder,
      CatalogOrderItem,
      CatalogOrderItemAllocation,
      DeliveryDriver,
      User,
    ]),
    RealtimeCoreModule,
    NotificationsModule,
    MessagingModule,
    ProductsModule,
    BatchesModule,
    SalesModule,
    SaleItemsModule,
    SaleItemAllocationsModule,
    StockMovementsModule,
    InventoryRealtimeModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
