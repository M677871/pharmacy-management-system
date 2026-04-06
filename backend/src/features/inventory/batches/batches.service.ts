import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductsRepository } from '../products/products.repository';
import { InventoryRealtimeService } from '../realtime/inventory-realtime.service';
import { toDateOnly } from '../inventory.utils';
import {
  CreateBatchDto,
  ListBatchesQueryDto,
  UpdateBatchDto,
} from './dto/batch.dto';
import { BatchesRepository } from './batches.repository';

@Injectable()
export class BatchesService {
  constructor(
    private readonly batchesRepository: BatchesRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly inventoryRealtimeService: InventoryRealtimeService,
  ) {}

  async findAll(query: ListBatchesQueryDto) {
    const batches = await this.batchesRepository.findAll(query);
    const today = toDateOnly(new Date());

    return batches.map((batch) => ({
      id: batch.id,
      productId: batch.productId,
      productName: batch.product?.name ?? null,
      supplierId: batch.supplierId,
      supplierName: batch.supplier?.name ?? null,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      receivedQuantity: batch.receivedQuantity,
      quantityOnHand: batch.quantityOnHand,
      unitCost: batch.unitCost,
      receivedAt: batch.receivedAt,
      notes: batch.notes,
      isExpired: batch.expiryDate < today,
    }));
  }

  async findByProduct(productId: string) {
    const product = await this.productsRepository.findById(productId);

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const today = toDateOnly(new Date());
    const batches = await this.batchesRepository.findByProductId(productId);

    return batches.map((batch) => ({
      id: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      receivedQuantity: batch.receivedQuantity,
      quantityOnHand: batch.quantityOnHand,
      unitCost: batch.unitCost,
      receivedAt: batch.receivedAt,
      supplierName: batch.supplier?.name ?? null,
      notes: batch.notes,
      isExpired: batch.expiryDate < today,
    }));
  }

  async findOne(id: string) {
    const batch = await this.batchesRepository.findById(id);

    if (!batch) {
      throw new NotFoundException('Batch not found.');
    }

    const today = toDateOnly(new Date());

    return {
      id: batch.id,
      productId: batch.productId,
      productName: batch.product?.name ?? null,
      supplierId: batch.supplierId,
      supplierName: batch.supplier?.name ?? null,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      receivedQuantity: batch.receivedQuantity,
      quantityOnHand: batch.quantityOnHand,
      unitCost: batch.unitCost,
      receivedAt: batch.receivedAt,
      notes: batch.notes,
      isExpired: batch.expiryDate < today,
    };
  }

  create(_dto: CreateBatchDto) {
    throw new BadRequestException(
      'Batches must be created through the purchase receiving workflow.',
    );
  }

  async update(id: string, dto: UpdateBatchDto) {
    const batch = await this.batchesRepository.findById(id);

    if (!batch) {
      throw new NotFoundException('Batch not found.');
    }

    this.batchesRepository.merge(batch, {
      notes: dto.notes === undefined ? batch.notes : dto.notes?.trim() || null,
    });

    const savedBatch = await this.batchesRepository.save(batch);
    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'batch.updated',
      productIds: [savedBatch.productId],
      batchIds: [savedBatch.id],
      relatedEntityId: savedBatch.id,
    });

    return savedBatch;
  }

  remove(_id: string) {
    throw new BadRequestException(
      'Batches are derived from stock workflows and cannot be deleted directly.',
    );
  }
}
