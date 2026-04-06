import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../../notifications/notifications.module';
import { RealtimeCoreModule } from '../../realtime/core/realtime-core.module';
import { User } from '../../users/entities/user.entity';
import { Batch } from '../batches/entities/batch.entity';
import { Product } from '../products/entities/product.entity';
import { InventoryRealtimeService } from './inventory-realtime.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Product, Batch, User]),
    NotificationsModule,
    RealtimeCoreModule,
  ],
  providers: [InventoryRealtimeService],
  exports: [InventoryRealtimeService],
})
export class InventoryRealtimeModule {}
