import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { SaleReturn } from './entities/sale-return.entity';

@Injectable()
export class SaleReturnsRepository {
  constructor(
    @InjectRepository(SaleReturn)
    private readonly saleReturnsRepository: Repository<SaleReturn>,
  ) {}

  private repository(manager?: EntityManager) {
    return manager?.getRepository(SaleReturn) ?? this.saleReturnsRepository;
  }

  create(data: DeepPartial<SaleReturn>, manager?: EntityManager) {
    return this.repository(manager).create(data);
  }

  save(saleReturn: SaleReturn, manager?: EntityManager) {
    return this.repository(manager).save(saleReturn);
  }

  findAll(filters: { saleId?: string }) {
    const builder = this.saleReturnsRepository
      .createQueryBuilder('saleReturn')
      .leftJoinAndSelect('saleReturn.sale', 'sale')
      .leftJoinAndSelect('saleReturn.items', 'items')
      .orderBy('saleReturn.returnedAt', 'DESC');

    if (filters.saleId) {
      builder.andWhere('saleReturn.saleId = :saleId', { saleId: filters.saleId });
    }

    return builder.getMany();
  }

  findById(id: string, manager?: EntityManager) {
    return this.repository(manager).findOne({
      where: { id },
      relations: {
        sale: true,
        items: {
          product: true,
          saleItem: true,
        },
      },
    });
  }

  merge(saleReturn: SaleReturn, data: DeepPartial<SaleReturn>) {
    return this.saleReturnsRepository.merge(saleReturn, data);
  }
}
