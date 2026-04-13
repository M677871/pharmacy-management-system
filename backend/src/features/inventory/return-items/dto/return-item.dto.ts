import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class ListReturnItemsQueryDto {
  @IsOptional()
  @IsUUID()
  returnId?: string;

  @IsOptional()
  @IsUUID()
  saleItemId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;
}

export class CreateReturnItemDto {
  @IsUUID()
  returnId!: string;

  @IsUUID()
  saleItemId!: string;

  @IsUUID()
  productId!: string;

  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  quantity!: number;
}

export class UpdateReturnItemDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  quantity?: number;
}
