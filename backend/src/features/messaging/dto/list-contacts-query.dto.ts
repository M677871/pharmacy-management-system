import { IsOptional, IsString } from 'class-validator';

export class ListContactsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
