import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleItem } from './entities/sale-item.entity';
import { SaleItemsController } from './sale-items.controller';
import { SaleItemsRepository } from './sale-items.repository';
import { SaleItemsResolver } from './sale-items.resolver';
import { SaleItemsService } from './sale-items.service';

@Module({
  imports: [TypeOrmModule.forFeature([SaleItem])],
  providers: [SaleItemsRepository, SaleItemsService, SaleItemsResolver],
  controllers: [SaleItemsController],
  exports: [SaleItemsRepository, SaleItemsService],
})
export class SaleItemsModule {}
