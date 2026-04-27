import { IsString, Length } from 'class-validator';

export class CreateMeetingNoteDto {
  @IsString()
  @Length(1, 4000)
  content!: string;
}
