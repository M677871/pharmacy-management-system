import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import {
  CreateReturnItemDto,
  ListReturnItemsQueryDto,
  UpdateReturnItemDto,
} from './dto/return-item.dto';
import { ReturnItemsService } from './return-items.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class ReturnItemsResolver {
  constructor(private readonly returnItemsService: ReturnItemsService) {}

  @Query(() => GraphQLJSON, { name: 'returnItems' })
  async findAll(
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListReturnItemsQueryDto, input);
    return this.returnItemsService.findAll(query);
  }

  @Query(() => GraphQLJSON, { name: 'returnItem' })
  findOne(
    @Args('returnItemId', { type: () => ID }, ParseUUIDPipe)
    returnItemId: string,
  ) {
    return this.returnItemsService.findOne(returnItemId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createReturnItem' })
  async create(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateReturnItemDto, input);
    return this.returnItemsService.create(dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateReturnItem' })
  async update(
    @Args('returnItemId', { type: () => ID }, ParseUUIDPipe)
    returnItemId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdateReturnItemDto, input);
    return this.returnItemsService.update(returnItemId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deleteReturnItem' })
  remove(
    @Args('returnItemId', { type: () => ID }, ParseUUIDPipe)
    returnItemId: string,
  ) {
    return this.returnItemsService.remove(returnItemId);
  }
}
