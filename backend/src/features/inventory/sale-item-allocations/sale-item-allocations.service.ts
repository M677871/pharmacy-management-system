import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateSaleItemAllocationDto,
  ListSaleItemAllocationsQueryDto,
  UpdateSaleItemAllocationDto,
} from './dto/sale-item-allocation.dto';
import { SaleItemAllocationsRepository } from './sale-item-allocations.repository';

@Injectable()
export class SaleItemAllocationsService {
  constructor(
    private readonly saleItemAllocationsRepository: SaleItemAllocationsRepository,
  ) {}

  async findAll(query: ListSaleItemAllocationsQueryDto) {
    const allocations = await this.saleItemAllocationsRepository.findAll(query);

    return allocations.map((allocation) => ({
      id: allocation.id,
      saleItemId: allocation.saleItemId,
      productName: allocation.saleItem?.product?.name ?? null,
      batchId: allocation.batchId,
      batchNumber: allocation.batch?.batchNumber ?? null,
      expiryDate: allocation.batch?.expiryDate ?? null,
      quantity: allocation.quantity,
      unitCost: allocation.unitCost,
    }));
  }

  async findOne(id: string) {
    const allocation = await this.saleItemAllocationsRepository.findById(id);

    if (!allocation) {
      throw new NotFoundException('Sale item allocation not found.');
    }

    return {
      id: allocation.id,
      saleItemId: allocation.saleItemId,
      productName: allocation.saleItem?.product?.name ?? null,
      batchId: allocation.batchId,
      batchNumber: allocation.batch?.batchNumber ?? null,
      expiryDate: allocation.batch?.expiryDate ?? null,
      quantity: allocation.quantity,
      unitCost: allocation.unitCost,
    };
  }

  create(_dto: CreateSaleItemAllocationDto) {
    throw new BadRequestException(
      'Sale item allocations are created automatically during checkout.',
    );
  }

  update(_id: string, _dto: UpdateSaleItemAllocationDto) {
    throw new BadRequestException(
      'Sale item allocations cannot be edited directly.',
    );
  }

  remove(_id: string) {
    throw new BadRequestException(
      'Sale item allocations cannot be deleted directly.',
    );
  }
}
