import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import {
  CreatePurchaseItemDto,
  ListPurchaseItemsQueryDto,
  UpdatePurchaseItemDto,
} from './dto/purchase-item.dto';
import { PurchaseItemsService } from './purchase-items.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class PurchaseItemsResolver {
  constructor(private readonly purchaseItemsService: PurchaseItemsService) {}

  @Query(() => GraphQLJSON, { name: 'purchaseItems' })
  async findAll(
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListPurchaseItemsQueryDto, input);
    return this.purchaseItemsService.findAll(query);
  }

  @Query(() => GraphQLJSON, { name: 'purchaseItem' })
  findOne(
    @Args('purchaseItemId', { type: () => ID }, ParseUUIDPipe)
    purchaseItemId: string,
  ) {
    return this.purchaseItemsService.findOne(purchaseItemId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createPurchaseItem' })
  async create(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreatePurchaseItemDto, input);
    return this.purchaseItemsService.create(dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'updatePurchaseItem' })
  async update(
    @Args('purchaseItemId', { type: () => ID }, ParseUUIDPipe)
    purchaseItemId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdatePurchaseItemDto, input);
    return this.purchaseItemsService.update(purchaseItemId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deletePurchaseItem' })
  remove(
    @Args('purchaseItemId', { type: () => ID }, ParseUUIDPipe)
    purchaseItemId: string,
  ) {
    return this.purchaseItemsService.remove(purchaseItemId);
  }
}
