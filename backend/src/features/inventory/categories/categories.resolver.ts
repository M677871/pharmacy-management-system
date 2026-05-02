import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import {
  JsonObject,
  toValidatedDto,
} from '../../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class CategoriesResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Query(() => GraphQLJSON, { name: 'categories' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Query(() => GraphQLJSON, { name: 'category' })
  findOne(
    @Args('categoryId', { type: () => ID }, ParseUUIDPipe) categoryId: string,
  ) {
    return this.categoriesService.findOne(categoryId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createCategory' })
  async create(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateCategoryDto, input);
    return this.categoriesService.create(dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateCategory' })
  async update(
    @Args('categoryId', { type: () => ID }, ParseUUIDPipe) categoryId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdateCategoryDto, input);
    return this.categoriesService.update(categoryId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deleteCategory' })
  remove(
    @Args('categoryId', { type: () => ID }, ParseUUIDPipe) categoryId: string,
  ) {
    return this.categoriesService.remove(categoryId);
  }
}
