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
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import {
  CreateSaleItemDto,
  ListSaleItemsQueryDto,
  UpdateSaleItemDto,
} from './dto/sale-item.dto';
import { SaleItemsService } from './sale-items.service';

@Controller('inventory/sale-items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class SaleItemsController {
  constructor(private readonly saleItemsService: SaleItemsService) {}

  @Get()
  findAll(@Query() query: ListSaleItemsQueryDto) {
    return this.saleItemsService.findAll(query);
  }

  @Get(':saleItemId')
  findOne(@Param('saleItemId', ParseUUIDPipe) saleItemId: string) {
    return this.saleItemsService.findOne(saleItemId);
  }

  @Post()
  create(@Body() dto: CreateSaleItemDto) {
    return this.saleItemsService.create(dto);
  }

  @Patch(':saleItemId')
  update(
    @Param('saleItemId', ParseUUIDPipe) saleItemId: string,
    @Body() dto: UpdateSaleItemDto,
  ) {
    return this.saleItemsService.update(saleItemId, dto);
  }

  @Delete(':saleItemId')
  remove(@Param('saleItemId', ParseUUIDPipe) saleItemId: string) {
    return this.saleItemsService.remove(saleItemId);
  }
}
