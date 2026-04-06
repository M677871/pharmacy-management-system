import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BatchesRepository } from '../batches/batches.repository';
import { ReturnItemsRepository } from '../return-items/return-items.repository';
import { SaleItemAllocationsRepository } from '../sale-item-allocations/sale-item-allocations.repository';
import { SaleItemsRepository } from '../sale-items/sale-items.repository';
import { StockMovementsRepository } from '../stock-movements/stock-movements.repository';
import { InventoryRealtimeService } from '../realtime/inventory-realtime.service';
import { AllocationService } from './services/allocation.service';
import {
  CheckoutSaleDto,
  ListSalesQueryDto,
  UpdateSaleDto,
} from './dto/sale.dto';
import {
  StockMovementReferenceType,
  StockMovementType,
} from '../inventory.enums';
import { normalizeDate, roundCurrency } from '../inventory.utils';
import { SalesRepository } from './sales.repository';

@Injectable()
export class SalesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly allocationService: AllocationService,
    private readonly salesRepository: SalesRepository,
    private readonly saleItemsRepository: SaleItemsRepository,
    private readonly saleItemAllocationsRepository: SaleItemAllocationsRepository,
    private readonly batchesRepository: BatchesRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly returnItemsRepository: ReturnItemsRepository,
    private readonly inventoryRealtimeService: InventoryRealtimeService,
  ) {}

  create(dto: CheckoutSaleDto, userId: string) {
    return this.checkout(dto, userId);
  }

  async findAll(query: ListSalesQueryDto) {
    const sales = await this.salesRepository.findAll(query);

    return sales.map((sale) => ({
      id: sale.id,
      soldAt: sale.soldAt,
      notes: sale.notes,
      totalAmount: sale.totalAmount,
      itemCount: sale.items.length,
    }));
  }

  async findOne(id: string) {
    return this.getSaleById(id);
  }

  async update(id: string, dto: UpdateSaleDto) {
    const sale = await this.salesRepository.findById(id);

    if (!sale) {
      throw new NotFoundException('Sale not found.');
    }

    this.salesRepository.merge(sale, {
      notes: dto.notes === undefined ? sale.notes : dto.notes?.trim() || null,
      soldAt: dto.soldAt ? normalizeDate(dto.soldAt) : sale.soldAt,
    });

    return this.salesRepository.save(sale);
  }

  remove(_id: string) {
    throw new BadRequestException(
      'Sales cannot be deleted directly. Stock must remain ledger-backed.',
    );
  }

  async checkout(dto: CheckoutSaleDto, userId: string) {
    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const [previousProductStates, previousBatchStates] = await Promise.all([
      this.inventoryRealtimeService.captureProductStates(productIds),
      this.inventoryRealtimeService.captureBatchStatesForProducts(productIds),
    ]);

    const saleId = await this.dataSource.transaction(async (manager) => {
      const soldAt = normalizeDate(dto.soldAt);
      const allocatedItems = await this.allocationService.allocateSaleItems(
        manager,
        dto.items,
        soldAt,
      );

      let sale = this.salesRepository.create({
        soldById: userId,
        notes: dto.notes?.trim() || null,
        soldAt,
        totalAmount: 0,
      }, manager);

      sale = await this.salesRepository.save(sale, manager);

      let totalAmount = 0;

      for (const item of allocatedItems) {
        const saleItem = await this.saleItemsRepository.save(
          this.saleItemsRepository.create({
            saleId: sale.id,
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: roundCurrency(item.unitPrice),
            lineTotal: item.lineTotal,
          }, manager),
          manager,
        );

        totalAmount += saleItem.lineTotal;

        for (const allocation of item.allocations) {
          allocation.batch.quantityOnHand -= allocation.quantity;
          await this.batchesRepository.save(allocation.batch, manager);

          await this.saleItemAllocationsRepository.save(
            this.saleItemAllocationsRepository.create({
              saleItemId: saleItem.id,
              batchId: allocation.batch.id,
              quantity: allocation.quantity,
              unitCost: allocation.unitCost,
            }, manager),
            manager,
          );

          await this.stockMovementsRepository.save(
            this.stockMovementsRepository.create({
              movementType: StockMovementType.STOCK_OUT,
              referenceType: StockMovementReferenceType.SALE,
              productId: item.product.id,
              batchId: allocation.batch.id,
              purchaseId: null,
              purchaseItemId: null,
              saleId: sale.id,
              saleItemId: saleItem.id,
              returnId: null,
              returnItemId: null,
              quantity: allocation.quantity,
              unitCost: allocation.unitCost,
              unitPrice: saleItem.unitPrice,
              occurredAt: soldAt,
              note: dto.notes?.trim() || null,
            }, manager),
            manager,
          );
        }
      }

      sale.totalAmount = roundCurrency(totalAmount);
      await this.salesRepository.save(sale, manager);

      return sale.id;
    });

    const sale = await this.getSaleById(saleId);
    const batchIds = sale.items
      .flatMap((item) => item.allocations.map((allocation) => allocation.batchId))
      .filter(Boolean);

    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'sale.completed',
      productIds,
      batchIds,
      relatedEntityId: sale.id,
      actorUserId: userId,
      previousProductStates,
      previousBatchStates,
    });

    return sale;
  }

  async getSaleById(saleId: string) {
    const sale = await this.salesRepository.findById(saleId);

    if (!sale) {
      throw new NotFoundException('Sale not found.');
    }

    const saleItemIds = sale.items.map((item) => item.id);
    const returnItems = await this.returnItemsRepository.findBySaleItemIds(saleItemIds);

    const returnedBySaleItem = new Map<string, number>();
    for (const returnItem of returnItems) {
      returnedBySaleItem.set(
        returnItem.saleItemId,
        (returnedBySaleItem.get(returnItem.saleItemId) ?? 0) + returnItem.quantity,
      );
    }

    return {
      id: sale.id,
      soldAt: sale.soldAt,
      notes: sale.notes,
      totalAmount: sale.totalAmount,
      items: sale.items
        .slice()
        .sort((left, right) => left.product.name.localeCompare(right.product.name))
        .map((item) => {
          const returnedQuantity = returnedBySaleItem.get(item.id) ?? 0;

          return {
            id: item.id,
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            quantity: item.quantity,
            returnedQuantity,
            remainingReturnable: item.quantity - returnedQuantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            allocations: item.allocations
              .slice()
              .sort((left, right) =>
                left.batch.expiryDate.localeCompare(right.batch.expiryDate),
              )
              .map((allocation) => ({
                batchId: allocation.batchId,
                batchNumber: allocation.batch.batchNumber,
                expiryDate: allocation.batch.expiryDate,
                quantity: allocation.quantity,
            })),
          };
        }),
    };
  }
}
