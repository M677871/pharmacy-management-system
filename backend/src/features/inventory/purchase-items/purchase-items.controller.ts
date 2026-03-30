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
  CreatePurchaseItemDto,
  ListPurchaseItemsQueryDto,
  UpdatePurchaseItemDto,
} from './dto/purchase-item.dto';
import { PurchaseItemsService } from './purchase-items.service';

@Controller('inventory/purchase-items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class PurchaseItemsController {
  constructor(private readonly purchaseItemsService: PurchaseItemsService) {}

  @Get()
  findAll(@Query() query: ListPurchaseItemsQueryDto) {
    return this.purchaseItemsService.findAll(query);
  }

  @Get(':purchaseItemId')
  findOne(@Param('purchaseItemId', ParseUUIDPipe) purchaseItemId: string) {
    return this.purchaseItemsService.findOne(purchaseItemId);
  }

  @Post()
  create(@Body() dto: CreatePurchaseItemDto) {
    return this.purchaseItemsService.create(dto);
  }

  @Patch(':purchaseItemId')
  update(
    @Param('purchaseItemId', ParseUUIDPipe) purchaseItemId: string,
    @Body() dto: UpdatePurchaseItemDto,
  ) {
    return this.purchaseItemsService.update(purchaseItemId, dto);
  }

  @Delete(':purchaseItemId')
  remove(@Param('purchaseItemId', ParseUUIDPipe) purchaseItemId: string) {
    return this.purchaseItemsService.remove(purchaseItemId);
  }
}
