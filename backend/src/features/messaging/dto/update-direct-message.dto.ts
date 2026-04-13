import { IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateDirectMessageDto {
  @IsUUID()
  messageId!: string;

  @IsString()
  @MaxLength(2000)
  body!: string;
}
