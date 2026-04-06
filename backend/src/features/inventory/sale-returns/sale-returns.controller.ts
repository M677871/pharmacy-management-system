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
  CreateReturnDto,
  ListReturnsQueryDto,
  UpdateReturnDto,
} from './dto/return.dto';
import { SaleReturnsService } from './sale-returns.service';

@Controller('inventory/returns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class SaleReturnsController {
  constructor(private readonly saleReturnsService: SaleReturnsService) {}

  @Get()
  findAll(@Query() query: ListReturnsQueryDto) {
    return this.saleReturnsService.findAll(query);
  }

  @Get(':returnId')
  findOne(@Param('returnId', ParseUUIDPipe) returnId: string) {
    return this.saleReturnsService.findOne(returnId);
  }

  @Post()
  create(@Body() dto: CreateReturnDto, @CurrentUser() user: User) {
    return this.saleReturnsService.create(dto, user.id);
  }

  @Patch(':returnId')
  update(
    @Param('returnId', ParseUUIDPipe) returnId: string,
    @Body() dto: UpdateReturnDto,
  ) {
    return this.saleReturnsService.update(returnId, dto);
  }

  @Delete(':returnId')
  remove(@Param('returnId', ParseUUIDPipe) returnId: string) {
    return this.saleReturnsService.remove(returnId);
  }
}
