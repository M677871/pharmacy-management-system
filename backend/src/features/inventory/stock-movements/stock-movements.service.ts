import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateStockMovementDto,
  ListStockMovementsQueryDto,
  UpdateStockMovementDto,
} from './dto/stock-movement.dto';
import { StockMovementsRepository } from './stock-movements.repository';

@Injectable()
export class StockMovementsService {
  constructor(
    private readonly stockMovementsRepository: StockMovementsRepository,
  ) {}

  async findAll(query: ListStockMovementsQueryDto) {
    const movements = await this.stockMovementsRepository.findAll(query);

    return movements.map((movement) => ({
      id: movement.id,
      movementType: movement.movementType,
      referenceType: movement.referenceType,
      productId: movement.productId,
      productName: movement.product?.name ?? null,
      batchId: movement.batchId,
      batchNumber: movement.batch?.batchNumber ?? null,
      quantity: movement.quantity,
      unitCost: movement.unitCost,
      unitPrice: movement.unitPrice,
      purchaseId: movement.purchaseId,
      saleId: movement.saleId,
      returnId: movement.returnId,
      occurredAt: movement.occurredAt,
      note: movement.note,
    }));
  }

  async findOne(id: string) {
    const movement = await this.stockMovementsRepository.findById(id);

    if (!movement) {
      throw new NotFoundException('Stock movement not found.');
    }

    return {
      id: movement.id,
      movementType: movement.movementType,
      referenceType: movement.referenceType,
      productId: movement.productId,
      productName: movement.product?.name ?? null,
      batchId: movement.batchId,
      batchNumber: movement.batch?.batchNumber ?? null,
      quantity: movement.quantity,
      unitCost: movement.unitCost,
      unitPrice: movement.unitPrice,
      purchaseId: movement.purchaseId,
      saleId: movement.saleId,
      returnId: movement.returnId,
      occurredAt: movement.occurredAt,
      note: movement.note,
    };
  }

  create(_dto: CreateStockMovementDto) {
    throw new BadRequestException(
      'Stock movements are generated automatically by inventory workflows.',
    );
  }

  update(_id: string, _dto: UpdateStockMovementDto) {
    throw new BadRequestException('Stock movements cannot be edited directly.');
  }

  remove(_id: string) {
    throw new BadRequestException('Stock movements cannot be deleted directly.');
  }
}
