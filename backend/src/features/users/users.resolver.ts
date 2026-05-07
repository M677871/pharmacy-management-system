import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => GraphQLJSON, { name: 'users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Mutation(() => GraphQLJSON, { name: 'createUser' })
  async create(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateUserDto, input);
    const user = await this.usersService.create(dto);
    return this.usersService.sanitizeUser(user);
  }
}
