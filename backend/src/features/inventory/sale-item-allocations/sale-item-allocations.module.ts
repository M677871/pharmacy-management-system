import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleItemAllocation } from './entities/sale-item-allocation.entity';
import { SaleItemAllocationsController } from './sale-item-allocations.controller';
import { SaleItemAllocationsRepository } from './sale-item-allocations.repository';
import { SaleItemAllocationsService } from './sale-item-allocations.service';

@Module({
  imports: [TypeOrmModule.forFeature([SaleItemAllocation])],
  providers: [SaleItemAllocationsRepository, SaleItemAllocationsService],
  controllers: [SaleItemAllocationsController],
  exports: [SaleItemAllocationsRepository, SaleItemAllocationsService],
})
export class SaleItemAllocationsModule {}
