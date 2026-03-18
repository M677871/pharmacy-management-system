import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import {
  PASSWORD_RESET_REQUEST_MESSAGE,
  PasswordResetMode,
  PasswordResetRequestResult,
} from './password-reset.types';
import { PasswordResetLinkService } from './password-reset-link.service';
import { PasswordResetOtpService } from './password-reset-otp.service';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: PasswordResetOtpService,
    private readonly linkService: PasswordResetLinkService,
    private readonly configService: ConfigService,
  ) {}

  async forgotPassword(email: string): Promise<PasswordResetRequestResult> {
    const mode = this.getResetMode();
    const response: PasswordResetRequestResult = {
      message: PASSWORD_RESET_REQUEST_MESSAGE,
      mode,
    };
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return response;
    }

    if (mode === 'otp') {
      const result = await this.otpService.createReset(user);
      return { ...response, ...result };
    }

    await this.linkService.createReset(user.id, user.email);
    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (this.getResetMode() === 'otp') {
      if (!dto.email) {
        throw new BadRequestException(
          'Email is required for OTP password reset',
        );
      }

      return this.otpService.resetPassword(dto.email, dto.token, dto.newPassword);
    }

    return this.linkService.resetPassword(dto.token, dto.newPassword);
  }

  getResetMode(): PasswordResetMode {
    const configuredMode = this.configService
      .get<string>('PASSWORD_RESET_MODE')
      ?.toLowerCase();

    if (configuredMode === 'otp' || configuredMode === 'link') {
      return configuredMode;
    }

    return this.configService.get<string>('NODE_ENV') === 'production'
      ? 'link'
      : 'otp';
  }
}
