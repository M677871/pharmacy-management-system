import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { InventoryRealtimeModule } from '../realtime/inventory-realtime.module';
import { Batch } from './entities/batch.entity';
import { BatchesController } from './batches.controller';
import { BatchesRepository } from './batches.repository';
import { BatchesService } from './batches.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Batch]),
    ProductsModule,
    InventoryRealtimeModule,
  ],
  providers: [BatchesRepository, BatchesService],
  controllers: [BatchesController],
  exports: [BatchesRepository, BatchesService],
})
export class BatchesModule {}
