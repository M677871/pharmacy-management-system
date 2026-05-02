import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { User, UserRole } from '../../users/entities/user.entity';
import {
  CheckoutSaleDto,
  ListSalesQueryDto,
  UpdateSaleDto,
} from './dto/sale.dto';
import { SalesService } from './sales.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class SalesResolver {
  constructor(private readonly salesService: SalesService) {}

  @Query(() => GraphQLJSON, { name: 'sales' })
  async findAll(
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListSalesQueryDto, input);
    return this.salesService.findAll(query);
  }

  @Query(() => GraphQLJSON, { name: 'sale' })
  getSale(@Args('saleId', { type: () => ID }, ParseUUIDPipe) saleId: string) {
    return this.salesService.getSaleById(saleId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createSale' })
  async create(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CheckoutSaleDto, input);
    return this.salesService.create(dto, user.id);
  }

  @Mutation(() => GraphQLJSON, { name: 'checkoutSale' })
  async checkout(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CheckoutSaleDto, input);
    return this.salesService.checkout(dto, user.id);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateSale' })
  async update(
    @Args('saleId', { type: () => ID }, ParseUUIDPipe) saleId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdateSaleDto, input);
    return this.salesService.update(saleId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deleteSale' })
  remove(@Args('saleId', { type: () => ID }, ParseUUIDPipe) saleId: string) {
    return this.salesService.remove(saleId);
  }
}
