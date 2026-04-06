import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryRealtimeModule } from '../realtime/inventory-realtime.module';
import { Category } from './entities/category.entity';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), InventoryRealtimeModule],
  providers: [CategoriesRepository, CategoriesService],
  controllers: [CategoriesController],
  exports: [CategoriesRepository, CategoriesService],
})
export class CategoriesModule {}
