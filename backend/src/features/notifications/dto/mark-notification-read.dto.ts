import { IsUUID } from 'class-validator';

export class MarkNotificationReadDto {
  @IsUUID()
  notificationId: string;
}
