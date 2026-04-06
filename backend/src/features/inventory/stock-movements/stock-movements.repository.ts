import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, In, Repository } from 'typeorm';
import {
  StockMovementReferenceType,
  StockMovementType,
} from '../inventory.enums';
import { StockMovement } from './entities/stock-movement.entity';

@Injectable()
export class StockMovementsRepository {
  constructor(
    @InjectRepository(StockMovement)
    private readonly stockMovementsRepository: Repository<StockMovement>,
  ) {}

  private repository(manager?: EntityManager) {
    return manager?.getRepository(StockMovement) ?? this.stockMovementsRepository;
  }

  create(data: DeepPartial<StockMovement>, manager?: EntityManager) {
    return this.repository(manager).create(data);
  }

  save(stockMovement: StockMovement, manager?: EntityManager) {
    return this.repository(manager).save(stockMovement);
  }

  findAll(filters: {
    productId?: string;
    batchId?: string;
    purchaseId?: string;
    saleId?: string;
    returnId?: string;
    movementType?: StockMovementType;
    referenceType?: StockMovementReferenceType;
  }) {
    const builder = this.stockMovementsRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .leftJoinAndSelect('movement.batch', 'batch')
      .orderBy('movement.occurredAt', 'DESC')
      .addOrderBy('movement.createdAt', 'DESC');

    if (filters.productId) {
      builder.andWhere('movement.productId = :productId', {
        productId: filters.productId,
      });
    }

    if (filters.batchId) {
      builder.andWhere('movement.batchId = :batchId', { batchId: filters.batchId });
    }

    if (filters.purchaseId) {
      builder.andWhere('movement.purchaseId = :purchaseId', {
        purchaseId: filters.purchaseId,
      });
    }

    if (filters.saleId) {
      builder.andWhere('movement.saleId = :saleId', { saleId: filters.saleId });
    }

    if (filters.returnId) {
      builder.andWhere('movement.returnId = :returnId', { returnId: filters.returnId });
    }

    if (filters.movementType) {
      builder.andWhere('movement.movementType = :movementType', {
        movementType: filters.movementType,
      });
    }

    if (filters.referenceType) {
      builder.andWhere('movement.referenceType = :referenceType', {
        referenceType: filters.referenceType,
      });
    }

    return builder.getMany();
  }

  findById(id: string) {
    return this.stockMovementsRepository.findOne({
      where: { id },
      relations: {
        product: true,
        batch: true,
      },
    });
  }

  findReturnMovementsBySaleItemIds(saleItemIds: string[], manager?: EntityManager) {
    return saleItemIds.length
      ? this.repository(manager).find({
          where: {
            saleItemId: In(saleItemIds),
            movementType: StockMovementType.STOCK_IN,
            referenceType: StockMovementReferenceType.RETURN,
          },
        })
      : [];
  }
}
