import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import {
  ApproveOrderDto,
  CreateDeliveryDriverDto,
  CreateOrderDto,
  ListOrdersQueryDto,
  RejectOrderDto,
  UpdateDeliveryDriverDto,
} from './dto/order.dto';
import { OrdersService } from './orders.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CUSTOMER)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @Query(() => GraphQLJSON, { name: 'orders' })
  async listOrders(
    @CurrentUser() user: User,
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListOrdersQueryDto, input);
    return this.ordersService.listOrders(user, query);
  }

  @Query(() => GraphQLJSON, { name: 'order' })
  getOrder(
    @Args('orderId', { type: () => ID }, ParseUUIDPipe) orderId: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.getOrderForUser(orderId, user);
  }

  @Query(() => GraphQLJSON, { name: 'deliveryDrivers' })
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  listDeliveryDrivers() {
    return this.ordersService.listDeliveryDrivers();
  }

  @Mutation(() => GraphQLJSON, { name: 'createOrder' })
  @Roles(UserRole.CUSTOMER)
  async createOrder(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateOrderDto, input);
    return this.ordersService.createOrder(user, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'approveOrder' })
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async approveOrder(
    @Args('orderId', { type: () => ID }, ParseUUIDPipe) orderId: string,
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(ApproveOrderDto, input);
    return this.ordersService.approveOrder(orderId, user, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'rejectOrder' })
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async rejectOrder(
    @Args('orderId', { type: () => ID }, ParseUUIDPipe) orderId: string,
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(RejectOrderDto, input);
    return this.ordersService.rejectOrder(orderId, user, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'markOrderLocationShared' })
  @Roles(UserRole.CUSTOMER)
  markLocationShared(
    @Args('orderId', { type: () => ID }, ParseUUIDPipe) orderId: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.markLocationShared(orderId, user);
  }

  @Mutation(() => GraphQLJSON, { name: 'markOrderPaid' })
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  markPaid(
    @Args('orderId', { type: () => ID }, ParseUUIDPipe) orderId: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.markOrderPaid(orderId, user);
  }

  @Mutation(() => GraphQLJSON, { name: 'createDeliveryDriver' })
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async createDeliveryDriver(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateDeliveryDriverDto, input);
    return this.ordersService.createDeliveryDriver(dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateDeliveryDriver' })
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async updateDeliveryDriver(
    @Args('driverId', { type: () => ID }, ParseUUIDPipe) driverId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdateDeliveryDriverDto, input);
    return this.ordersService.updateDeliveryDriver(driverId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deleteDeliveryDriver' })
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  removeDeliveryDriver(
    @Args('driverId', { type: () => ID }, ParseUUIDPipe) driverId: string,
  ) {
    return this.ordersService.removeDeliveryDriver(driverId);
  }
}
