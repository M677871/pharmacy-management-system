import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { CheckoutSaleItemDto } from '../dto/sale.dto';
import { Batch } from '../../batches/entities/batch.entity';
import { Product } from '../../products/entities/product.entity';
import { roundCurrency, toDateOnly } from '../../inventory.utils';

export interface BatchAllocation {
  batch: Batch;
  quantity: number;
  unitCost: number;
}

export interface AllocatedSaleItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  allocations: BatchAllocation[];
}

@Injectable()
export class AllocationService {
  async allocateSaleItems(
    manager: EntityManager,
    items: CheckoutSaleItemDto[],
    soldAt: Date,
  ): Promise<AllocatedSaleItem[]> {
    const grouped = this.groupItems(items);
    const productIds = [...grouped.keys()];
    const products = productIds.length
      ? await manager.getRepository(Product).findBy({ id: In(productIds) })
      : [];
    const productsById = new Map(products.map((product) => [product.id, product]));
    const saleDate = toDateOnly(soldAt);
    const results: AllocatedSaleItem[] = [];

    for (const [productId, requested] of grouped) {
      const product = productsById.get(productId);

      if (!product) {
        throw new NotFoundException(`Product ${productId} not found.`);
      }

      if (!product.isActive) {
        throw new BadRequestException(
          `Product "${product.name}" is inactive and cannot be sold.`,
        );
      }

      const batches = await manager
        .getRepository(Batch)
        .createQueryBuilder('batch')
        .setLock('pessimistic_write')
        .where('batch.productId = :productId', { productId })
        .andWhere('batch.quantityOnHand > 0')
        .andWhere('batch.expiryDate >= :saleDate', { saleDate })
        .orderBy('batch.expiryDate', 'ASC')
        .addOrderBy('batch.receivedAt', 'ASC')
        .addOrderBy('batch.createdAt', 'ASC')
        .getMany();

      let remaining = requested.quantity;
      const allocations: BatchAllocation[] = [];

      for (const batch of batches) {
        if (remaining <= 0) {
          break;
        }

        const allocatedQuantity = Math.min(batch.quantityOnHand, remaining);
        if (allocatedQuantity <= 0) {
          continue;
        }

        allocations.push({
          batch,
          quantity: allocatedQuantity,
          unitCost: batch.unitCost,
        });
        remaining -= allocatedQuantity;
      }

      if (remaining > 0) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Requested ${requested.quantity}, available ${
            requested.quantity - remaining
          }.`,
        );
      }

      const unitPrice = requested.unitPrice ?? product.salePrice;

      results.push({
        product,
        quantity: requested.quantity,
        unitPrice,
        lineTotal: roundCurrency(unitPrice * requested.quantity),
        allocations,
      });
    }

    return results;
  }

  private groupItems(items: CheckoutSaleItemDto[]) {
    const grouped = new Map<
      string,
      { quantity: number; unitPrice: number | undefined }
    >();

    for (const item of items) {
      const existing = grouped.get(item.productId);
      if (!existing) {
        grouped.set(item.productId, {
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
        continue;
      }

      if (
        existing.unitPrice !== undefined &&
        item.unitPrice !== undefined &&
        existing.unitPrice !== item.unitPrice
      ) {
        throw new BadRequestException(
          `Multiple prices were provided for product ${item.productId}.`,
        );
      }

      grouped.set(item.productId, {
        quantity: existing.quantity + item.quantity,
        unitPrice: existing.unitPrice ?? item.unitPrice,
      });
    }

    return grouped;
  }
}
