import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  StockMovementReferenceType,
  StockMovementType,
} from '../../inventory.enums';

export class ListStockMovementsQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsOptional()
  @IsUUID()
  purchaseId?: string;

  @IsOptional()
  @IsUUID()
  saleId?: string;

  @IsOptional()
  @IsUUID()
  returnId?: string;

  @IsOptional()
  @IsEnum(StockMovementType)
  movementType?: StockMovementType;

  @IsOptional()
  @IsEnum(StockMovementReferenceType)
  referenceType?: StockMovementReferenceType;
}

export class CreateStockMovementDto {
  @IsUUID()
  productId!: string;
}

export class UpdateStockMovementDto {}
