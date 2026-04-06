import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, In, Repository } from 'typeorm';
import { ReturnItem } from './entities/return-item.entity';

@Injectable()
export class ReturnItemsRepository {
  constructor(
    @InjectRepository(ReturnItem)
    private readonly returnItemsRepository: Repository<ReturnItem>,
  ) {}

  private repository(manager?: EntityManager) {
    return manager?.getRepository(ReturnItem) ?? this.returnItemsRepository;
  }

  create(data: DeepPartial<ReturnItem>, manager?: EntityManager) {
    return this.repository(manager).create(data);
  }

  save(returnItem: ReturnItem, manager?: EntityManager) {
    return this.repository(manager).save(returnItem);
  }

  findAll(filters: { returnId?: string; saleItemId?: string; productId?: string }) {
    const builder = this.returnItemsRepository
      .createQueryBuilder('returnItem')
      .leftJoinAndSelect('returnItem.returnTransaction', 'returnTransaction')
      .leftJoinAndSelect('returnItem.saleItem', 'saleItem')
      .leftJoinAndSelect('returnItem.product', 'product')
      .orderBy('returnTransaction.returnedAt', 'DESC')
      .addOrderBy('product.name', 'ASC');

    if (filters.returnId) {
      builder.andWhere('returnItem.returnId = :returnId', {
        returnId: filters.returnId,
      });
    }

    if (filters.saleItemId) {
      builder.andWhere('returnItem.saleItemId = :saleItemId', {
        saleItemId: filters.saleItemId,
      });
    }

    if (filters.productId) {
      builder.andWhere('returnItem.productId = :productId', {
        productId: filters.productId,
      });
    }

    return builder.getMany();
  }

  findById(id: string) {
    return this.returnItemsRepository.findOne({
      where: { id },
      relations: {
        returnTransaction: true,
        saleItem: true,
        product: true,
      },
    });
  }

  findBySaleItemIds(saleItemIds: string[], manager?: EntityManager) {
    return saleItemIds.length
      ? this.repository(manager).find({
          where: { saleItemId: In(saleItemIds) },
        })
      : [];
  }
}
