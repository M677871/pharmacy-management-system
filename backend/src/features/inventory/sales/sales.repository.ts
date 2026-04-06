import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { Sale } from './entities/sale.entity';

@Injectable()
export class SalesRepository {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
  ) {}

  private repository(manager?: EntityManager) {
    return manager?.getRepository(Sale) ?? this.salesRepository;
  }

  create(data: DeepPartial<Sale>, manager?: EntityManager) {
    return this.repository(manager).create(data);
  }

  save(sale: Sale, manager?: EntityManager) {
    return this.repository(manager).save(sale);
  }

  findAll(filters: { soldById?: string }) {
    const builder = this.salesRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .orderBy('sale.soldAt', 'DESC');

    if (filters.soldById) {
      builder.andWhere('sale.soldById = :soldById', { soldById: filters.soldById });
    }

    return builder.getMany();
  }

  findById(id: string, manager?: EntityManager) {
    return this.repository(manager).findOne({
      where: { id },
      relations: {
        items: {
          product: true,
          allocations: {
            batch: true,
          },
        },
      },
    });
  }

  merge(sale: Sale, data: DeepPartial<Sale>) {
    return this.salesRepository.merge(sale, data);
  }
}
