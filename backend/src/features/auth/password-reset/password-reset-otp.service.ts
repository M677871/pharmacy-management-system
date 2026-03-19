import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../../mail/mail.service';
import { PasswordResetMethod, User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';

@Injectable()
export class PasswordResetOtpService {
  private readonly logger = new Logger(PasswordResetOtpService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async createReset(user: User) {
    const resetCode = this.generateOtp();
    const hashedResetCode = await bcrypt.hash(resetCode, 12);

    await this.usersService.update(user.id, {
      passwordResetToken: hashedResetCode,
      passwordResetExpires: new Date(Date.now() + this.getOtpTtlMs()),
      passwordResetMethod: PasswordResetMethod.OTP,
      passwordResetAttempts: 0,
    });

    try {
      await this.mailService.sendPasswordResetOtpEmail({
        to: user.email,
        resetCode,
        expiresInMinutes: this.getOtpTtlMinutes(),
      });
    } catch (error) {
      this.logger.error('Failed to send password reset OTP email.');
      throw new InternalServerErrorException(
        'Unable to process password reset request.',
      );
    }

    return this.shouldExposeOtp()
      ? {
          resetCode,
          expiresInMinutes: this.getOtpTtlMinutes(),
        }
      : {
          expiresInMinutes: this.getOtpTtlMinutes(),
        };
  }

  async resetPassword(email: string | undefined, resetCode: string, newPassword: string) {
    if (!email) {
      throw new BadRequestException('Email is required for OTP password reset');
    }

    const user = await this.usersService.findByEmail(email);

    if (!this.hasActiveOtpReset(user)) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    if (this.isExpired(user.passwordResetExpires)) {
      await this.clearResetState(user.id);
      throw new BadRequestException('Invalid or expired reset code');
    }

    if (user.passwordResetAttempts >= this.getOtpMaxAttempts()) {
      await this.clearResetState(user.id);
      throw this.createTooManyAttemptsException();
    }

    const isValidCode = await bcrypt.compare(resetCode, user.passwordResetToken);

    if (!isValidCode) {
      const nextAttemptCount = user.passwordResetAttempts + 1;

      if (nextAttemptCount >= this.getOtpMaxAttempts()) {
        await this.clearResetState(user.id);
        throw this.createTooManyAttemptsException();
      }

      await this.usersService.update(user.id, {
        passwordResetAttempts: nextAttemptCount,
      });

      throw new BadRequestException('Incorrect reset code');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersService.update(user.id, {
      password: hashedPassword,
      refreshToken: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      passwordResetMethod: null,
      passwordResetAttempts: 0,
    });

    return { message: 'Password reset successful' };
  }

  private async clearResetState(userId: string) {
    await this.usersService.update(userId, {
      passwordResetToken: null,
      passwordResetExpires: null,
      passwordResetMethod: null,
      passwordResetAttempts: 0,
    });
  }

  private generateOtp() {
    const length = this.getOtpLength();
    let code = '';

    for (let index = 0; index < length; index += 1) {
      code += crypto.randomInt(0, 10).toString();
    }

    return code;
  }

  private hasActiveOtpReset(user: User | null): user is User & {
    passwordResetToken: string;
    passwordResetExpires: Date;
  } {
    return Boolean(
      user &&
        user.passwordResetMethod === PasswordResetMethod.OTP &&
        user.passwordResetToken &&
        user.passwordResetExpires,
    );
  }

  private isExpired(expiresAt: Date | null) {
    return !expiresAt || expiresAt.getTime() <= Date.now();
  }

  private shouldExposeOtp() {
    const configuredValue = this.configService
      .get<string>('PASSWORD_RESET_EXPOSE_OTP')
      ?.toLowerCase();

    if (configuredValue === 'true') {
      return true;
    }

    if (configuredValue === 'false') {
      return false;
    }

    return this.configService.get<string>('NODE_ENV') !== 'production';
  }

  private getOtpLength() {
    const configuredLength = Number(
      this.configService.get<string>('PASSWORD_RESET_OTP_LENGTH', '6'),
    );

    if (!Number.isFinite(configuredLength)) {
      return 6;
    }

    return Math.min(6, Math.max(4, Math.floor(configuredLength)));
  }

  private getOtpTtlMinutes() {
    const configuredTtl = Number(
      this.configService.get<string>('PASSWORD_RESET_OTP_TTL_MINUTES', '10'),
    );

    if (!Number.isFinite(configuredTtl)) {
      return 10;
    }

    return Math.min(10, Math.max(5, Math.floor(configuredTtl)));
  }

  private getOtpTtlMs() {
    return this.getOtpTtlMinutes() * 60_000;
  }

  private getOtpMaxAttempts() {
    const configuredAttempts = Number(
      this.configService.get<string>('PASSWORD_RESET_OTP_MAX_ATTEMPTS', '5'),
    );

    if (!Number.isFinite(configuredAttempts)) {
      return 5;
    }

    return Math.min(10, Math.max(1, Math.floor(configuredAttempts)));
  }

  private createTooManyAttemptsException() {
    return new HttpException(
      'Too many invalid reset attempts. Request a new code.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
