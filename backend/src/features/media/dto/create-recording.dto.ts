import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateRecordingDto {
  @IsDateString()
  startedAt!: string;

  @IsDateString()
  endedAt!: string;

  @IsInt()
  @Min(0)
  @Max(24 * 60 * 60)
  durationSeconds!: number;

  @IsOptional()
  @IsString()
  mimeType?: string;
}
