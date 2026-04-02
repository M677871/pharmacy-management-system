import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { Purchase } from './entities/purchase.entity';

@Injectable()
export class PurchasesRepository {
  constructor(
    @InjectRepository(Purchase)
    private readonly purchasesRepository: Repository<Purchase>,
  ) {}

  private repository(manager?: EntityManager) {
    return manager?.getRepository(Purchase) ?? this.purchasesRepository;
  }

  create(data: DeepPartial<Purchase>, manager?: EntityManager) {
    return this.repository(manager).create(data);
  }

  save(purchase: Purchase, manager?: EntityManager) {
    return this.repository(manager).save(purchase);
  }

  findAll(filters: { supplierId?: string }) {
    const builder = this.purchasesRepository
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.supplier', 'supplier')
      .leftJoinAndSelect('purchase.items', 'items')
      .orderBy('purchase.receivedAt', 'DESC');

    if (filters.supplierId) {
      builder.andWhere('purchase.supplierId = :supplierId', {
        supplierId: filters.supplierId,
      });
    }

    return builder.getMany();
  }

  findById(id: string, manager?: EntityManager) {
    return this.repository(manager).findOne({
      where: { id },
      relations: {
        supplier: true,
        items: {
          product: true,
          batch: true,
        },
      },
    });
  }

  merge(purchase: Purchase, data: DeepPartial<Purchase>) {
    return this.purchasesRepository.merge(purchase, data);
  }
}
