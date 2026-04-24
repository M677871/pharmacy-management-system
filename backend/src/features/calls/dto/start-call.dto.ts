import { IsEnum, IsUUID } from 'class-validator';
import { CallType } from '../entities/call-session.entity';

export class StartCallDto {
  @IsUUID()
  recipientId!: string;

  @IsEnum(CallType)
  type!: CallType;
}
