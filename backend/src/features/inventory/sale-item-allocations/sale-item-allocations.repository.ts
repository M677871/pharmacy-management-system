import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { SaleItemAllocation } from './entities/sale-item-allocation.entity';

@Injectable()
export class SaleItemAllocationsRepository {
  constructor(
    @InjectRepository(SaleItemAllocation)
    private readonly saleItemAllocationsRepository: Repository<SaleItemAllocation>,
  ) {}

  private repository(manager?: EntityManager) {
    return manager?.getRepository(SaleItemAllocation) ?? this.saleItemAllocationsRepository;
  }

  create(data: DeepPartial<SaleItemAllocation>, manager?: EntityManager) {
    return this.repository(manager).create(data);
  }

  save(allocation: SaleItemAllocation, manager?: EntityManager) {
    return this.repository(manager).save(allocation);
  }

  findAll(filters: { saleItemId?: string; batchId?: string }) {
    const builder = this.saleItemAllocationsRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.saleItem', 'saleItem')
      .leftJoinAndSelect('saleItem.product', 'product')
      .leftJoinAndSelect('allocation.batch', 'batch')
      .orderBy('saleItem.createdAt', 'DESC')
      .addOrderBy('batch.expiryDate', 'ASC');

    if (filters.saleItemId) {
      builder.andWhere('allocation.saleItemId = :saleItemId', {
        saleItemId: filters.saleItemId,
      });
    }

    if (filters.batchId) {
      builder.andWhere('allocation.batchId = :batchId', { batchId: filters.batchId });
    }

    return builder.getMany();
  }

  findById(id: string) {
    return this.saleItemAllocationsRepository.findOne({
      where: { id },
      relations: {
        saleItem: {
          product: true,
        },
        batch: true,
      },
    });
  }
}
