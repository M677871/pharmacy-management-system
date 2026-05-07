import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { Batch } from './entities/batch.entity';

@Injectable()
export class BatchesRepository {
  constructor(
    @InjectRepository(Batch)
    private readonly batchesRepository: Repository<Batch>,
  ) {}

  private repository(manager?: EntityManager) {
    return manager?.getRepository(Batch) ?? this.batchesRepository;
  }

  create(data: DeepPartial<Batch>, manager?: EntityManager) {
    return this.repository(manager).create(data);
  }

  save(batch: Batch, manager?: EntityManager) {
    return this.repository(manager).save(batch);
  }

  findById(id: string, manager?: EntityManager) {
    return this.repository(manager).findOne({
      where: { id },
      relations: {
        supplier: true,
        product: true,
      },
    });
  }

  findByProductId(productId: string) {
    return this.batchesRepository
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.supplier', 'supplier')
      .where('batch.productId = :productId', { productId })
      .orderBy('batch.expiryDate', 'ASC', 'NULLS LAST')
      .addOrderBy('batch.receivedAt', 'ASC')
      .getMany();
  }

  findAll(query: { productId?: string; includeExpired?: boolean; includeEmpty?: boolean }) {
    const builder = this.batchesRepository
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.product', 'product')
      .leftJoinAndSelect('batch.supplier', 'supplier')
      .orderBy('batch.expiryDate', 'ASC', 'NULLS LAST')
      .addOrderBy('batch.receivedAt', 'ASC');

    if (query.productId) {
      builder.andWhere('batch.productId = :productId', { productId: query.productId });
    }

    if (!query.includeEmpty) {
      builder.andWhere('batch.quantityOnHand > 0');
    }

    if (!query.includeExpired) {
      builder.andWhere(
        '(product.doesNotExpire = true OR batch.expiryDate IS NULL OR batch.expiryDate > :today)',
        {
          today: new Date().toISOString().slice(0, 10),
        },
      );
    }

    return builder.getMany();
  }

  findByIdentity(
    productId: string,
    batchNumber: string,
    expiryDate: string | null,
    manager?: EntityManager,
  ) {
    const builder = this.repository(manager)
      .createQueryBuilder('batch')
      .where('batch.productId = :productId', { productId })
      .andWhere('batch.batchNumber = :batchNumber', { batchNumber });

    if (expiryDate) {
      builder.andWhere('batch.expiryDate = :expiryDate', { expiryDate });
    } else {
      builder.andWhere('batch.expiryDate IS NULL');
    }

    return builder.getOne();
  }

  findSellableBatches(productId: string, saleDate: string, manager: EntityManager) {
    return this.repository(manager)
      .createQueryBuilder('batch')
      .setLock('pessimistic_write')
      .leftJoin('batch.product', 'product')
      .where('batch.productId = :productId', { productId })
      .andWhere('batch.quantityOnHand > batch.quantityReserved')
      .andWhere(
        '(product.doesNotExpire = true OR batch.expiryDate IS NULL OR batch.expiryDate > :saleDate)',
        { saleDate },
      )
      .orderBy('batch.expiryDate', 'ASC', 'NULLS LAST')
      .addOrderBy('batch.receivedAt', 'ASC')
      .addOrderBy('batch.createdAt', 'ASC')
      .getMany();
  }

  merge(batch: Batch, data: DeepPartial<Batch>) {
    return this.batchesRepository.merge(batch, data);
  }

  remove(batch: Batch) {
    return this.batchesRepository.remove(batch);
  }
}
