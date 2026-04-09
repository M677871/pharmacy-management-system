import { IsUUID } from 'class-validator';

export class DeleteDirectMessageDto {
  @IsUUID()
  messageId: string;
}
