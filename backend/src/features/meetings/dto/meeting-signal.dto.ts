import { IsIn, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class MeetingSignalDto {
  @IsUUID()
  meetingId!: string;

  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @IsIn(['offer', 'answer', 'ice-candidate', 'screen-share-started', 'screen-share-stopped'])
  type!:
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'screen-share-started'
    | 'screen-share-stopped';

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
