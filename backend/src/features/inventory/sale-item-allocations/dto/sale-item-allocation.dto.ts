import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class ListSaleItemAllocationsQueryDto {
  @IsOptional()
  @IsUUID()
  saleItemId?: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;
}

export class CreateSaleItemAllocationDto {
  @IsUUID()
  saleItemId!: string;

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

export class UpdateSaleItemAllocationDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  quantity?: number;
}
