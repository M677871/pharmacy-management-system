import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import {
  CreateProductDto,
  ListProductsQueryDto,
  UpdateProductDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Query(() => GraphQLJSON, { name: 'products' })
  async findAll(
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListProductsQueryDto, input);
    return this.productsService.findAll(query);
  }

  @Query(() => GraphQLJSON, { name: 'product' })
  findOne(
    @Args('productId', { type: () => ID }, ParseUUIDPipe) productId: string,
  ) {
    return this.productsService.findOne(productId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createProduct' })
  async create(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateProductDto, input);
    return this.productsService.create(dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateProduct' })
  async update(
    @Args('productId', { type: () => ID }, ParseUUIDPipe) productId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdateProductDto, input);
    return this.productsService.update(productId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deleteProduct' })
  remove(
    @Args('productId', { type: () => ID }, ParseUUIDPipe) productId: string,
  ) {
    return this.productsService.remove(productId);
  }
}
