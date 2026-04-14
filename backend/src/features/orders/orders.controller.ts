import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CUSTOMER)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  listOrders(@CurrentUser() user: User, @Query() query: ListOrdersQueryDto) {
    return this.ordersService.listOrders(user, query);
  }

  @Get('drivers')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  listDeliveryDrivers() {
    return this.ordersService.listDeliveryDrivers();
  }

  @Post('drivers')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  createDeliveryDriver(@Body() dto: CreateDeliveryDriverDto) {
    return this.ordersService.createDeliveryDriver(dto);
  }

  @Patch('drivers/:driverId')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  updateDeliveryDriver(
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Body() dto: UpdateDeliveryDriverDto,
  ) {
    return this.ordersService.updateDeliveryDriver(driverId, dto);
  }

  @Delete('drivers/:driverId')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  removeDeliveryDriver(@Param('driverId', ParseUUIDPipe) driverId: string) {
    return this.ordersService.removeDeliveryDriver(driverId);
  }

  @Post()
  @Roles(UserRole.CUSTOMER)
  createOrder(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user, dto);
  }

  @Get(':orderId')
  getOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.getOrderForUser(orderId, user);
  }

  @Post(':orderId/approve')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  approveOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: User,
    @Body() dto: ApproveOrderDto,
  ) {
    return this.ordersService.approveOrder(orderId, user, dto);
  }

  @Post(':orderId/reject')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  rejectOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: User,
    @Body() dto: RejectOrderDto,
  ) {
    return this.ordersService.rejectOrder(orderId, user, dto);
  }

  @Post(':orderId/location-shared')
  @Roles(UserRole.CUSTOMER)
  markLocationShared(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.markLocationShared(orderId, user);
  }

  @Post(':orderId/mark-paid')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  markPaid(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.markOrderPaid(orderId, user);
  }
}
