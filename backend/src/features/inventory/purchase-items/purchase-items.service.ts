import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreatePurchaseItemDto,
  ListPurchaseItemsQueryDto,
  UpdatePurchaseItemDto,
} from './dto/purchase-item.dto';
import { PurchaseItemsRepository } from './purchase-items.repository';

@Injectable()
export class PurchaseItemsService {
  constructor(
    private readonly purchaseItemsRepository: PurchaseItemsRepository,
  ) {}

  async findAll(query: ListPurchaseItemsQueryDto) {
    const purchaseItems = await this.purchaseItemsRepository.findAll(query);

    return purchaseItems.map((purchaseItem) => ({
      id: purchaseItem.id,
      purchaseId: purchaseItem.purchaseId,
      productId: purchaseItem.productId,
      productName: purchaseItem.product?.name ?? null,
      batchId: purchaseItem.batchId,
      batchNumber: purchaseItem.batch?.batchNumber ?? null,
      quantity: purchaseItem.quantity,
      unitCost: purchaseItem.unitCost,
      lineTotal: purchaseItem.lineTotal,
      receivedAt: purchaseItem.purchase?.receivedAt ?? null,
    }));
  }

  async findOne(id: string) {
    const purchaseItem = await this.purchaseItemsRepository.findById(id);

    if (!purchaseItem) {
      throw new NotFoundException('Purchase item not found.');
    }

    return {
      id: purchaseItem.id,
      purchaseId: purchaseItem.purchaseId,
      productId: purchaseItem.productId,
      productName: purchaseItem.product?.name ?? null,
      batchId: purchaseItem.batchId,
      batchNumber: purchaseItem.batch?.batchNumber ?? null,
      quantity: purchaseItem.quantity,
      unitCost: purchaseItem.unitCost,
      lineTotal: purchaseItem.lineTotal,
      receivedAt: purchaseItem.purchase?.receivedAt ?? null,
    };
  }

  create(_dto: CreatePurchaseItemDto) {
    throw new BadRequestException(
      'Purchase items must be created through the purchase receiving workflow.',
    );
  }

  update(_id: string, _dto: UpdatePurchaseItemDto) {
    throw new BadRequestException(
      'Purchase items cannot be edited directly. Use the purchase workflow instead.',
    );
  }

  remove(_id: string) {
    throw new BadRequestException(
      'Purchase items cannot be deleted directly. Use the purchase workflow instead.',
    );
  }
}
