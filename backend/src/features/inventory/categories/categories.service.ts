import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CategoriesRepository } from './categories.repository';
import { InventoryRealtimeService } from '../realtime/inventory-realtime.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly inventoryRealtimeService: InventoryRealtimeService,
  ) {}

  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim();
    const existing = await this.categoriesRepository.findByName(name);

    if (existing) {
      throw new ConflictException('Category name already exists.');
    }

    const category = this.categoriesRepository.create({
      name,
      description: dto.description?.trim() || null,
    });

    const savedCategory = await this.categoriesRepository.save(category);
    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'category.created',
      relatedEntityId: savedCategory.id,
    });

    return savedCategory;
  }

  findAll() {
    return this.categoriesRepository.findAll();
  }

  async findOne(id: string) {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(id);
    const nextName = dto.name?.trim();

    if (nextName && nextName.toLowerCase() !== category.name.toLowerCase()) {
      const existing = await this.categoriesRepository.findByName(nextName);

      if (existing && existing.id !== category.id) {
        throw new ConflictException('Category name already exists.');
      }
    }

    this.categoriesRepository.merge(category, {
      name: nextName ?? category.name,
      description:
        dto.description === undefined ? category.description : dto.description?.trim() || null,
    });

    const savedCategory = await this.categoriesRepository.save(category);
    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'category.updated',
      relatedEntityId: savedCategory.id,
    });

    return savedCategory;
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    try {
      await this.categoriesRepository.remove(category);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { driverError?: { code?: string } }).driverError
          ?.code === '23503'
      ) {
        throw new ConflictException(
          'Category cannot be deleted while related records still exist.',
        );
      }

      throw error;
    }

    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'category.deleted',
      relatedEntityId: id,
    });

    return { id };
  }
}
