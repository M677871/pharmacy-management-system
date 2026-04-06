import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { BatchesRepository } from '../batches/batches.repository';
import { ProductsRepository } from '../products/products.repository';
import { PurchaseItemsRepository } from '../purchase-items/purchase-items.repository';
import { StockMovementsRepository } from '../stock-movements/stock-movements.repository';
import { SuppliersRepository } from '../suppliers/suppliers.repository';
import { InventoryRealtimeService } from '../realtime/inventory-realtime.service';
import {
  StockMovementReferenceType,
  StockMovementType,
} from '../inventory.enums';
import { normalizeDate, roundCurrency } from '../inventory.utils';
import {
  ListPurchasesQueryDto,
  ReceivePurchaseDto,
  UpdatePurchaseDto,
} from './dto/purchase.dto';
import { Purchase } from './entities/purchase.entity';
import { PurchasesRepository } from './purchases.repository';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly purchasesRepository: PurchasesRepository,
    private readonly suppliersRepository: SuppliersRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly purchaseItemsRepository: PurchaseItemsRepository,
    private readonly batchesRepository: BatchesRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly inventoryRealtimeService: InventoryRealtimeService,
  ) {}

  create(dto: ReceivePurchaseDto, userId: string) {
    return this.receiveStock(dto, userId);
  }

  async findAll(query: ListPurchasesQueryDto) {
    const purchases = await this.purchasesRepository.findAll(query);

    return purchases.map((purchase) => ({
      id: purchase.id,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplier?.name ?? null,
      invoiceNumber: purchase.invoiceNumber,
      notes: purchase.notes,
      receivedAt: purchase.receivedAt,
      totalCost: purchase.totalCost,
      itemCount: purchase.items.length,
    }));
  }

  async findOne(id: string) {
    const purchase = await this.purchasesRepository.findById(id);

    if (!purchase) {
      throw new NotFoundException('Purchase not found.');
    }

    return {
      id: purchase.id,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplier?.name ?? null,
      invoiceNumber: purchase.invoiceNumber,
      notes: purchase.notes,
      receivedAt: purchase.receivedAt,
      totalCost: purchase.totalCost,
      items: purchase.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name ?? null,
        batchId: item.batchId,
        batchNumber: item.batch?.batchNumber ?? null,
        expiryDate: item.batch?.expiryDate ?? null,
        quantity: item.quantity,
        unitCost: item.unitCost,
        lineTotal: item.lineTotal,
      })),
    };
  }

  async update(id: string, dto: UpdatePurchaseDto) {
    const purchase = await this.purchasesRepository.findById(id);

    if (!purchase) {
      throw new NotFoundException('Purchase not found.');
    }

    this.purchasesRepository.merge(purchase, {
      invoiceNumber:
        dto.invoiceNumber === undefined ? purchase.invoiceNumber : dto.invoiceNumber?.trim() || null,
      notes: dto.notes === undefined ? purchase.notes : dto.notes?.trim() || null,
      receivedAt: dto.receivedAt ? normalizeDate(dto.receivedAt) : purchase.receivedAt,
    });

    return this.purchasesRepository.save(purchase);
  }

  remove(_id: string) {
    throw new BadRequestException(
      'Purchases cannot be deleted directly. Stock must remain ledger-backed.',
    );
  }

  async receiveStock(dto: ReceivePurchaseDto, userId: string) {
    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const [previousProductStates, previousBatchStates] = await Promise.all([
      this.inventoryRealtimeService.captureProductStates(productIds),
      this.inventoryRealtimeService.captureBatchStatesForProducts(productIds),
    ]);

    const receipt = await this.dataSource.transaction(async (manager) => {
      const supplier = await this.suppliersRepository.findById(dto.supplierId);

      if (!supplier) {
        throw new NotFoundException('Supplier not found.');
      }

      const receivedAt = normalizeDate(dto.receivedAt);
      const products = productIds.length
        ? await this.productsRepository.findByIds(productIds, manager)
        : [];
      const productsById = new Map(products.map((product) => [product.id, product]));

      for (const item of dto.items) {
        if (!productsById.has(item.productId)) {
          throw new NotFoundException(`Product ${item.productId} not found.`);
        }
      }

      let purchase = this.purchasesRepository.create({
        supplierId: supplier.id,
        receivedById: userId,
        invoiceNumber: dto.invoiceNumber?.trim() || null,
        notes: dto.notes?.trim() || null,
        receivedAt,
        totalCost: 0,
      }, manager);

      purchase = await this.purchasesRepository.save(purchase, manager);

      const responseItems: Array<Record<string, unknown>> = [];
      let totalCost = 0;

      for (const item of dto.items) {
        const batchNumber = item.batchNumber.trim();
        const expiryDate = item.expiryDate.slice(0, 10);

        let batch = await this.batchesRepository.findByIdentity(
          item.productId,
          batchNumber,
          expiryDate,
          manager,
        );

        if (!batch) {
          batch = this.batchesRepository.create({
            productId: item.productId,
            supplierId: supplier.id,
            batchNumber,
            expiryDate,
            receivedQuantity: 0,
            quantityOnHand: 0,
            unitCost: roundCurrency(item.unitCost),
            receivedAt,
            notes: item.notes?.trim() || null,
          }, manager);
        }

        batch.receivedQuantity += item.quantity;
        batch.quantityOnHand += item.quantity;
        batch.unitCost = roundCurrency(item.unitCost);
        batch.supplierId = supplier.id;
        batch = await this.batchesRepository.save(batch, manager);

        const product = productsById.get(item.productId);
        const lineTotal = roundCurrency(item.quantity * item.unitCost);

        let purchaseItem = this.purchaseItemsRepository.create({
          purchaseId: purchase.id,
          productId: item.productId,
          batchId: batch.id,
          quantity: item.quantity,
          unitCost: roundCurrency(item.unitCost),
          lineTotal,
        }, manager);

        purchaseItem = await this.purchaseItemsRepository.save(purchaseItem, manager);

        await this.stockMovementsRepository.save(
          this.stockMovementsRepository.create({
            movementType: StockMovementType.STOCK_IN,
            referenceType: StockMovementReferenceType.PURCHASE,
            productId: item.productId,
            batchId: batch.id,
            purchaseId: purchase.id,
            purchaseItemId: purchaseItem.id,
            saleId: null,
            saleItemId: null,
            returnId: null,
            returnItemId: null,
            quantity: item.quantity,
            unitCost: roundCurrency(item.unitCost),
            unitPrice: null,
            occurredAt: receivedAt,
            note: item.notes?.trim() || null,
          }, manager),
          manager,
        );

        totalCost += lineTotal;
        responseItems.push({
          id: purchaseItem.id,
          productId: product?.id ?? item.productId,
          productName: product?.name ?? null,
          quantity: purchaseItem.quantity,
          unitCost: purchaseItem.unitCost,
          lineTotal: purchaseItem.lineTotal,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          quantityOnHand: batch.quantityOnHand,
        });
      }

      purchase.totalCost = roundCurrency(totalCost);
      purchase = await this.purchasesRepository.save(purchase, manager);

      return {
        id: purchase.id,
        supplierId: supplier.id,
        supplierName: supplier.name,
        invoiceNumber: purchase.invoiceNumber,
        notes: purchase.notes,
        receivedAt: purchase.receivedAt,
        totalCost: purchase.totalCost,
        items: responseItems,
      };
    });

    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'purchase.received',
      productIds,
      batchIds: receipt.items
        .map((item) => {
          const batchId = item.batchId;
          return typeof batchId === 'string' ? batchId : '';
        })
        .filter(Boolean),
      relatedEntityId: receipt.id,
      actorUserId: userId,
      previousProductStates,
      previousBatchStates,
    });

    return receipt;
  }
}
