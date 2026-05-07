import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsRepository } from './stock-movements.repository';
import { StockMovementsResolver } from './stock-movements.resolver';
import { StockMovementsService } from './stock-movements.service';

@Module({
  imports: [TypeOrmModule.forFeature([StockMovement])],
  providers: [
    StockMovementsRepository,
    StockMovementsService,
    StockMovementsResolver,
  ],
  controllers: [StockMovementsController],
  exports: [StockMovementsRepository, StockMovementsService],
})
export class StockMovementsModule {}
