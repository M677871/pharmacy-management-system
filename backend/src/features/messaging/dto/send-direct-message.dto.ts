import { IsString, IsUUID, MaxLength } from 'class-validator';

export class SendDirectMessageDto {
  @IsUUID()
  recipientId: string;

  @IsString()
  @MaxLength(2000)
  body: string;
}
