import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class SendBroadcastDto {
  @IsString()
  @MaxLength(160)
  title: string;

  @IsString()
  @MaxLength(3000)
  body: string;

  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  audienceRoles?: UserRole[];
}
