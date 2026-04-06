import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnItem } from './entities/return-item.entity';
import { ReturnItemsController } from './return-items.controller';
import { ReturnItemsRepository } from './return-items.repository';
import { ReturnItemsService } from './return-items.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReturnItem])],
  providers: [ReturnItemsRepository, ReturnItemsService],
  controllers: [ReturnItemsController],
  exports: [ReturnItemsRepository, ReturnItemsService],
})
export class ReturnItemsModule {}
