import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import * as request from 'supertest';
import { authenticator } from 'otplib';
import { createTestApp, cleanDatabase } from '../helpers/test-app';
import { registerUser, DEFAULT_PASSWORD } from '../helpers/auth.helper';
import { User } from '../../src/features/users/entities/user.entity';

describe('Auth – TOTP Two-Factor Authentication (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepo: Repository<User>;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    dataSource = ctx.dataSource;
    userRepo = dataSource.getRepository(User);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  // ── Generate TOTP Secret ────────────────────────────────────────────

  describe('POST /api/auth/totp/generate', () => {
    it('should return a secret and QR code for authenticated user', async () => {
      const { accessToken } = await registerUser(app);

      const res = await request(app.getHttpServer())
        .post('/api/auth/totp/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('secret');
      expect(res.body).toHaveProperty('qrCode');
      expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/totp/generate')
        .expect(401);
    });
  });

  // ── Enable TOTP ─────────────────────────────────────────────────────

  describe('POST /api/auth/totp/enable', () => {
    it('should enable 2FA with a valid TOTP code', async () => {
      const { accessToken } = await registerUser(app);

      // Generate secret
      const genRes = await request(app.getHttpServer())
        .post('/api/auth/totp/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const secret = genRes.body.secret;
      const code = authenticator.generate(secret);

      // Enable with valid code
      const enableRes = await request(app.getHttpServer())
        .post('/api/auth/totp/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code })
        .expect(201);

      expect(enableRes.body.message).toMatch(/enabled/i);
    });

    it('should reject an invalid code', async () => {
      const { accessToken } = await registerUser(app);

      // Generate secret so totpSecret is stored
      await request(app.getHttpServer())
        .post('/api/auth/totp/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/auth/totp/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '000000' })
        .expect(400);
    });
  });

  // ── Login with 2FA ──────────────────────────────────────────────────

  describe('TOTP login flow', () => {
    it('should require 2FA verification when TOTP is enabled', async () => {
      const { email, password, accessToken } = await registerUser(app);

      // Set up and enable TOTP
      const genRes = await request(app.getHttpServer())
        .post('/api/auth/totp/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const secret = genRes.body.secret;
      const code = authenticator.generate(secret);

      await request(app.getHttpServer())
        .post('/api/auth/totp/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code })
        .expect(201);

      // Login should now return requiresTwoFactor + tempToken
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      expect(loginRes.body.requiresTwoFactor).toBe(true);
      expect(loginRes.body.tempToken).toBeDefined();
      expect(loginRes.body).not.toHaveProperty('accessToken');

      // Verify TOTP to complete login
      const totpCode = authenticator.generate(secret);
      const verifyRes = await request(app.getHttpServer())
        .post('/api/auth/totp/verify')
        .send({ tempToken: loginRes.body.tempToken, code: totpCode })
        .expect(200);

      expect(verifyRes.body).toHaveProperty('accessToken');
      expect(verifyRes.body).toHaveProperty('refreshToken');
      expect(verifyRes.body.user.email).toBe(email);
    });

    it('should reject invalid TOTP code during verify', async () => {
      const { email, password, accessToken } = await registerUser(app);

      const genRes = await request(app.getHttpServer())
        .post('/api/auth/totp/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const secret = genRes.body.secret;
      const code = authenticator.generate(secret);

      await request(app.getHttpServer())
        .post('/api/auth/totp/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code })
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/totp/verify')
        .send({ tempToken: loginRes.body.tempToken, code: '000000' })
        .expect(401);
    });

    it('should reject expired / invalid tempToken', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/totp/verify')
        .send({ tempToken: 'invalid.token.here', code: '123456' })
        .expect(401);
    });
  });

  // ── Disable TOTP ────────────────────────────────────────────────────

  describe('POST /api/auth/totp/disable', () => {
    it('should disable 2FA', async () => {
      const { email, password, accessToken } = await registerUser(app);

      // Setup + enable
      const genRes = await request(app.getHttpServer())
        .post('/api/auth/totp/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const code = authenticator.generate(genRes.body.secret);

      await request(app.getHttpServer())
        .post('/api/auth/totp/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code })
        .expect(201);

      // Disable
      const disableRes = await request(app.getHttpServer())
        .post('/api/auth/totp/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(disableRes.body.message).toMatch(/disabled/i);

      // Login should no longer require 2FA
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      expect(loginRes.body).toHaveProperty('accessToken');
      expect(loginRes.body.requiresTwoFactor).toBeUndefined();
    });
  });
});
