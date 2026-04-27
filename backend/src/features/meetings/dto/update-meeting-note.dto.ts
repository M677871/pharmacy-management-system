import { IsString, Length } from 'class-validator';

export class UpdateMeetingNoteDto {
  @IsString()
  @Length(1, 4000)
  content!: string;
}
