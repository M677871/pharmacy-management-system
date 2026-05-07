import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import {
  CreateSaleItemDto,
  ListSaleItemsQueryDto,
  UpdateSaleItemDto,
} from './dto/sale-item.dto';
import { SaleItemsService } from './sale-items.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class SaleItemsResolver {
  constructor(private readonly saleItemsService: SaleItemsService) {}

  @Query(() => GraphQLJSON, { name: 'saleItems' })
  async findAll(
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListSaleItemsQueryDto, input);
    return this.saleItemsService.findAll(query);
  }

  @Query(() => GraphQLJSON, { name: 'saleItem' })
  findOne(
    @Args('saleItemId', { type: () => ID }, ParseUUIDPipe)
    saleItemId: string,
  ) {
    return this.saleItemsService.findOne(saleItemId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createSaleItem' })
  async create(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateSaleItemDto, input);
    return this.saleItemsService.create(dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateSaleItem' })
  async update(
    @Args('saleItemId', { type: () => ID }, ParseUUIDPipe)
    saleItemId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdateSaleItemDto, input);
    return this.saleItemsService.update(saleItemId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deleteSaleItem' })
  remove(
    @Args('saleItemId', { type: () => ID }, ParseUUIDPipe)
    saleItemId: string,
  ) {
    return this.saleItemsService.remove(saleItemId);
  }
}
