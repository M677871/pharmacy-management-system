import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { SuppliersRepository } from './suppliers.repository';
import { InventoryRealtimeService } from '../realtime/inventory-realtime.service';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly suppliersRepository: SuppliersRepository,
    private readonly inventoryRealtimeService: InventoryRealtimeService,
  ) {}

  async create(dto: CreateSupplierDto) {
    const name = dto.name.trim();
    const existing = await this.suppliersRepository.findByName(name);

    if (existing) {
      throw new ConflictException('Supplier name already exists.');
    }

    const supplier = this.suppliersRepository.create({
      name,
      contactName: dto.contactName?.trim() || null,
      email: dto.email?.trim() || null,
      phone: dto.phone?.trim() || null,
      address: dto.address?.trim() || null,
    });

    const savedSupplier = await this.suppliersRepository.save(supplier);
    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'supplier.created',
      relatedEntityId: savedSupplier.id,
    });

    return savedSupplier;
  }

  findAll() {
    return this.suppliersRepository.findAll();
  }

  async findOne(id: string) {
    const supplier = await this.suppliersRepository.findById(id);

    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }

    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const supplier = await this.findOne(id);
    const nextName = dto.name?.trim();

    if (nextName && nextName.toLowerCase() !== supplier.name.toLowerCase()) {
      const existing = await this.suppliersRepository.findByName(nextName);

      if (existing && existing.id !== supplier.id) {
        throw new ConflictException('Supplier name already exists.');
      }
    }

    this.suppliersRepository.merge(supplier, {
      name: nextName ?? supplier.name,
      contactName:
        dto.contactName === undefined ? supplier.contactName : dto.contactName?.trim() || null,
      email: dto.email === undefined ? supplier.email : dto.email?.trim() || null,
      phone: dto.phone === undefined ? supplier.phone : dto.phone?.trim() || null,
      address: dto.address === undefined ? supplier.address : dto.address?.trim() || null,
    });

    const savedSupplier = await this.suppliersRepository.save(supplier);
    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'supplier.updated',
      relatedEntityId: savedSupplier.id,
    });

    return savedSupplier;
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);

    try {
      await this.suppliersRepository.remove(supplier);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { driverError?: { code?: string } }).driverError
          ?.code === '23503'
      ) {
        throw new ConflictException(
          'Supplier cannot be deleted while related records still exist.',
        );
      }

      throw error;
    }

    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'supplier.deleted',
      relatedEntityId: id,
    });

    return { id };
  }
}
