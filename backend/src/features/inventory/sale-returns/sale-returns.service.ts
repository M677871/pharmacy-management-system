import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BatchesRepository } from '../batches/batches.repository';
import { ReturnItemsRepository } from '../return-items/return-items.repository';
import { SalesRepository } from '../sales/sales.repository';
import { StockMovementsRepository } from '../stock-movements/stock-movements.repository';
import { InventoryRealtimeService } from '../realtime/inventory-realtime.service';
import {
  StockMovementReferenceType,
  StockMovementType,
} from '../inventory.enums';
import { normalizeDate, roundCurrency } from '../inventory.utils';
import {
  CreateReturnDto,
  ListReturnsQueryDto,
  UpdateReturnDto,
} from './dto/return.dto';
import { SaleReturnsRepository } from './sale-returns.repository';

@Injectable()
export class SaleReturnsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly saleReturnsRepository: SaleReturnsRepository,
    private readonly salesRepository: SalesRepository,
    private readonly returnItemsRepository: ReturnItemsRepository,
    private readonly batchesRepository: BatchesRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly inventoryRealtimeService: InventoryRealtimeService,
  ) {}

  create(dto: CreateReturnDto, userId: string) {
    return this.createReturn(dto, userId);
  }

  async findAll(query: ListReturnsQueryDto) {
    const saleReturns = await this.saleReturnsRepository.findAll(query);

    return saleReturns.map((saleReturn) => ({
      id: saleReturn.id,
      saleId: saleReturn.saleId,
      returnedAt: saleReturn.returnedAt,
      reason: saleReturn.reason,
      totalRefund: saleReturn.totalRefund,
      itemCount: saleReturn.items.length,
    }));
  }

  async findOne(id: string) {
    const saleReturn = await this.saleReturnsRepository.findById(id);

    if (!saleReturn) {
      throw new NotFoundException('Return not found.');
    }

    return {
      id: saleReturn.id,
      saleId: saleReturn.saleId,
      returnedAt: saleReturn.returnedAt,
      reason: saleReturn.reason,
      totalRefund: saleReturn.totalRefund,
      items: saleReturn.items.map((item) => ({
        id: item.id,
        saleItemId: item.saleItemId,
        productId: item.productId,
        productName: item.product?.name ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    };
  }

  async update(id: string, dto: UpdateReturnDto) {
    const saleReturn = await this.saleReturnsRepository.findById(id);

    if (!saleReturn) {
      throw new NotFoundException('Return not found.');
    }

    this.saleReturnsRepository.merge(saleReturn, {
      reason: dto.reason === undefined ? saleReturn.reason : dto.reason?.trim() || null,
      returnedAt: dto.returnedAt ? normalizeDate(dto.returnedAt) : saleReturn.returnedAt,
    });

    return this.saleReturnsRepository.save(saleReturn);
  }

  remove(_id: string) {
    throw new BadRequestException(
      'Returns cannot be deleted directly. Stock must remain ledger-backed.',
    );
  }

  async createReturn(dto: CreateReturnDto, userId: string) {
    const sale = await this.salesRepository.findById(dto.saleId);

    if (!sale) {
      throw new NotFoundException('Sale not found.');
    }

    const productIds = [...new Set(sale.items.map((item) => item.productId))];
    const [previousProductStates, previousBatchStates] = await Promise.all([
      this.inventoryRealtimeService.captureProductStates(productIds),
      this.inventoryRealtimeService.captureBatchStatesForProducts(productIds),
    ]);

    const receipt = await this.dataSource.transaction(async (manager) => {
      const sale = await this.salesRepository.findById(dto.saleId, manager);

      if (!sale) {
        throw new NotFoundException('Sale not found.');
      }

      const requestedItems = this.groupRequestedItems(dto);
      const requestedSaleItemIds = [...requestedItems.keys()];

      for (const saleItemId of requestedSaleItemIds) {
        if (!sale.items.some((item) => item.id === saleItemId)) {
          throw new BadRequestException(
            `Sale item ${saleItemId} does not belong to sale ${sale.id}.`,
          );
        }
      }

      const existingReturnItems = await this.returnItemsRepository.findBySaleItemIds(
        requestedSaleItemIds,
        manager,
      );
      const existingReturnMovements =
        await this.stockMovementsRepository.findReturnMovementsBySaleItemIds(
          requestedSaleItemIds,
          manager,
        );

      const returnedBySaleItem = new Map<string, number>();
      for (const returnItem of existingReturnItems) {
        returnedBySaleItem.set(
          returnItem.saleItemId,
          (returnedBySaleItem.get(returnItem.saleItemId) ?? 0) + returnItem.quantity,
        );
      }

      const returnedBySaleItemBatch = new Map<string, number>();
      for (const movement of existingReturnMovements) {
        if (!movement.saleItemId || !movement.batchId) {
          continue;
        }

        const key = `${movement.saleItemId}:${movement.batchId}`;
        returnedBySaleItemBatch.set(
          key,
          (returnedBySaleItemBatch.get(key) ?? 0) + movement.quantity,
        );
      }

      const returnedAt = normalizeDate(dto.returnedAt);
      let returnTransaction = this.saleReturnsRepository.create(
        {
          saleId: sale.id,
          processedById: userId,
          reason: dto.reason?.trim() || null,
          returnedAt,
          totalRefund: 0,
        },
        manager,
      );

      returnTransaction = await this.saleReturnsRepository.save(
        returnTransaction,
        manager,
      );

      let totalRefund = 0;
      const responseItems: Array<Record<string, unknown>> = [];

      for (const saleItem of sale.items
        .filter((item) => requestedItems.has(item.id))
        .sort((left, right) => left.product.name.localeCompare(right.product.name))) {
        const requestedQuantity = requestedItems.get(saleItem.id) as number;
        const previouslyReturned = returnedBySaleItem.get(saleItem.id) ?? 0;
        const remainingReturnable = saleItem.quantity - previouslyReturned;

        if (requestedQuantity > remainingReturnable) {
          throw new BadRequestException(
            `Cannot return ${requestedQuantity} units of "${saleItem.product.name}". Only ${remainingReturnable} units remain returnable.`,
          );
        }

        const lineTotal = roundCurrency(saleItem.unitPrice * requestedQuantity);
        const returnItem = await this.returnItemsRepository.save(
          this.returnItemsRepository.create(
            {
              returnId: returnTransaction.id,
              saleItemId: saleItem.id,
              productId: saleItem.productId,
              quantity: requestedQuantity,
              unitPrice: saleItem.unitPrice,
              lineTotal,
            },
            manager,
          ),
          manager,
        );

        totalRefund += lineTotal;
        let remainingToRestock = requestedQuantity;
        const restockedAllocations: Array<Record<string, unknown>> = [];

        for (const allocation of saleItem.allocations
          .slice()
          .sort((left, right) =>
            left.batch.expiryDate.localeCompare(right.batch.expiryDate),
          )) {
          if (remainingToRestock <= 0) {
            break;
          }

          const key = `${saleItem.id}:${allocation.batchId}`;
          const alreadyReturnedFromBatch = returnedBySaleItemBatch.get(key) ?? 0;
          const returnableFromBatch = allocation.quantity - alreadyReturnedFromBatch;

          if (returnableFromBatch <= 0) {
            continue;
          }

          const quantityToRestock = Math.min(
            remainingToRestock,
            returnableFromBatch,
          );
          allocation.batch.quantityOnHand += quantityToRestock;
          await this.batchesRepository.save(allocation.batch, manager);

          await this.stockMovementsRepository.save(
            this.stockMovementsRepository.create(
              {
                movementType: StockMovementType.STOCK_IN,
                referenceType: StockMovementReferenceType.RETURN,
                productId: saleItem.productId,
                batchId: allocation.batchId,
                purchaseId: null,
                purchaseItemId: null,
                saleId: sale.id,
                saleItemId: saleItem.id,
                returnId: returnTransaction.id,
                returnItemId: returnItem.id,
                quantity: quantityToRestock,
                unitCost: allocation.unitCost,
                unitPrice: saleItem.unitPrice,
                occurredAt: returnedAt,
                note: dto.reason?.trim() || null,
              },
              manager,
            ),
            manager,
          );

          returnedBySaleItemBatch.set(
            key,
            alreadyReturnedFromBatch + quantityToRestock,
          );
          remainingToRestock -= quantityToRestock;
          restockedAllocations.push({
            batchId: allocation.batchId,
            batchNumber: allocation.batch.batchNumber,
            expiryDate: allocation.batch.expiryDate,
            quantity: quantityToRestock,
          });
        }

        if (remainingToRestock > 0) {
          throw new BadRequestException(
            `Return for "${saleItem.product.name}" exceeds the sold batch allocations.`,
          );
        }

        responseItems.push({
          id: returnItem.id,
          saleItemId: saleItem.id,
          productId: saleItem.productId,
          productName: saleItem.product.name,
          quantity: returnItem.quantity,
          unitPrice: returnItem.unitPrice,
          lineTotal: returnItem.lineTotal,
          allocations: restockedAllocations,
        });
      }

      returnTransaction.totalRefund = roundCurrency(totalRefund);
      returnTransaction = await this.saleReturnsRepository.save(
        returnTransaction,
        manager,
      );

      return {
        id: returnTransaction.id,
        saleId: sale.id,
        returnedAt: returnTransaction.returnedAt,
        reason: returnTransaction.reason,
        totalRefund: returnTransaction.totalRefund,
        items: responseItems,
      };
    });

    const batchIds = receipt.items
      .flatMap((item) => {
        const allocations = item.allocations;
        return Array.isArray(allocations)
          ? allocations
              .map((allocation) =>
                typeof allocation.batchId === 'string' ? allocation.batchId : '',
              )
              .filter(Boolean)
          : [];
      })
      .filter(Boolean);

    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'return.completed',
      productIds,
      batchIds,
      relatedEntityId: receipt.id,
      actorUserId: userId,
      previousProductStates,
      previousBatchStates,
    });

    return receipt;
  }

  private groupRequestedItems(dto: CreateReturnDto) {
    const grouped = new Map<string, number>();

    for (const item of dto.items) {
      grouped.set(item.saleItemId, (grouped.get(item.saleItemId) ?? 0) + item.quantity);
    }

    return grouped;
  }
}
