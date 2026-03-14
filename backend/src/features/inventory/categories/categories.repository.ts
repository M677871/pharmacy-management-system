import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  private repository(manager?: EntityManager) {
    return manager?.getRepository(Category) ?? this.categoriesRepository;
  }

  create(data: DeepPartial<Category>, manager?: EntityManager) {
    return this.repository(manager).create(data);
  }

  save(category: Category, manager?: EntityManager) {
    return this.repository(manager).save(category);
  }

  findAll() {
    return this.categoriesRepository.find({
      order: { name: 'ASC' },
    });
  }

  findById(id: string) {
    return this.categoriesRepository.findOne({ where: { id } });
  }

  findByName(name: string) {
    return this.categoriesRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name })
      .getOne();
  }

  merge(category: Category, data: DeepPartial<Category>) {
    return this.categoriesRepository.merge(category, data);
  }

  remove(category: Category) {
    return this.categoriesRepository.remove(category);
  }
}
