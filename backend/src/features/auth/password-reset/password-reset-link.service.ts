import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../../mail/mail.service';
import { PasswordResetMethod } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';

@Injectable()
export class PasswordResetLinkService {
  private readonly logger = new Logger(PasswordResetLinkService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async createReset(userId: string, email: string) {
    const resetToken = crypto.randomBytes(32).toString('base64url');
    const hashedResetToken = this.hashResetToken(resetToken);

    await this.usersService.update(userId, {
      passwordResetToken: hashedResetToken,
      passwordResetExpires: new Date(Date.now() + this.getResetTokenTtlMs()),
      passwordResetMethod: PasswordResetMethod.LINK,
      passwordResetAttempts: 0,
    });

    try {
      await this.mailService.sendPasswordResetLinkEmail({
        to: email,
        resetToken,
      });
    } catch (error) {
      this.logger.error('Failed to send password reset link email.');
      throw new InternalServerErrorException(
        'Unable to process password reset request.',
      );
    }
  }

  async resetPassword(resetToken: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(
      this.hashResetToken(resetToken),
      PasswordResetMethod.LINK,
    );

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires.getTime() <= Date.now()
    ) {
      if (user) {
        await this.clearResetState(user.id);
      }

      throw new BadRequestException('Invalid or expired reset token');
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

  private hashResetToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async clearResetState(userId: string) {
    await this.usersService.update(userId, {
      passwordResetToken: null,
      passwordResetExpires: null,
      passwordResetMethod: null,
      passwordResetAttempts: 0,
    });
  }

  private getResetTokenTtlMs() {
    const ttlMinutes = Number(
      this.configService.get<string>('PASSWORD_RESET_TOKEN_TTL_MINUTES', '60'),
    );

    return Number.isFinite(ttlMinutes) && ttlMinutes > 0
      ? ttlMinutes * 60_000
      : 60 * 60_000;
  }
}
