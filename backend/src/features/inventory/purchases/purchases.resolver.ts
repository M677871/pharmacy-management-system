import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { User, UserRole } from '../../users/entities/user.entity';
import {
  ListPurchasesQueryDto,
  ReceivePurchaseDto,
  UpdatePurchaseDto,
} from './dto/purchase.dto';
import { PurchasesService } from './purchases.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class PurchasesResolver {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Query(() => GraphQLJSON, { name: 'purchases' })
  async findAll(
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListPurchasesQueryDto, input);
    return this.purchasesService.findAll(query);
  }

  @Query(() => GraphQLJSON, { name: 'purchase' })
  findOne(
    @Args('purchaseId', { type: () => ID }, ParseUUIDPipe) purchaseId: string,
  ) {
    return this.purchasesService.findOne(purchaseId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createPurchase' })
  async create(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(ReceivePurchaseDto, input);
    return this.purchasesService.create(dto, user.id);
  }

  @Mutation(() => GraphQLJSON, { name: 'receivePurchaseStock' })
  async receiveStock(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(ReceivePurchaseDto, input);
    return this.purchasesService.receiveStock(dto, user.id);
  }

  @Mutation(() => GraphQLJSON, { name: 'updatePurchase' })
  async update(
    @Args('purchaseId', { type: () => ID }, ParseUUIDPipe) purchaseId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdatePurchaseDto, input);
    return this.purchasesService.update(purchaseId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deletePurchase' })
  remove(
    @Args('purchaseId', { type: () => ID }, ParseUUIDPipe) purchaseId: string,
  ) {
    return this.purchasesService.remove(purchaseId);
  }
}
