import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { createTestApp, cleanDatabase } from '../helpers/test-app';
import { DEFAULT_PASSWORD, registerUser } from '../helpers/auth.helper';
import { MailService, TestMailMessage } from '../../src/features/mail/mail.service';
import {
  PasswordResetMethod,
  User,
} from '../../src/features/users/entities/user.entity';

describe('Auth – Forgot / Reset Password (e2e)', () => {
  describe('OTP mode', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let userRepo: Repository<User>;
    let mailService: MailService;
    const originalResetMode = process.env.PASSWORD_RESET_MODE;
    const originalExposeOtp = process.env.PASSWORD_RESET_EXPOSE_OTP;
    const originalOtpMaxAttempts = process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS;

    beforeAll(async () => {
      process.env.PASSWORD_RESET_MODE = 'otp';
      process.env.PASSWORD_RESET_EXPOSE_OTP = 'true';
      process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS = '3';

      const ctx = await createTestApp();
      app = ctx.app;
      dataSource = ctx.dataSource;
      userRepo = dataSource.getRepository(User);
      mailService = ctx.module.get(MailService);
    });

    afterAll(async () => {
      if (originalResetMode === undefined) {
        delete process.env.PASSWORD_RESET_MODE;
      } else {
        process.env.PASSWORD_RESET_MODE = originalResetMode;
      }

      if (originalExposeOtp === undefined) {
        delete process.env.PASSWORD_RESET_EXPOSE_OTP;
      } else {
        process.env.PASSWORD_RESET_EXPOSE_OTP = originalExposeOtp;
      }

      if (originalOtpMaxAttempts === undefined) {
        delete process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS;
      } else {
        process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS = originalOtpMaxAttempts;
      }

      await dataSource.destroy();
      await app.close();
    });

    beforeEach(async () => {
      await cleanDatabase(dataSource);
      mailService.clearTestMessages();
    });

    function getLatestOtpMail(): TestMailMessage {
      const message = mailService.getTestMessages().at(-1);

      expect(message).toBeDefined();
      expect(message?.metadata?.resetMode).toBe('otp');
      expect(message?.metadata?.resetCode).toBeDefined();

      return message as TestMailMessage;
    }

    describe('POST /api/auth/forgot-password', () => {
      it('returns a generic success response for non-existent email', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: 'nobody@test.com' })
          .expect(200);

        expect(res.body).toEqual({
          message:
            'If an account with that email exists, reset instructions have been sent.',
          mode: 'otp',
        });
        expect(mailService.getTestMessages()).toHaveLength(0);
      });

      it('sends an OTP email and exposes the code in non-production mode', async () => {
        const { email } = await registerUser(app);

        const res = await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email })
          .expect(200);

        expect(res.body.message).toBe(
          'If an account with that email exists, reset instructions have been sent.',
        );
        expect(res.body.mode).toBe('otp');
        expect(res.body.resetCode).toMatch(/^\d{4,6}$/);
        expect(res.body.expiresInMinutes).toBe(10);

        const user = await userRepo.findOneOrFail({ where: { email } });
        expect(user.passwordResetMethod).toBe(PasswordResetMethod.OTP);
        expect(user.passwordResetAttempts).toBe(0);
        expect(user.passwordResetToken).not.toBe(res.body.resetCode);
        expect(user.passwordResetExpires).toBeInstanceOf(Date);

        const sentMail = getLatestOtpMail();
        expect(sentMail.to).toBe(email);
        expect(sentMail.from).toBe(process.env.MAIL_FROM);
        expect(sentMail.subject).toMatch(/code/i);
        expect(sentMail.metadata?.resetCode).toBe(res.body.resetCode);
      });

      it('rejects invalid email format', async () => {
        await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: 'not-an-email' })
          .expect(400);
      });
    });

    describe('POST /api/auth/reset-password', () => {
      it('resets the password with a valid OTP and matching email', async () => {
        const { email } = await registerUser(app);

        const forgotResponse = await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email })
          .expect(200);

        const resetCode = forgotResponse.body.resetCode as string;
        const newPassword = 'NewSecure1!';

        const resetResponse = await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({ email, token: resetCode, newPassword })
          .expect(200);

        expect(resetResponse.body.message).toMatch(/reset successful/i);

        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email, password: DEFAULT_PASSWORD })
          .expect(401);

        const user = await userRepo.findOneOrFail({ where: { email } });
        expect(await bcrypt.compare(newPassword, user.password as string)).toBe(
          true,
        );
        expect(user.passwordResetToken).toBeNull();
        expect(user.passwordResetMethod).toBeNull();
        expect(user.passwordResetAttempts).toBe(0);
        expect(user.refreshToken).toBeNull();
      });

      it('rejects reset attempts without an email in OTP mode', async () => {
        await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({ token: '123456', newPassword: 'NewSecure1!' })
          .expect(400);
      });

      it('rejects an expired OTP', async () => {
        const { email } = await registerUser(app);

        const forgotResponse = await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email })
          .expect(200);

        await userRepo.update(
          { email },
          { passwordResetExpires: new Date(Date.now() - 60_000) },
        );

        await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({
            email,
            token: forgotResponse.body.resetCode,
            newPassword: 'Expired123!',
          })
          .expect(400);
      });

      it('rejects a reused OTP after a successful reset', async () => {
        const { email } = await registerUser(app);

        const forgotResponse = await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email })
          .expect(200);

        const resetCode = forgotResponse.body.resetCode as string;

        await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({ email, token: resetCode, newPassword: 'Reset1234!' })
          .expect(200);

        await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({ email, token: resetCode, newPassword: 'Reset5678!' })
          .expect(400);
      });

      it('rejects too many incorrect OTP attempts', async () => {
        const { email } = await registerUser(app);

        await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email })
          .expect(200);

        await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({ email, token: '000000', newPassword: 'Wrong111!' })
          .expect(400);

        await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({ email, token: '111111', newPassword: 'Wrong111!' })
          .expect(400);

        const lastAttemptResponse = await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({ email, token: '222222', newPassword: 'Wrong111!' })
          .expect(429);

        expect(lastAttemptResponse.body.message).toMatch(/too many/i);

        const user = await userRepo.findOneOrFail({ where: { email } });
        expect(user.passwordResetToken).toBeNull();
        expect(user.passwordResetMethod).toBeNull();
        expect(user.passwordResetAttempts).toBe(0);
      });

      it('rejects short new passwords', async () => {
        const { email } = await registerUser(app);

        const forgotResponse = await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email })
          .expect(200);

        await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({
            email,
            token: forgotResponse.body.resetCode,
            newPassword: 'short',
          })
          .expect(400);
      });
    });
  });

  describe('Link mode', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let userRepo: Repository<User>;
    let mailService: MailService;
    const originalResetMode = process.env.PASSWORD_RESET_MODE;
    const originalExposeOtp = process.env.PASSWORD_RESET_EXPOSE_OTP;

    beforeAll(async () => {
      process.env.PASSWORD_RESET_MODE = 'link';
      process.env.PASSWORD_RESET_EXPOSE_OTP = 'false';

      const ctx = await createTestApp();
      app = ctx.app;
      dataSource = ctx.dataSource;
      userRepo = dataSource.getRepository(User);
      mailService = ctx.module.get(MailService);
    });

    afterAll(async () => {
      if (originalResetMode === undefined) {
        delete process.env.PASSWORD_RESET_MODE;
      } else {
        process.env.PASSWORD_RESET_MODE = originalResetMode;
      }

      if (originalExposeOtp === undefined) {
        delete process.env.PASSWORD_RESET_EXPOSE_OTP;
      } else {
        process.env.PASSWORD_RESET_EXPOSE_OTP = originalExposeOtp;
      }

      await dataSource.destroy();
      await app.close();
    });

    beforeEach(async () => {
      await cleanDatabase(dataSource);
      mailService.clearTestMessages();
    });

    function getLatestResetLinkMail(): TestMailMessage {
      const message = mailService.getTestMessages().at(-1);

      expect(message).toBeDefined();
      expect(message?.metadata?.resetMode).toBe('link');
      expect(message?.metadata?.resetToken).toBeDefined();
      expect(message?.metadata?.resetUrl).toContain(
        '/auth/reset-password?token=',
      );

      return message as TestMailMessage;
    }

    it('sends a reset link email without exposing the token in the API response', async () => {
      const { email } = await registerUser(app);

      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      expect(response.body).toEqual({
        message:
          'If an account with that email exists, reset instructions have been sent.',
        mode: 'link',
      });

      const sentMail = getLatestResetLinkMail();
      expect(sentMail.to).toBe(email);
      expect(sentMail.metadata?.resetToken).toBeDefined();

      const user = await userRepo.findOneOrFail({ where: { email } });
      expect(user.passwordResetMethod).toBe(PasswordResetMethod.LINK);
      expect(user.passwordResetToken).not.toBe(sentMail.metadata?.resetToken);
    });

    it('resets the password with a valid reset link token', async () => {
      const { email } = await registerUser(app);

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      const resetToken = getLatestResetLinkMail().metadata?.resetToken as string;
      const newPassword = 'LinkReset1!';

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: resetToken, newPassword })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: DEFAULT_PASSWORD })
        .expect(401);

      const user = await userRepo.findOneOrFail({ where: { email } });
      expect(await bcrypt.compare(newPassword, user.password as string)).toBe(
        true,
      );
      expect(user.passwordResetToken).toBeNull();
      expect(user.passwordResetMethod).toBeNull();
    });

    it('rejects an expired reset link token', async () => {
      const { email } = await registerUser(app);

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      const resetToken = getLatestResetLinkMail().metadata?.resetToken as string;
      await userRepo.update(
        { email },
        { passwordResetExpires: new Date(Date.now() - 60_000) },
      );

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: resetToken, newPassword: 'Expired123!' })
        .expect(400);
    });

    it('rejects a reused reset link token', async () => {
      const { email } = await registerUser(app);

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      const resetToken = getLatestResetLinkMail().metadata?.resetToken as string;

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: resetToken, newPassword: 'Reset1234!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: resetToken, newPassword: 'Reset5678!' })
        .expect(400);
    });
  });
});
