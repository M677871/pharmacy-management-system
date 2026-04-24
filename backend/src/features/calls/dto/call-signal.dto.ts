import { IsIn, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CallSignalDto {
  @IsUUID()
  callId!: string;

  @IsIn(['offer', 'answer', 'ice-candidate'])
  type!: 'offer' | 'answer' | 'ice-candidate';

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
