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
  ListPurchasesQueryDto,
  ReceivePurchaseDto,
  UpdatePurchaseDto,
} from './dto/purchase.dto';
import { PurchasesService } from './purchases.service';

@Controller('inventory/purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  findAll(@Query() query: ListPurchasesQueryDto) {
    return this.purchasesService.findAll(query);
  }

  @Get(':purchaseId')
  findOne(@Param('purchaseId', ParseUUIDPipe) purchaseId: string) {
    return this.purchasesService.findOne(purchaseId);
  }

  @Post()
  create(@Body() dto: ReceivePurchaseDto, @CurrentUser() user: User) {
    return this.purchasesService.create(dto, user.id);
  }

  @Post('receive')
  receiveStock(@Body() dto: ReceivePurchaseDto, @CurrentUser() user: User) {
    return this.purchasesService.receiveStock(dto, user.id);
  }

  @Patch(':purchaseId')
  update(
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
    @Body() dto: UpdatePurchaseDto,
  ) {
    return this.purchasesService.update(purchaseId, dto);
  }

  @Delete(':purchaseId')
  remove(@Param('purchaseId', ParseUUIDPipe) purchaseId: string) {
    return this.purchasesService.remove(purchaseId);
  }
}
