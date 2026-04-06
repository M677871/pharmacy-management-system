import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateReturnItemDto {
  @IsUUID()
  saleItemId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  quantity: number;
}

export class CreateReturnDto {
  @IsUUID()
  saleId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  returnedAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReturnItemDto)
  items: CreateReturnItemDto[];
}

export class ListReturnsQueryDto {
  @IsOptional()
  @IsUUID()
  saleId?: string;
}

export class UpdateReturnDto {
  @IsOptional()
  @IsString()
  reason?: string | null;

  @IsOptional()
  @IsDateString()
  returnedAt?: string;
}
