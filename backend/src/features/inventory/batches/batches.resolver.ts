import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import { BatchesService } from './batches.service';
import { CreateBatchDto, ListBatchesQueryDto, UpdateBatchDto } from './dto/batch.dto';
import {
  JsonObject,
  toValidatedDto,
} from '../../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class BatchesResolver {
  constructor(private readonly batchesService: BatchesService) {}

  @Query(() => GraphQLJSON, { name: 'batches' })
  async findAll(
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListBatchesQueryDto, input);
    return this.batchesService.findAll(query);
  }

  @Query(() => GraphQLJSON, { name: 'batch' })
  findOne(@Args('batchId', { type: () => ID }, ParseUUIDPipe) batchId: string) {
    return this.batchesService.findOne(batchId);
  }

  @Query(() => GraphQLJSON, { name: 'productBatches' })
  findByProduct(
    @Args('productId', { type: () => ID }, ParseUUIDPipe) productId: string,
  ) {
    return this.batchesService.findByProduct(productId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createBatch' })
  async create(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateBatchDto, input);
    return this.batchesService.create(dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateBatch' })
  async update(
    @Args('batchId', { type: () => ID }, ParseUUIDPipe) batchId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdateBatchDto, input);
    return this.batchesService.update(batchId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deleteBatch' })
  remove(@Args('batchId', { type: () => ID }, ParseUUIDPipe) batchId: string) {
    return this.batchesService.remove(batchId);
  }
}
