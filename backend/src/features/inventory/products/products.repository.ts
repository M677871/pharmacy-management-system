import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  private repository(manager?: EntityManager) {
    return manager?.getRepository(Product) ?? this.productsRepository;
  }

  create(data: DeepPartial<Product>, manager?: EntityManager) {
    return this.repository(manager).create(data);
  }

  save(product: Product, manager?: EntityManager) {
    return this.repository(manager).save(product);
  }

  findById(id: string, manager?: EntityManager) {
    return this.repository(manager).findOne({
      where: { id },
      relations: {
        category: true,
        batches: true,
      },
    });
  }

  findByIds(ids: string[], manager?: EntityManager) {
    return ids.length ? this.repository(manager).findBy({ id: In(ids) }) : [];
  }

  findBySku(sku: string) {
    return this.productsRepository
      .createQueryBuilder('product')
      .where('LOWER(product.sku) = LOWER(:sku)', { sku })
      .getOne();
  }

  findByBarcode(barcode: string) {
    return this.productsRepository.findOne({
      where: { barcode },
    });
  }

  findAll(search?: string, includeInactive?: boolean) {
    const builder = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.batches', 'batch')
      .orderBy('product.name', 'ASC')
      .addOrderBy('batch.expiryDate', 'ASC');

    if (!includeInactive) {
      builder.andWhere('product.isActive = true');
    }

    if (search) {
      builder.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR product.barcode ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    return builder.getMany();
  }

  merge(product: Product, data: DeepPartial<Product>) {
    return this.productsRepository.merge(product, data);
  }

  remove(product: Product) {
    return this.productsRepository.remove(product);
  }
}
