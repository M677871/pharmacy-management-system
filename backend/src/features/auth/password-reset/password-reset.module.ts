import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../../mail/mail.module';
import { UsersModule } from '../../users/users.module';
import { PasswordResetLinkService } from './password-reset-link.service';
import { PasswordResetOtpService } from './password-reset-otp.service';
import { PasswordResetService } from './password-reset.service';

@Module({
  imports: [ConfigModule, UsersModule, MailModule],
  providers: [
    PasswordResetService,
    PasswordResetOtpService,
    PasswordResetLinkService,
  ],
  exports: [PasswordResetService],
})
export class PasswordResetModule {}
