import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CategoriesRepository } from '../categories/categories.repository';
import { roundCurrency, toDateOnly } from '../inventory.utils';
import { InventoryRealtimeService } from '../realtime/inventory-realtime.service';
import {
  CreateProductDto,
  ListProductsQueryDto,
  UpdateProductDto,
} from './dto/product.dto';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly inventoryRealtimeService: InventoryRealtimeService,
  ) {}

  async create(dto: CreateProductDto) {
    const sku = dto.sku.trim();
    const barcode = dto.barcode?.trim() || null;

    await this.ensureSkuAvailable(sku);
    await this.ensureBarcodeAvailable(barcode);
    await this.ensureCategoryExists(dto.categoryId || null);

    const product = this.productsRepository.create({
      sku,
      name: dto.name.trim(),
      barcode,
      description: dto.description?.trim() || null,
      unit: dto.unit?.trim() || 'unit',
      salePrice: roundCurrency(dto.salePrice),
      categoryId: dto.categoryId || null,
      isActive: true,
    });

    const savedProduct = await this.productsRepository.save(product);
    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'product.created',
      productIds: [savedProduct.id],
      relatedEntityId: savedProduct.id,
    });

    return savedProduct;
  }

  async findAll(query: ListProductsQueryDto) {
    const products = await this.productsRepository.findAll(
      query.search?.trim(),
      query.includeInactive,
    );
    const today = toDateOnly(new Date());

    return products.map((product) => {
      const activeBatches = product.batches.filter(
        (batch) => batch.quantityOnHand > 0,
      );
      const sellableBatches = activeBatches.filter(
        (batch) => batch.expiryDate >= today,
      );

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        barcode: product.barcode,
        unit: product.unit,
        description: product.description,
        salePrice: product.salePrice,
        isActive: product.isActive,
        categoryId: product.categoryId,
        categoryName: product.category?.name ?? null,
        availableQuantity: sellableBatches.reduce(
          (sum, batch) => sum + batch.quantityOnHand,
          0,
        ),
        totalOnHand: activeBatches.reduce(
          (sum, batch) => sum + batch.quantityOnHand,
          0,
        ),
        nextExpiry: sellableBatches[0]?.expiryDate ?? null,
      };
    });
  }

  async findOne(id: string) {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const today = toDateOnly(new Date());
    const activeBatches = product.batches.filter((batch) => batch.quantityOnHand > 0);
    const sellableBatches = activeBatches.filter((batch) => batch.expiryDate >= today);

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      barcode: product.barcode,
      description: product.description,
      unit: product.unit,
      salePrice: product.salePrice,
      isActive: product.isActive,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      availableQuantity: sellableBatches.reduce(
        (sum, batch) => sum + batch.quantityOnHand,
        0,
      ),
      totalOnHand: activeBatches.reduce(
        (sum, batch) => sum + batch.quantityOnHand,
        0,
      ),
      nextExpiry: sellableBatches[0]?.expiryDate ?? null,
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const nextSku = dto.sku?.trim();
    const nextBarcode =
      dto.barcode === undefined ? product.barcode : dto.barcode?.trim() || null;

    if (nextSku && nextSku.toLowerCase() !== product.sku.toLowerCase()) {
      await this.ensureSkuAvailable(nextSku, product.id);
    }

    if (nextBarcode !== product.barcode) {
      await this.ensureBarcodeAvailable(nextBarcode, product.id);
    }

    if (dto.categoryId !== undefined) {
      await this.ensureCategoryExists(dto.categoryId || null);
    }

    this.productsRepository.merge(product, {
      sku: nextSku ?? product.sku,
      name: dto.name?.trim() ?? product.name,
      barcode: nextBarcode,
      description:
        dto.description === undefined ? product.description : dto.description?.trim() || null,
      unit: dto.unit?.trim() ?? product.unit,
      salePrice:
        dto.salePrice === undefined ? product.salePrice : roundCurrency(dto.salePrice),
      categoryId: dto.categoryId === undefined ? product.categoryId : dto.categoryId || null,
      isActive: dto.isActive ?? product.isActive,
    });

    const savedProduct = await this.productsRepository.save(product);
    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'product.updated',
      productIds: [savedProduct.id],
      relatedEntityId: savedProduct.id,
    });

    return savedProduct;
  }

  async remove(id: string) {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    try {
      await this.productsRepository.remove(product);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { driverError?: { code?: string } }).driverError
          ?.code === '23503'
      ) {
        throw new ConflictException(
          'Product cannot be deleted while related stock or transactions still exist.',
        );
      }

      throw error;
    }

    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'product.deleted',
      productIds: [id],
      relatedEntityId: id,
    });

    return { id };
  }

  private async ensureSkuAvailable(sku: string, ignoreId?: string) {
    const existing = await this.productsRepository.findBySku(sku);

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Product SKU already exists.');
    }
  }

  private async ensureBarcodeAvailable(barcode: string | null, ignoreId?: string) {
    if (!barcode) {
      return;
    }

    const existing = await this.productsRepository.findByBarcode(barcode);

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Product barcode already exists.');
    }
  }

  private async ensureCategoryExists(categoryId: string | null) {
    if (!categoryId) {
      return;
    }

    const category = await this.categoriesRepository.findById(categoryId);

    if (!category) {
      throw new NotFoundException('Category not found.');
    }
  }
}
