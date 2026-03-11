import { IsString } from 'class-validator';

export class VerifyTotpLoginDto {
  @IsString()
  tempToken: string;

  @IsString()
  code: string;
}
