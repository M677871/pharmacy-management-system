import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const LANGUAGE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

export class CreateCaptionSegmentDto {
  @IsString()
  @Length(1, 400)
  text!: string;

  @IsOptional()
  @IsString()
  @Matches(LANGUAGE_PATTERN)
  sourceLanguage?: string;

  @IsOptional()
  @IsString()
  @Matches(LANGUAGE_PATTERN)
  targetLanguage?: string;

  @IsOptional()
  @IsIn(['manual', 'browser_speech'])
  source?: 'manual' | 'browser_speech';
}
