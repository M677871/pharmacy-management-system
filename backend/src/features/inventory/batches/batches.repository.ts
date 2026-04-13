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
    return this.batchesRepository.find({
      where: { productId },
      relations: { supplier: true },
      order: {
        expiryDate: 'ASC',
        receivedAt: 'ASC',
      },
    });
  }

  findAll(query: { productId?: string; includeExpired?: boolean; includeEmpty?: boolean }) {
    const builder = this.batchesRepository
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.product', 'product')
      .leftJoinAndSelect('batch.supplier', 'supplier')
      .orderBy('batch.expiryDate', 'ASC')
      .addOrderBy('batch.receivedAt', 'ASC');

    if (query.productId) {
      builder.andWhere('batch.productId = :productId', { productId: query.productId });
    }

    if (!query.includeEmpty) {
      builder.andWhere('batch.quantityOnHand > 0');
    }

    if (!query.includeExpired) {
      builder.andWhere('batch.expiryDate >= :today', {
        today: new Date().toISOString().slice(0, 10),
      });
    }

    return builder.getMany();
  }

  findByIdentity(
    productId: string,
    batchNumber: string,
    expiryDate: string,
    manager?: EntityManager,
  ) {
    return this.repository(manager).findOne({
      where: {
        productId,
        batchNumber,
        expiryDate,
      },
    });
  }

  findSellableBatches(productId: string, saleDate: string, manager: EntityManager) {
    return this.repository(manager)
      .createQueryBuilder('batch')
      .setLock('pessimistic_write')
      .where('batch.productId = :productId', { productId })
      .andWhere('batch.quantityOnHand > batch.quantityReserved')
      .andWhere('batch.expiryDate >= :saleDate', { saleDate })
      .orderBy('batch.expiryDate', 'ASC')
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
