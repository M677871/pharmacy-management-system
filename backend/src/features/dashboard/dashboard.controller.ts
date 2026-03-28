import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CUSTOMER)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(
    @CurrentUser() user: User,
    @Query() query: DashboardRangeQueryDto,
  ) {
    return this.dashboardService.getOverview(user, query.days);
  }

  @Get('catalog')
  getCatalog(@Query() query: DashboardCatalogQueryDto) {
    return this.dashboardService.getCatalog(query.search, query.limit);
  }

  @Get('reports')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  getReports(@Query() query: DashboardRangeQueryDto) {
    return this.dashboardService.getReports(query.days);
  }
}
