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
import { CreateBatchDto, ListBatchesQueryDto, UpdateBatchDto } from './dto/batch.dto';
import { BatchesService } from './batches.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get('batches')
  findAll(@Query() query: ListBatchesQueryDto) {
    return this.batchesService.findAll(query);
  }

  @Get('batches/:batchId')
  findOne(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.batchesService.findOne(batchId);
  }

  @Get('products/:productId/batches')
  findByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.batchesService.findByProduct(productId);
  }

  @Post('batches')
  create(@Body() dto: CreateBatchDto) {
    return this.batchesService.create(dto);
  }

  @Patch('batches/:batchId')
  update(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.batchesService.update(batchId, dto);
  }

  @Delete('batches/:batchId')
  remove(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.batchesService.remove(batchId);
  }
}
