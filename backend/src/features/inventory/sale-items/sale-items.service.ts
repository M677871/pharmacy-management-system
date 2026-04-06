import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateSaleItemDto,
  ListSaleItemsQueryDto,
  UpdateSaleItemDto,
} from './dto/sale-item.dto';
import { SaleItemsRepository } from './sale-items.repository';

@Injectable()
export class SaleItemsService {
  constructor(private readonly saleItemsRepository: SaleItemsRepository) {}

  async findAll(query: ListSaleItemsQueryDto) {
    const saleItems = await this.saleItemsRepository.findAll(query);

    return saleItems.map((saleItem) => ({
      id: saleItem.id,
      saleId: saleItem.saleId,
      productId: saleItem.productId,
      productName: saleItem.product?.name ?? null,
      quantity: saleItem.quantity,
      unitPrice: saleItem.unitPrice,
      lineTotal: saleItem.lineTotal,
      soldAt: saleItem.sale?.soldAt ?? null,
      allocations: saleItem.allocations.map((allocation) => ({
        id: allocation.id,
        batchId: allocation.batchId,
        batchNumber: allocation.batch?.batchNumber ?? null,
        expiryDate: allocation.batch?.expiryDate ?? null,
        quantity: allocation.quantity,
      })),
    }));
  }

  async findOne(id: string) {
    const saleItem = await this.saleItemsRepository.findById(id);

    if (!saleItem) {
      throw new NotFoundException('Sale item not found.');
    }

    return {
      id: saleItem.id,
      saleId: saleItem.saleId,
      productId: saleItem.productId,
      productName: saleItem.product?.name ?? null,
      quantity: saleItem.quantity,
      unitPrice: saleItem.unitPrice,
      lineTotal: saleItem.lineTotal,
      soldAt: saleItem.sale?.soldAt ?? null,
      allocations: saleItem.allocations.map((allocation) => ({
        id: allocation.id,
        batchId: allocation.batchId,
        batchNumber: allocation.batch?.batchNumber ?? null,
        expiryDate: allocation.batch?.expiryDate ?? null,
        quantity: allocation.quantity,
      })),
    };
  }

  create(_dto: CreateSaleItemDto) {
    throw new BadRequestException(
      'Sale items must be created through the POS checkout workflow.',
    );
  }

  update(_id: string, _dto: UpdateSaleItemDto) {
    throw new BadRequestException(
      'Sale items cannot be edited directly. Use the sales workflow instead.',
    );
  }

  remove(_id: string) {
    throw new BadRequestException(
      'Sale items cannot be deleted directly. Use the sales workflow instead.',
    );
  }
}
