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
  CreateSaleItemAllocationDto,
  ListSaleItemAllocationsQueryDto,
  UpdateSaleItemAllocationDto,
} from './dto/sale-item-allocation.dto';
import { SaleItemAllocationsService } from './sale-item-allocations.service';

@Controller('inventory/sale-item-allocations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class SaleItemAllocationsController {
  constructor(
    private readonly saleItemAllocationsService: SaleItemAllocationsService,
  ) {}

  @Get()
  findAll(@Query() query: ListSaleItemAllocationsQueryDto) {
    return this.saleItemAllocationsService.findAll(query);
  }

  @Get(':saleItemAllocationId')
  findOne(
    @Param('saleItemAllocationId', ParseUUIDPipe) saleItemAllocationId: string,
  ) {
    return this.saleItemAllocationsService.findOne(saleItemAllocationId);
  }

  @Post()
  create(@Body() dto: CreateSaleItemAllocationDto) {
    return this.saleItemAllocationsService.create(dto);
  }

  @Patch(':saleItemAllocationId')
  update(
    @Param('saleItemAllocationId', ParseUUIDPipe) saleItemAllocationId: string,
    @Body() dto: UpdateSaleItemAllocationDto,
  ) {
    return this.saleItemAllocationsService.update(saleItemAllocationId, dto);
  }

  @Delete(':saleItemAllocationId')
  remove(
    @Param('saleItemAllocationId', ParseUUIDPipe) saleItemAllocationId: string,
  ) {
    return this.saleItemAllocationsService.remove(saleItemAllocationId);
  }
}
