import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import {
  CreateSaleItemAllocationDto,
  ListSaleItemAllocationsQueryDto,
  UpdateSaleItemAllocationDto,
} from './dto/sale-item-allocation.dto';
import { SaleItemAllocationsService } from './sale-item-allocations.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class SaleItemAllocationsResolver {
  constructor(
    private readonly saleItemAllocationsService: SaleItemAllocationsService,
  ) {}

  @Query(() => GraphQLJSON, { name: 'saleItemAllocations' })
  async findAll(
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListSaleItemAllocationsQueryDto, input);
    return this.saleItemAllocationsService.findAll(query);
  }

  @Query(() => GraphQLJSON, { name: 'saleItemAllocation' })
  findOne(
    @Args('saleItemAllocationId', { type: () => ID }, ParseUUIDPipe)
    saleItemAllocationId: string,
  ) {
    return this.saleItemAllocationsService.findOne(saleItemAllocationId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createSaleItemAllocation' })
  async create(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateSaleItemAllocationDto, input);
    return this.saleItemAllocationsService.create(dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateSaleItemAllocation' })
  async update(
    @Args('saleItemAllocationId', { type: () => ID }, ParseUUIDPipe)
    saleItemAllocationId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdateSaleItemAllocationDto, input);
    return this.saleItemAllocationsService.update(saleItemAllocationId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deleteSaleItemAllocation' })
  remove(
    @Args('saleItemAllocationId', { type: () => ID }, ParseUUIDPipe)
    saleItemAllocationId: string,
  ) {
    return this.saleItemAllocationsService.remove(saleItemAllocationId);
  }
}
