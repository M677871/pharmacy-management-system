import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import {
  CreateStockMovementDto,
  ListStockMovementsQueryDto,
  UpdateStockMovementDto,
} from './dto/stock-movement.dto';
import { StockMovementsService } from './stock-movements.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class StockMovementsResolver {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Query(() => GraphQLJSON, { name: 'stockMovements' })
  async findAll(
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListStockMovementsQueryDto, input);
    return this.stockMovementsService.findAll(query);
  }

  @Query(() => GraphQLJSON, { name: 'stockMovement' })
  findOne(
    @Args('stockMovementId', { type: () => ID }, ParseUUIDPipe)
    stockMovementId: string,
  ) {
    return this.stockMovementsService.findOne(stockMovementId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createStockMovement' })
  async create(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateStockMovementDto, input);
    return this.stockMovementsService.create(dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateStockMovement' })
  async update(
    @Args('stockMovementId', { type: () => ID }, ParseUUIDPipe)
    stockMovementId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdateStockMovementDto, input);
    return this.stockMovementsService.update(stockMovementId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deleteStockMovement' })
  remove(
    @Args('stockMovementId', { type: () => ID }, ParseUUIDPipe)
    stockMovementId: string,
  ) {
    return this.stockMovementsService.remove(stockMovementId);
  }
}
