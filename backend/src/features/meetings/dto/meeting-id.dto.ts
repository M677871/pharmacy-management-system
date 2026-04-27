import { IsUUID } from 'class-validator';

export class MeetingIdDto {
  @IsUUID()
  meetingId!: string;
}
