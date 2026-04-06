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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { User, UserRole } from '../../users/entities/user.entity';
import {
  CheckoutSaleDto,
  ListSalesQueryDto,
  UpdateSaleDto,
} from './dto/sale.dto';
import { SalesService } from './sales.service';

@Controller('inventory/sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll(@Query() query: ListSalesQueryDto) {
    return this.salesService.findAll(query);
  }

  @Post()
  create(@Body() dto: CheckoutSaleDto, @CurrentUser() user: User) {
    return this.salesService.create(dto, user.id);
  }

  @Post('checkout')
  checkout(@Body() dto: CheckoutSaleDto, @CurrentUser() user: User) {
    return this.salesService.checkout(dto, user.id);
  }

  @Get(':saleId')
  getSale(@Param('saleId', ParseUUIDPipe) saleId: string) {
    return this.salesService.getSaleById(saleId);
  }

  @Patch(':saleId')
  update(
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Body() dto: UpdateSaleDto,
  ) {
    return this.salesService.update(saleId, dto);
  }

  @Delete(':saleId')
  remove(@Param('saleId', ParseUUIDPipe) saleId: string) {
    return this.salesService.remove(saleId);
  }
}
