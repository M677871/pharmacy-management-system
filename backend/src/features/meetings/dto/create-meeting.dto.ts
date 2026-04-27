import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  @Length(3, 160)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 4000)
  agenda?: string;

  @IsDateString()
  scheduledStartAt!: string;

  @IsInt()
  @Min(5)
  @Max(24 * 60)
  durationMinutes!: number;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  participantIds!: string[];
}
