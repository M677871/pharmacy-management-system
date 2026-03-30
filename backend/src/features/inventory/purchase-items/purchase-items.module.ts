import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseItem } from './entities/purchase-item.entity';
import { PurchaseItemsController } from './purchase-items.controller';
import { PurchaseItemsRepository } from './purchase-items.repository';
import { PurchaseItemsService } from './purchase-items.service';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseItem])],
  providers: [PurchaseItemsRepository, PurchaseItemsService],
  controllers: [PurchaseItemsController],
  exports: [PurchaseItemsRepository, PurchaseItemsService],
})
export class PurchaseItemsModule {}
