import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import {
  DashboardCatalogQueryDto,
  DashboardRangeQueryDto,
} from './dto/dashboard-query.dto';
import { DashboardService } from './dashboard.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CUSTOMER)
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Query(() => GraphQLJSON, { name: 'dashboardOverview' })
  async getOverview(
    @CurrentUser() user: User,
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(DashboardRangeQueryDto, input);
    return this.dashboardService.getOverview(user, query.days);
  }

  @Query(() => GraphQLJSON, { name: 'dashboardCatalog' })
  async getCatalog(
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(DashboardCatalogQueryDto, input);
    return this.dashboardService.getCatalog(query.search, query.limit);
  }

  @Query(() => GraphQLJSON, { name: 'dashboardReports' })
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async getReports(
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(DashboardRangeQueryDto, input);
    return this.dashboardService.getReports(query.days);
  }
}
