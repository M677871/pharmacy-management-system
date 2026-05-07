import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { User, UserRole } from '../../users/entities/user.entity';
import {
  CreateReturnDto,
  ListReturnsQueryDto,
  UpdateReturnDto,
} from './dto/return.dto';
import { SaleReturnsService } from './sale-returns.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class SaleReturnsResolver {
  constructor(private readonly saleReturnsService: SaleReturnsService) {}

  @Query(() => GraphQLJSON, { name: 'returns' })
  async findAll(
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListReturnsQueryDto, input);
    return this.saleReturnsService.findAll(query);
  }

  @Query(() => GraphQLJSON, { name: 'return' })
  findOne(
    @Args('returnId', { type: () => ID }, ParseUUIDPipe) returnId: string,
  ) {
    return this.saleReturnsService.findOne(returnId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createReturn' })
  async create(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateReturnDto, input);
    return this.saleReturnsService.create(dto, user.id);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateReturn' })
  async update(
    @Args('returnId', { type: () => ID }, ParseUUIDPipe) returnId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdateReturnDto, input);
    return this.saleReturnsService.update(returnId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deleteReturn' })
  remove(
    @Args('returnId', { type: () => ID }, ParseUUIDPipe) returnId: string,
  ) {
    return this.saleReturnsService.remove(returnId);
  }
}
