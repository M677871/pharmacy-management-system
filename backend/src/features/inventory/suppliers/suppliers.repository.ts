import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';

@Injectable()
export class SuppliersRepository {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
  ) {}

  private repository(manager?: EntityManager) {
    return manager?.getRepository(Supplier) ?? this.suppliersRepository;
  }

  create(data: DeepPartial<Supplier>, manager?: EntityManager) {
    return this.repository(manager).create(data);
  }

  save(supplier: Supplier, manager?: EntityManager) {
    return this.repository(manager).save(supplier);
  }

  findAll() {
    return this.suppliersRepository.find({
      order: { name: 'ASC' },
    });
  }

  findById(id: string) {
    return this.suppliersRepository.findOne({ where: { id } });
  }

  findByName(name: string) {
    return this.suppliersRepository
      .createQueryBuilder('supplier')
      .where('LOWER(supplier.name) = LOWER(:name)', { name })
      .getOne();
  }

  merge(supplier: Supplier, data: DeepPartial<Supplier>) {
    return this.suppliersRepository.merge(supplier, data);
  }

  remove(supplier: Supplier) {
    return this.suppliersRepository.remove(supplier);
  }
}
