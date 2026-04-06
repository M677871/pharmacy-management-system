import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateReturnItemDto,
  ListReturnItemsQueryDto,
  UpdateReturnItemDto,
} from './dto/return-item.dto';
import { ReturnItemsRepository } from './return-items.repository';

@Injectable()
export class ReturnItemsService {
  constructor(private readonly returnItemsRepository: ReturnItemsRepository) {}

  async findAll(query: ListReturnItemsQueryDto) {
    const returnItems = await this.returnItemsRepository.findAll(query);

    return returnItems.map((returnItem) => ({
      id: returnItem.id,
      returnId: returnItem.returnId,
      saleItemId: returnItem.saleItemId,
      productId: returnItem.productId,
      productName: returnItem.product?.name ?? null,
      quantity: returnItem.quantity,
      unitPrice: returnItem.unitPrice,
      lineTotal: returnItem.lineTotal,
      returnedAt: returnItem.returnTransaction?.returnedAt ?? null,
    }));
  }

  async findOne(id: string) {
    const returnItem = await this.returnItemsRepository.findById(id);

    if (!returnItem) {
      throw new NotFoundException('Return item not found.');
    }

    return {
      id: returnItem.id,
      returnId: returnItem.returnId,
      saleItemId: returnItem.saleItemId,
      productId: returnItem.productId,
      productName: returnItem.product?.name ?? null,
      quantity: returnItem.quantity,
      unitPrice: returnItem.unitPrice,
      lineTotal: returnItem.lineTotal,
      returnedAt: returnItem.returnTransaction?.returnedAt ?? null,
    };
  }

  create(_dto: CreateReturnItemDto) {
    throw new BadRequestException(
      'Return items must be created through the return workflow.',
    );
  }

  update(_id: string, _dto: UpdateReturnItemDto) {
    throw new BadRequestException(
      'Return items cannot be edited directly. Use the returns workflow instead.',
    );
  }

  remove(_id: string) {
    throw new BadRequestException(
      'Return items cannot be deleted directly. Use the returns workflow instead.',
    );
  }
}
