import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

type MailTransportMode = 'smtp' | 'memory';

export interface TestMailMessage {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  messageId: string;
  sentAt: Date;
  transport: MailTransportMode;
  metadata?: {
    resetMode?: 'otp' | 'link';
    resetToken?: string;
    resetUrl?: string;
    resetCode?: string;
  };
}

@Injectable()
export class MailService implements OnModuleDestroy {
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;
  private readonly testMessages: TestMailMessage[] = [];

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetLinkEmail(params: { to: string; resetToken: string }) {
    const from = this.getMailFrom();
    const resetUrl = this.buildResetPasswordUrl(params.resetToken);
    const subject = 'Reset your PharmaFlow password';
    const text = [
      'We received a request to reset your PharmaFlow password.',
      '',
      `Reset your password using this link: ${resetUrl}`,
      '',
      'If you did not request this, you can ignore this email.',
      'This link expires soon and can only be used once.',
    ].join('\n');
    const html = [
      '<p>We received a request to reset your PharmaFlow password.</p>',
      `<p><a href="${resetUrl}">Reset your password</a></p>`,
      `<p>If the button does not work, use this link:</p><p>${resetUrl}</p>`,
      '<p>If you did not request this, you can ignore this email.</p>',
      '<p>This link expires soon and can only be used once.</p>',
    ].join('');

    if (this.getTransportMode() === 'memory') {
      const messageId = `memory-${Date.now()}`;
      this.testMessages.push({
        to: params.to,
        from,
        subject,
        text,
        html,
        messageId,
        sentAt: new Date(),
        transport: 'memory',
        metadata: {
          resetMode: 'link',
          resetToken: params.resetToken,
          resetUrl,
        },
      });

      return { messageId, resetUrl };
    }

    const transporter = this.getTransporter();
    const result = await transporter.sendMail({
      from,
      to: params.to,
      subject,
      text,
      html,
    });

    return {
      messageId: result.messageId,
      resetUrl,
    };
  }

  async sendPasswordResetOtpEmail(params: {
    to: string;
    resetCode: string;
    expiresInMinutes: number;
  }) {
    const from = this.getMailFrom();
    const subject = 'Your PharmaFlow password reset code';
    const text = [
      'We received a request to reset your PharmaFlow password.',
      '',
      `Your password reset code is: ${params.resetCode}`,
      `This code expires in ${params.expiresInMinutes} minutes.`,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n');
    const html = [
      '<p>We received a request to reset your PharmaFlow password.</p>',
      `<p>Your password reset code is: <strong>${params.resetCode}</strong></p>`,
      `<p>This code expires in ${params.expiresInMinutes} minutes.</p>`,
      '<p>If you did not request this, you can ignore this email.</p>',
    ].join('');

    if (this.getTransportMode() === 'memory') {
      const messageId = `memory-${Date.now()}`;
      this.testMessages.push({
        to: params.to,
        from,
        subject,
        text,
        html,
        messageId,
        sentAt: new Date(),
        transport: 'memory',
        metadata: {
          resetMode: 'otp',
          resetCode: params.resetCode,
        },
      });

      return { messageId };
    }

    const transporter = this.getTransporter();
    const result = await transporter.sendMail({
      from,
      to: params.to,
      subject,
      text,
      html,
    });

    return {
      messageId: result.messageId,
    };
  }

  getTestMessages(): readonly TestMailMessage[] {
    return [...this.testMessages];
  }

  clearTestMessages() {
    this.testMessages.length = 0;
  }

  onModuleDestroy() {
    this.transporter?.close();
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.getRequiredConfig('SMTP_HOST');
    const port = Number(this.getRequiredConfig('SMTP_PORT'));
    const user = this.getRequiredConfig('SMTP_USER');
    const pass = this.getRequiredConfig('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  private getMailFrom() {
    const mailFrom =
      this.configService.get<string>('MAIL_FROM') ??
      this.configService.get<string>('SMTP_USER');

    if (!mailFrom) {
      throw new Error('MAIL_FROM or SMTP_USER must be configured.');
    }

    return mailFrom;
  }

  private buildResetPasswordUrl(resetToken: string) {
    const configuredResetUrl =
      this.configService.get<string>('FRONTEND_RESET_PASSWORD_URL') ??
      this.buildLegacyResetPasswordUrl();

    if (!configuredResetUrl) {
      throw new Error(
        'FRONTEND_RESET_PASSWORD_URL or FRONTEND_URL must be configured.',
      );
    }

    const url = new URL(configuredResetUrl);
    url.searchParams.set('token', resetToken);
    return url.toString();
  }

  private buildLegacyResetPasswordUrl() {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    if (!frontendUrl) {
      return null;
    }

    return `${frontendUrl.replace(/\/+$/, '')}/auth/reset-password`;
  }

  private getTransportMode(): MailTransportMode {
    const configuredMode = this.configService
      .get<string>('MAIL_TRANSPORT')
      ?.toLowerCase();

    if (configuredMode === 'smtp' || configuredMode === 'memory') {
      return configuredMode;
    }

    return this.isTestEnvironment() ? 'memory' : 'smtp';
  }

  private isTestEnvironment() {
    return (
      this.configService.get<string>('NODE_ENV') === 'test' ||
      Boolean(process.env.JEST_WORKER_ID)
    );
  }

  private getRequiredConfig(key: string) {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`${key} is not configured.`);
    }

    return value;
  }
}
