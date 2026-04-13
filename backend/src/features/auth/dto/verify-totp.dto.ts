import { IsString } from 'class-validator';

export class VerifyTotpDto {
  @IsString()
  code!: string;
}
