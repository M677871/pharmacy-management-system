import { IsUUID } from 'class-validator';

export class CallIdDto {
  @IsUUID()
  callId!: string;
}
