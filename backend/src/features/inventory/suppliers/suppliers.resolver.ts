import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { SuppliersService } from './suppliers.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class SuppliersResolver {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Query(() => GraphQLJSON, { name: 'suppliers' })
  findAll() {
    return this.suppliersService.findAll();
  }

  @Query(() => GraphQLJSON, { name: 'supplier' })
  findOne(
    @Args('supplierId', { type: () => ID }, ParseUUIDPipe) supplierId: string,
  ) {
    return this.suppliersService.findOne(supplierId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createSupplier' })
  async create(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateSupplierDto, input);
    return this.suppliersService.create(dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateSupplier' })
  async update(
    @Args('supplierId', { type: () => ID }, ParseUUIDPipe) supplierId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdateSupplierDto, input);
    return this.suppliersService.update(supplierId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deleteSupplier' })
  remove(
    @Args('supplierId', { type: () => ID }, ParseUUIDPipe) supplierId: string,
  ) {
    return this.suppliersService.remove(supplierId);
  }
}
