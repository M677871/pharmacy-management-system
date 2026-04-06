import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { SaleItem } from './entities/sale-item.entity';

@Injectable()
export class SaleItemsRepository {
  constructor(
    @InjectRepository(SaleItem)
    private readonly saleItemsRepository: Repository<SaleItem>,
  ) {}

  private repository(manager?: EntityManager) {
    return manager?.getRepository(SaleItem) ?? this.saleItemsRepository;
  }

  create(data: DeepPartial<SaleItem>, manager?: EntityManager) {
    return this.repository(manager).create(data);
  }

  save(saleItem: SaleItem, manager?: EntityManager) {
    return this.repository(manager).save(saleItem);
  }

  findAll(filters: { saleId?: string; productId?: string }) {
    const builder = this.saleItemsRepository
      .createQueryBuilder('saleItem')
      .leftJoinAndSelect('saleItem.sale', 'sale')
      .leftJoinAndSelect('saleItem.product', 'product')
      .leftJoinAndSelect('saleItem.allocations', 'allocation')
      .leftJoinAndSelect('allocation.batch', 'batch')
      .orderBy('sale.soldAt', 'DESC')
      .addOrderBy('product.name', 'ASC');

    if (filters.saleId) {
      builder.andWhere('saleItem.saleId = :saleId', { saleId: filters.saleId });
    }

    if (filters.productId) {
      builder.andWhere('saleItem.productId = :productId', {
        productId: filters.productId,
      });
    }

    return builder.getMany();
  }

  findById(id: string) {
    return this.saleItemsRepository.findOne({
      where: { id },
      relations: {
        sale: true,
        product: true,
        allocations: {
          batch: true,
        },
      },
    });
  }
}
