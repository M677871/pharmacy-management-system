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
  CreateStockMovementDto,
  ListStockMovementsQueryDto,
  UpdateStockMovementDto,
} from './dto/stock-movement.dto';
import { StockMovementsService } from './stock-movements.service';

@Controller('inventory/stock-movements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class StockMovementsController {
  constructor(
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  @Get()
  findAll(@Query() query: ListStockMovementsQueryDto) {
    return this.stockMovementsService.findAll(query);
  }

  @Get(':stockMovementId')
  findOne(@Param('stockMovementId', ParseUUIDPipe) stockMovementId: string) {
    return this.stockMovementsService.findOne(stockMovementId);
  }

  @Post()
  create(@Body() dto: CreateStockMovementDto) {
    return this.stockMovementsService.create(dto);
  }

  @Patch(':stockMovementId')
  update(
    @Param('stockMovementId', ParseUUIDPipe) stockMovementId: string,
    @Body() dto: UpdateStockMovementDto,
  ) {
    return this.stockMovementsService.update(stockMovementId, dto);
  }

  @Delete(':stockMovementId')
  remove(@Param('stockMovementId', ParseUUIDPipe) stockMovementId: string) {
    return this.stockMovementsService.remove(stockMovementId);
  }
}
