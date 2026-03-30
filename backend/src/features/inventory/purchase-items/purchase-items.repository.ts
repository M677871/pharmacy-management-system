import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { PurchaseItem } from './entities/purchase-item.entity';

@Injectable()
export class PurchaseItemsRepository {
  constructor(
    @InjectRepository(PurchaseItem)
    private readonly purchaseItemsRepository: Repository<PurchaseItem>,
  ) {}

  private repository(manager?: EntityManager) {
    return manager?.getRepository(PurchaseItem) ?? this.purchaseItemsRepository;
  }

  create(data: DeepPartial<PurchaseItem>, manager?: EntityManager) {
    return this.repository(manager).create(data);
  }

  save(purchaseItem: PurchaseItem, manager?: EntityManager) {
    return this.repository(manager).save(purchaseItem);
  }

  findAll(filters: { purchaseId?: string; productId?: string }) {
    const builder = this.purchaseItemsRepository
      .createQueryBuilder('purchaseItem')
      .leftJoinAndSelect('purchaseItem.purchase', 'purchase')
      .leftJoinAndSelect('purchaseItem.product', 'product')
      .leftJoinAndSelect('purchaseItem.batch', 'batch')
      .orderBy('purchase.receivedAt', 'DESC')
      .addOrderBy('product.name', 'ASC');

    if (filters.purchaseId) {
      builder.andWhere('purchaseItem.purchaseId = :purchaseId', {
        purchaseId: filters.purchaseId,
      });
    }

    if (filters.productId) {
      builder.andWhere('purchaseItem.productId = :productId', {
        productId: filters.productId,
      });
    }

    return builder.getMany();
  }

  findById(id: string) {
    return this.purchaseItemsRepository.findOne({
      where: { id },
      relations: {
        purchase: true,
        product: true,
        batch: true,
      },
    });
  }
}
