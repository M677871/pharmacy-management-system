import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('inventory/suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll() {
    return this.suppliersService.findAll();
  }

  @Get(':supplierId')
  findOne(@Param('supplierId', ParseUUIDPipe) supplierId: string) {
    return this.suppliersService.findOne(supplierId);
  }

  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Patch(':supplierId')
  update(
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(supplierId, dto);
  }

  @Delete(':supplierId')
  remove(@Param('supplierId', ParseUUIDPipe) supplierId: string) {
    return this.suppliersService.remove(supplierId);
  }
}
