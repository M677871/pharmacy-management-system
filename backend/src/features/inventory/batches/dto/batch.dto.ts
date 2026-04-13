import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class ListBatchesQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeExpired?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeEmpty?: boolean;
}

export class CreateBatchDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsString()
  batchNumber!: string;

  @IsDateString()
  expiryDate!: string;

  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBatchDto {
  @IsOptional()
  @IsString()
  notes?: string | null;
}
