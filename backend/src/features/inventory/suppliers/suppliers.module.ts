import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryRealtimeModule } from '../realtime/inventory-realtime.module';
import { Supplier } from './entities/supplier.entity';
import { SuppliersController } from './suppliers.controller';
import { SuppliersRepository } from './suppliers.repository';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier]), InventoryRealtimeModule],
  providers: [SuppliersRepository, SuppliersService],
  controllers: [SuppliersController],
  exports: [SuppliersRepository, SuppliersService],
})
export class SuppliersModule {}
