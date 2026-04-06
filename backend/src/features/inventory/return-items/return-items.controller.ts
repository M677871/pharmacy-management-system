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
  CreateReturnItemDto,
  ListReturnItemsQueryDto,
  UpdateReturnItemDto,
} from './dto/return-item.dto';
import { ReturnItemsService } from './return-items.service';

@Controller('inventory/return-items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class ReturnItemsController {
  constructor(private readonly returnItemsService: ReturnItemsService) {}

  @Get()
  findAll(@Query() query: ListReturnItemsQueryDto) {
    return this.returnItemsService.findAll(query);
  }

  @Get(':returnItemId')
  findOne(@Param('returnItemId', ParseUUIDPipe) returnItemId: string) {
    return this.returnItemsService.findOne(returnItemId);
  }

  @Post()
  create(@Body() dto: CreateReturnItemDto) {
    return this.returnItemsService.create(dto);
  }

  @Patch(':returnItemId')
  update(
    @Param('returnItemId', ParseUUIDPipe) returnItemId: string,
    @Body() dto: UpdateReturnItemDto,
  ) {
    return this.returnItemsService.update(returnItemId, dto);
  }

  @Delete(':returnItemId')
  remove(@Param('returnItemId', ParseUUIDPipe) returnItemId: string) {
    return this.returnItemsService.remove(returnItemId);
  }
}
