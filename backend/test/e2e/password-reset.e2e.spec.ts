import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { createTestApp, cleanDatabase } from '../helpers/test-app';
import { registerUser, uniqueEmail, DEFAULT_PASSWORD } from '../helpers/auth.helper';

describe('Auth – Forgot / Reset Password (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    dataSource = ctx.dataSource;
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  // ── Forgot Password ─────────────────────────────────────────────────

  describe('POST /api/auth/forgot-password', () => {
    it('should return success even for non-existent email (no leak)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@test.com' })
        .expect(200);

      expect(res.body.message).toBeDefined();
      // Non-existent email should NOT return a resetToken
      expect(res.body.resetToken).toBeUndefined();
    });

    it('should return a reset token for existing user (dev mode)', async () => {
      const { email } = await registerUser(app);

      const res = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      expect(res.body.message).toBeDefined();
      expect(res.body.resetToken).toBeDefined();
      expect(typeof res.body.resetToken).toBe('string');
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  // ── Reset Password ──────────────────────────────────────────────────

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with a valid token', async () => {
      const { email } = await registerUser(app);

      // Obtain reset token
      const forgotRes = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      const resetToken = forgotRes.body.resetToken;
      const newPassword = 'NewSecure1!';

      // Reset password
      const resetRes = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: resetToken, newPassword })
        .expect(200);

      expect(resetRes.body.message).toMatch(/reset successful/i);

      // Old password should no longer work
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: DEFAULT_PASSWORD })
        .expect(401);

      // New password should work
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: newPassword })
        .expect(200);

      expect(loginRes.body).toHaveProperty('accessToken');
    });

    it('should reject an invalid reset token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: 'bogustoken', newPassword: 'NewSecure1!' })
        .expect(400);
    });

    it('should reject a reused reset token (single use)', async () => {
      const { email } = await registerUser(app);

      const forgotRes = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      const resetToken = forgotRes.body.resetToken;

      // First use succeeds
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: resetToken, newPassword: 'Reset1234!' })
        .expect(200);

      // Second use fails — token was cleared
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: resetToken, newPassword: 'Reset5678!' })
        .expect(400);
    });

    it('should reject short new password', async () => {
      const { email } = await registerUser(app);

      const forgotRes = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: forgotRes.body.resetToken, newPassword: 'short' })
        .expect(400);
    });
  });
});
