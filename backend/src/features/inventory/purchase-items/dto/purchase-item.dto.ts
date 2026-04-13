import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class ListPurchaseItemsQueryDto {
  @IsOptional()
  @IsUUID()
  purchaseId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;
}

export class CreatePurchaseItemDto {
  @IsUUID()
  purchaseId!: string;

  @IsUUID()
  productId!: string;

  @IsUUID()
  batchId!: string;

  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  quantity!: number;

  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost!: number;
}

export class UpdatePurchaseItemDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  quantity?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;
}
