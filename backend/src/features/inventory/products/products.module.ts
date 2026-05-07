import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { InventoryRealtimeModule } from '../realtime/inventory-realtime.module';
import { Product } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { ProductsResolver } from './products.resolver';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    CategoriesModule,
    InventoryRealtimeModule,
  ],
  providers: [ProductsRepository, ProductsService, ProductsResolver],
  controllers: [ProductsController],
  exports: [ProductsRepository, ProductsService],
})
export class ProductsModule {}
